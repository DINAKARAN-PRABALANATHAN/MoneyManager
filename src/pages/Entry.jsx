import { useState, useCallback, useTransition, useEffect } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { useAuth } from '../context/AuthContext'
import { auth, googleProvider } from '../firebase'
import { linkWithPopup, GoogleAuthProvider } from 'firebase/auth'

export default function Entry() {
  const { 
    expenseCategories, incomeCategories, transferCategories, 
    accounts, availableCategories, availableAccounts,
    addTransaction, addCategory, addExistingCategory, 
    addAccount, addExistingAccount 
  } = useTransactions()
  const { accessToken, isGoogleUser, refreshGoogleToken } = useAuth()
  const [isPending, startTransition] = useTransition()
  
  const [showDriveAlert, setShowDriveAlert] = useState(false)
  const [linkingGoogle, setLinkingGoogle] = useState(false)
  
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [account, setAccount] = useState('')
  const [toAccount, setToAccount] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [file, setFile] = useState(null)
  const [newCategory, setNewCategory] = useState('')
  const [newAccount, setNewAccount] = useState('')
  const [message, setMessage] = useState('')
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false)
  const [showAccountSuggestions, setShowAccountSuggestions] = useState(false)

  // Show Drive link alert for email/password users (only once)
  useEffect(() => {
    if (!isGoogleUser && !accessToken) {
      const dismissed = localStorage.getItem('driveLinkDismissed')
      if (!dismissed) {
        setShowDriveAlert(true)
      }
    } else {
      setShowDriveAlert(false)
    }
  }, [isGoogleUser, accessToken])

  const handleLinkGoogle = async () => {
    setLinkingGoogle(true)
    try {
      const result = await linkWithPopup(auth.currentUser, googleProvider)
      // Get the access token from the result
      const credential = GoogleAuthProvider.credentialFromResult(result)
      if (credential?.accessToken) {
        sessionStorage.setItem('driveToken', credential.accessToken)
      }
      setShowDriveAlert(false)
      localStorage.setItem('driveLinkDismissed', 'true')
      window.location.reload()
    } catch (error) {
      if (error.code === 'auth/credential-already-in-use') {
        setMessage('This Google account is already linked to another user.')
      } else {
        setMessage('Failed to link Google account. Try again.')
      }
    }
    setLinkingGoogle(false)
  }

  const dismissDriveAlert = () => {
    setShowDriveAlert(false)
    localStorage.setItem('driveLinkDismissed', 'true')
  }

  // Get categories based on selected type
  const currentCategories = type === 'expense' ? expenseCategories : 
                           type === 'income' ? incomeCategories : 
                           transferCategories

  // Filter available categories by type and search term
  const filteredAvailableCategories = availableCategories.filter(c => {
    const matchesType = c.type === type || (!c.type && type === 'expense')
    const matchesSearch = !newCategory || c.name.toLowerCase().includes(newCategory.toLowerCase())
    return matchesType && matchesSearch
  })

  // Filter available accounts by search term
  const filteredAvailableAccounts = availableAccounts.filter(a => 
    !newAccount || a.name.toLowerCase().includes(newAccount.toLowerCase())
  )

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!amount || !category || !account) return

    startTransition(async () => {
      try {
        await addTransaction({
          type, amount: parseFloat(amount), category, account,
          toAccount: type === 'transfer' ? toAccount : null, note, date
        }, file)
        setAmount('')
        setCategory('')
        setAccount('')
        setToAccount('')
        setNote('')
        setFile(null)
        setMessage('Transaction saved!')
        setTimeout(() => setMessage(''), 3000)
      } catch (error) {
        setMessage('Error saving transaction')
      }
    })
  }, [type, amount, category, account, toAccount, note, date, file, addTransaction])

  const handleAddCategory = useCallback(async () => {
    if (newCategory.trim()) {
      try {
        await addCategory(newCategory.trim(), type)
        setNewCategory('')
        setShowCategorySuggestions(false)
        setMessage('Category added!')
        setTimeout(() => setMessage(''), 2000)
      } catch (error) {
        setMessage(error.message)
        setTimeout(() => setMessage(''), 3000)
      }
    }
  }, [newCategory, addCategory, type])

  const handleAddExistingCategory = useCallback(async (cat) => {
    try {
      await addExistingCategory(cat.id)
      setNewCategory('')
      setShowCategorySuggestions(false)
      setMessage(`"${cat.name}" added to your list!`)
      setTimeout(() => setMessage(''), 2000)
    } catch (error) {
      setMessage(error.message)
      setTimeout(() => setMessage(''), 3000)
    }
  }, [addExistingCategory])

  const handleAddAccount = useCallback(async () => {
    if (newAccount.trim()) {
      try {
        await addAccount(newAccount.trim())
        setNewAccount('')
        setShowAccountSuggestions(false)
        setMessage('Account added!')
        setTimeout(() => setMessage(''), 2000)
      } catch (error) {
        setMessage(error.message)
        setTimeout(() => setMessage(''), 3000)
      }
    }
  }, [newAccount, addAccount])

  const handleAddExistingAccount = useCallback(async (acc) => {
    try {
      await addExistingAccount(acc.id)
      setNewAccount('')
      setShowAccountSuggestions(false)
      setMessage(`"${acc.name}" added to your list!`)
      setTimeout(() => setMessage(''), 2000)
    } catch (error) {
      setMessage(error.message)
      setTimeout(() => setMessage(''), 3000)
    }
  }, [addExistingAccount])

  // Reset form fields when type changes
  const handleTypeChange = (newType) => {
    setType(newType)
    setCategory('')
    setFile(null)
  }

  return (
    <div className="container">
      {/* Google Drive Link Alert Modal */}
      {showDriveAlert && (
        <div className="modal-overlay">
          <div className="modal" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📎</div>
            <h2 style={{ marginBottom: 12 }}>Enable Bill Attachments</h2>
            <p style={{ color: '#6b7280', marginBottom: 20 }}>
              Link your Google account to upload and store bill receipts in Google Drive (15GB free storage).
            </p>
            
            <div style={{ background: '#dcfce7', border: '1px solid #22c55e', borderRadius: 8, padding: 16, marginBottom: 16, textAlign: 'left' }}>
              <p style={{ color: '#166534', fontSize: 18, fontWeight: 700, margin: '0 0 8px 0' }}>
                🔒 100% PRIVATE Storage
              </p>
              <p style={{ color: '#166534', fontSize: 15, margin: 0 }}>
                All attachments are stored in <strong>YOUR</strong> Google Drive in a folder called <strong>"MoneyManager_Bills"</strong>.
              </p>
              <p style={{ color: '#166534', fontSize: 15, margin: '8px 0 0 0', fontWeight: 600 }}>
                Only YOU can access these files. No other users (not even family members) can view them.
              </p>
            </div>

            <div style={{ background: '#eff6ff', border: '1px solid #3b82f6', borderRadius: 8, padding: 16, marginBottom: 24, textAlign: 'left' }}>
              <p style={{ color: '#1e40af', fontSize: 16, fontWeight: 600, margin: '0 0 8px 0' }}>
                👨‍👩‍👧‍👦 Family sharing note
              </p>
              <p style={{ color: '#1e40af', fontSize: 15, margin: 0 }}>
                If you join a family group, family members can see your <strong>transaction details</strong> (amount, category, date, notes).
              </p>
              <p style={{ color: '#1e40af', fontSize: 15, margin: '8px 0 0 0' }}>
                However, <strong>attachments remain private</strong> - only you can view your uploaded bills/receipts.
              </p>
            </div>
            
            <button 
              className="btn btn-google" 
              onClick={handleLinkGoogle} 
              disabled={linkingGoogle}
              style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {linkingGoogle ? 'Linking...' : 'Link Google Account'}
            </button>
            
            <button 
              className="btn" 
              onClick={dismissDriveAlert}
              style={{ width: '100%' }}
            >
              Maybe Later
            </button>
            
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 16 }}>
              You can always link later from Settings
            </p>
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginBottom: 20 }}>Add Transaction</h2>
        
        {message && (
          <div style={{ padding: 12, marginBottom: 16, borderRadius: 8, background: message.includes('Error') || message.includes('exists') || message.includes('already') ? '#fef2f2' : '#ecfdf5', color: message.includes('Error') || message.includes('exists') || message.includes('already') ? '#ef4444' : '#10b981' }}>
            {message}
          </div>
        )}
        
        <div className="type-tabs">
          <button className={`type-tab expense ${type === 'expense' ? 'active' : ''}`} onClick={() => handleTypeChange('expense')}>Expense</button>
          <button className={`type-tab income ${type === 'income' ? 'active' : ''}`} onClick={() => handleTypeChange('income')}>Income</button>
          <button className={`type-tab transfer ${type === 'transfer' ? 'active' : ''}`} onClick={() => handleTypeChange('transfer')}>Transfer</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Amount</label>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" required />
          </div>

          <div className="form-group">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} required>
              <option value="">Select category</option>
              {currentCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <div className="add-option" style={{ position: 'relative' }}>
              <input 
                type="text" 
                value={newCategory} 
                onChange={(e) => setNewCategory(e.target.value)} 
                onFocus={() => setShowCategorySuggestions(true)}
                placeholder={`Add new ${type} category`} 
              />
              <button type="button" className="btn btn-primary" onClick={handleAddCategory}>Add</button>
            </div>
            
            {/* Category Suggestions */}
            {showCategorySuggestions && filteredAvailableCategories.length > 0 && (
              <div style={{ 
                background: '#f0fdf4', 
                border: '1px solid #22c55e', 
                borderRadius: 8, 
                padding: 12, 
                marginTop: 8 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>
                    💡 Available categories (click to add):
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setShowCategorySuggestions(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {filteredAvailableCategories.slice(0, 10).map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleAddExistingCategory(cat)}
                      style={{
                        padding: '6px 12px',
                        background: '#dcfce7',
                        border: '1px solid #86efac',
                        borderRadius: 16,
                        cursor: 'pointer',
                        fontSize: 13,
                        color: '#166534'
                      }}
                    >
                      + {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>{type === 'transfer' ? 'From Account' : 'Account'}</label>
            <select value={account} onChange={(e) => setAccount(e.target.value)} required>
              <option value="">Select account</option>
              {accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
            <div className="add-option" style={{ position: 'relative' }}>
              <input 
                type="text" 
                value={newAccount} 
                onChange={(e) => setNewAccount(e.target.value)} 
                onFocus={() => setShowAccountSuggestions(true)}
                placeholder="Add new account" 
              />
              <button type="button" className="btn btn-primary" onClick={handleAddAccount}>Add</button>
            </div>
            
            {/* Account Suggestions */}
            {showAccountSuggestions && filteredAvailableAccounts.length > 0 && (
              <div style={{ 
                background: '#eff6ff', 
                border: '1px solid #3b82f6', 
                borderRadius: 8, 
                padding: 12, 
                marginTop: 8 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#1e40af', fontWeight: 600 }}>
                    💡 Available accounts (click to add):
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setShowAccountSuggestions(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {filteredAvailableAccounts.slice(0, 10).map(acc => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleAddExistingAccount(acc)}
                      style={{
                        padding: '6px 12px',
                        background: '#dbeafe',
                        border: '1px solid #93c5fd',
                        borderRadius: 16,
                        cursor: 'pointer',
                        fontSize: 13,
                        color: '#1e40af'
                      }}
                    >
                      + {acc.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {type === 'transfer' && (
            <div className="form-group">
              <label>To Account</label>
              <select value={toAccount} onChange={(e) => setToAccount(e.target.value)} required>
                <option value="">Select account</option>
                {accounts.filter(a => a.name !== account).map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Note</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (optional)" rows={3} />
          </div>

          <div className="form-group">
            <label>Attachment (Bill/Receipt)</label>
            {isGoogleUser ? (
              accessToken ? (
                <>
                  <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} accept="image/*,.pdf" />
                  {file && <span style={{ fontSize: 12, color: '#6b7280' }}>Selected: {file.name}</span>}
                </>
              ) : (
                <div style={{ padding: 16, background: '#fffbeb', borderRadius: 8, border: '1px solid #fcd34d' }}>
                  <p style={{ color: '#92400e', fontSize: 14, margin: '0 0 12px 0' }}>
                    🔑 Connect to Google Drive to upload attachments
                  </p>
                  <button 
                    type="button" 
                    className="btn btn-google" 
                    onClick={async () => {
                      try {
                        await refreshGoogleToken()
                        setMessage('Google Drive connected!')
                        setTimeout(() => setMessage(''), 2000)
                      } catch (e) {
                        setMessage('Failed to connect. Try again.')
                      }
                    }}
                    style={{ justifyContent: 'center' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Connect Google Drive
                  </button>
                </div>
              )
            ) : (
              <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, border: '1px dashed #d1d5db' }}>
                <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
                  📎 Attachments require Google login for Drive storage.
                </p>
                <p style={{ color: '#9ca3af', fontSize: 12, margin: '8px 0 0 0' }}>
                  Go to Settings to link your Google account.
                </p>
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary" disabled={isPending} style={{ width: '100%' }}>
            {isPending ? 'Saving...' : 'Save Transaction'}
          </button>
        </form>
      </div>
    </div>
  )
}
