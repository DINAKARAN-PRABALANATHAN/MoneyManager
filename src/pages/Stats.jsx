import { useState, useMemo } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { Pie } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns'

ChartJS.register(ArcElement, Tooltip, Legend)

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#a855f7']

export default function Stats() {
  const { transactions, loading } = useTransactions()
  const [tab, setTab] = useState('expense')
  const [period, setPeriod] = useState('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const filteredTransactions = useMemo(() => {
    const now = new Date()
    return transactions.filter(t => {
      if (t.type !== tab) return false
      const date = parseISO(t.date)
      switch (period) {
        case 'week': return isWithinInterval(date, { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) })
        case 'month': return isWithinInterval(date, { start: startOfMonth(now), end: endOfMonth(now) })
        case 'year': return isWithinInterval(date, { start: startOfYear(now), end: endOfYear(now) })
        case 'custom':
          if (!customStart || !customEnd) return true
          return isWithinInterval(date, { start: parseISO(customStart), end: parseISO(customEnd) })
        default: return true
      }
    })
  }, [transactions, tab, period, customStart, customEnd])

  const categoryData = useMemo(() => {
    const data = {}
    filteredTransactions.forEach(t => {
      data[t.category] = (data[t.category] || 0) + t.amount
    })
    return Object.entries(data).sort((a, b) => b[1] - a[1])
  }, [filteredTransactions])

  const total = categoryData.reduce((sum, [, val]) => sum + val, 0)

  const chartData = {
    labels: categoryData.map(([cat]) => cat),
    datasets: [{
      data: categoryData.map(([, val]) => val),
      backgroundColor: COLORS.slice(0, categoryData.length),
      borderWidth: 2,
      borderColor: '#fff'
    }]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true } },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const value = ctx.raw
            const percentage = ((value / total) * 100).toFixed(1)
            return `₹${value.toLocaleString('en-IN')} (${percentage}%)`
          }
        }
      }
    }
  }

  if (loading) return <div className="container"><div className="card">Loading stats...</div></div>

  return (
    <div className="container">
      <div className="tabs">
        <button className={`tab ${tab === 'expense' ? 'active' : ''}`} onClick={() => setTab('expense')}>Expenses</button>
        <button className={`tab ${tab === 'income' ? 'active' : ''}`} onClick={() => setTab('income')}>Income</button>
      </div>

      <div className="card">
        <div className="date-filters" style={{ marginBottom: 24 }}>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
          {period === 'custom' && (
            <>
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              <span style={{ alignSelf: 'center' }}>to</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </>
          )}
        </div>

        {categoryData.length === 0 ? (
          <p style={{ color: '#9ca3af', textAlign: 'center', padding: 40 }}>No {tab} data for selected period</p>
        ) : (
          <>
            <div className="chart-container">
              <Pie data={chartData} options={chartOptions} />
            </div>

            <div style={{ marginTop: 32 }}>
              <h3 style={{ marginBottom: 16 }}>Category Breakdown</h3>
              <table className="stats-table">
                <thead>
                  <tr><th style={{ width: 40 }}></th><th>Category</th><th style={{ textAlign: 'right' }}>Amount</th><th style={{ textAlign: 'right' }}>%</th></tr>
                </thead>
                <tbody>
                  {categoryData.map(([category, amount], index) => (
                    <tr key={category}>
                      <td><span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', backgroundColor: COLORS[index] }}></span></td>
                      <td>{category}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{amount.toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right', color: '#6b7280' }}>{((amount / total) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 700, borderTop: '2px solid #e5e7eb' }}>
                    <td></td>
                    <td>Total</td>
                    <td style={{ textAlign: 'right' }}>₹{total.toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'right' }}>100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
