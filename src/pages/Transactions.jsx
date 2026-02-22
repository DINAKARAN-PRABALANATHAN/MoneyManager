import { useState, useMemo, useCallback } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { useAuth } from '../context/AuthContext'
import { format, parseISO, isWithinInterval } from 'date-fns'
import * as XLSX from 'xlsx'

export default function Transactions() {
  const { transactions, expenseCategories, incomeCategories, transferCategories, accounts, deleteTransaction, updateTransaction, loading } = useTransactions()
  const { user, accessToken } = useAuth()
  const [tab, setTab] = useState('daily')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'))
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editFile, setEditFile] = useState(null)

  const filteredTransactions = useMemo(() => {
    const now = new Date()
    return transactions.filter(t => {
      const date = parseISO(t.date)
      switch (tab) {
        case 'daily': return format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')
        case 'monthly': return format(date, 'yyyy-MM') === selectedMonth
        case 'yearly': return format(date, 'yyyy') === selectedYear
        case 'summary':
          if (!customStart || !customEnd) return true
          return isWithinInterval(date, { start: parseISO(customStart), end: parseISO(customEnd) })
        default: return true
      }
    })
  }, [transactions, tab, selectedMonth, selectedYear, customStart, customEnd])

  const summary = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
    const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
    return { income, expense, balance: income - expense }
  }, [filteredTransactions])

  const groupedTransactions = useMemo(() => {
    const groups = {}
    filteredTransactions.forEach(t => {
      const key = t.date
      if (!groups[key]) groups[key] = []
      groups[key].push(t)
    })
    return groups
  }, [filteredTransactions])

  const exportData = useCallback((type) => {
    const data = filteredTransactions.map(t => ({
      Date: t.date, Type: t.type, Category: t.category, Account: t.account, Amount: t.amount, Note: t.note || ''
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    if (type === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws)
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions')
      XLSX.writeFile(wb, `transactions_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
    }
  }, [filteredTransactions])

  const handleDelete = useCallback((id) => {
    if (confirm('Delete this transaction?')) {
      deleteTransaction(id)
    }
  }, [deleteTransaction])

  const handleEdit = (t) => {
    setEditingTransaction(t.id)
    setEditForm({
      type: t.type,
      amount: t.amount,
      category: t.category,
      account: t.account,
      toAccount: t.toAccount || '',
      note: t.note || '',
      date: t.date
    })
    setEditFile(null)
  }

  const getEditCategories = () => {
    if (editForm.type === 'expense') return expenseCategories
    if (editForm.type === 'income') return incomeCategories
    return transferCategories
  }

  const handleSaveEdit = async () => {
    await updateTransaction(editingTransaction, editForm, editFile)
    setEditingTransaction(null)
    setEditForm({})
    setEditFile(null)
  }

  const handleCancelEdit = () => {
    setEditingTransaction(null)
    setEditForm({})
    setEditFile(null)
  }

  if (loading) return <div className="container"><div className="card">Loading transactions...</div></div>

  return (
    <div className="container">
      <div className="tabs">
        {['daily', 'monthly', 'yearly', 'summary'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'monthly' && (
        <div className="date-filters">
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
        </div>
      )}

      {tab === 'yearly' && (
        <div className="date-filters">
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      )}

      {tab === 'summary' && (
        <>
          <div className="date-filters">
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            <span style={{ alignSelf: 'center' }}>to</span>
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
          </div>
          <div className="export-btns">
            <button className="btn btn-primary" onClick={() => exportData('excel')}>📊 Export Excel</button>
            <button className="btn btn-success" onClick={() => exportData('csv')}>📄 Export CSV</button>
          </div>
        </>
      )}

      <div className="summary-cards">
        <div className="summary-card income"><h3>Income</h3><div className="amount">₹{summary.income.toLocaleString('en-IN')}</div></div>
        <div className="summary-card expense"><h3>Expense</h3><div className="amount">₹{summary.expense.toLocaleString('en-IN')}</div></div>
        <div className="summary-card balance"><h3>Balance</h3><div className="amount">₹{summary.balance.toLocaleString('en-IN')}</div></div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Transactions ({filteredTransactions.length})</h3>
        
        {Object.keys(groupedTransactions).length === 0 ? (
          <p style={{ color: '#9ca3af', textAlign: 'center', padding: 40 }}>No transactions found</p>
        ) : (
          Object.entries(groupedTransactions).map(([date, items]) => (
            <div key={date}>
              <div className="group-header">{format(parseISO(date), 'EEEE, MMM d, yyyy')}</div>
              <div className="transaction-list">
                {items.map(t => (
                  <div key={t.id} className="transaction-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    {editingTransaction === t.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="type-tabs">
                          <button className={`type-tab expense ${editForm.type === 'expense' ? 'active' : ''}`} onClick={() => setEditForm({...editForm, type: 'expense'})}>Expense</button>
                          <button className={`type-tab income ${editForm.type === 'income' ? 'active' : ''}`} onClick={() => setEditForm({...editForm, type: 'income'})}>Income</button>
                          <button className={`type-tab transfer ${editForm.type === 'transfer' ? 'active' : ''}`} onClick={() => setEditForm({...editForm, type: 'transfer'})}>Transfer</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <input type="number" value={editForm.amount} onChange={(e) => setEditForm({...editForm, amount: parseFloat(e.target.value)})} placeholder="Amount" style={{ marginBottom: 0 }} />
                          <input type="date" value={editForm.date} onChange={(e) => setEditForm({...editForm, date: e.target.value})} style={{ marginBottom: 0 }} />
                          <select value={editForm.category} onChange={(e) => setEditForm({...editForm, category: e.target.value})} style={{ marginBottom: 0 }}>
                            <option value="">Select category</option>
                            {getEditCategories().map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          </select>
                          <select value={editForm.account} onChange={(e) => setEditForm({...editForm, account: e.target.value})} style={{ marginBottom: 0 }}>
                            {accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                          </select>
                        </div>
                        {editForm.type === 'transfer' && (
                          <select value={editForm.toAccount} onChange={(e) => setEditForm({...editForm, toAccount: e.target.value})} style={{ marginBottom: 0 }}>
                            <option value="">To Account</option>
                            {accounts.filter(a => a.name !== editForm.account).map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                          </select>
                        )}
                        <input type="text" value={editForm.note} onChange={(e) => setEditForm({...editForm, note: e.target.value})} placeholder="Note" style={{ marginBottom: 0 }} />
                        <input type="file" onChange={(e) => setEditFile(e.target.files?.[0] || null)} accept="image/*,.pdf" style={{ marginBottom: 0 }} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-success" onClick={handleSaveEdit}>Save</button>
                          <button className="btn" onClick={handleCancelEdit}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="transaction-info">
                          <span className="transaction-category">{t.category}</span>
                          <span className="transaction-meta">
                            {t.account} {t.toAccount && `→ ${t.toAccount}`} • {t.note || 'No note'}
                            {t.userName && t.userId !== user?.uid && <span style={{ color: '#4f46e5' }}> • by {t.userName}</span>}
                          </span>
                          {t.attachmentUrl && (
                            t.attachmentOwnerId === user?.uid || t.userId === user?.uid ? (
                              <a href={t.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#4f46e5' }}>
                                📎 {t.attachmentName || 'View attachment'}
                              </a>
                            ) : (
                              <span style={{ fontSize: 12, color: '#9ca3af' }}>
                                🔒 Attachment (private to {t.userName || 'owner'})
                              </span>
                            )
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={`transaction-amount ${t.type}`}>
                            {t.type === 'expense' ? '-' : t.type === 'income' ? '+' : ''}₹{t.amount.toLocaleString('en-IN')}
                          </span>
                          <button className="btn" style={{ padding: '4px 8px' }} onClick={() => handleEdit(t)}>✏️</button>
                          <button className="delete-btn" onClick={() => handleDelete(t.id)}>🗑️</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
