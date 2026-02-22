import { useState, useCallback } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { useAuth } from '../context/AuthContext'
import { db, auth, googleProvider } from '../firebase'
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, arrayRemove } from 'firebase/firestore'
import { deleteUser, linkWithPopup, GoogleAuthProvider } from 'firebase/auth'

export default function Settings() {
  const { user, logout, isGoogleUser } = useAuth()
  const { 
    expenseCategories, incomeCategories, transferCategories, 
    accounts, availableCategories, availableAccounts,
    addCategory, addExistingCategory, removeCategory,
    addAccount, addExistingAccount, removeAccount 
  } = useTransactions()
  
  const [newExpenseCategory, setNewExpenseCategory] = useState('')
  const [newIncomeCategory, setNewIncomeCategory] = useState('')
  const [newTransferCategory, setNewTransferCategory] = useState('')
  const [newAccount, setNewAccount] = useState('')
  const [categoryTab, setCategoryTab] = useState('expense')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [linkingGoogle, setLinkingGoogle] = useState(false)
  const [message, setMessage] = useState('')
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false)
  const [showAccountSuggestions, setShowAccountSuggestions] = useState(false)

  const handleLinkGoogle = async () => {
    setLinkingGoogle(true)
    setMessage('')
    try {
      const result = await linkWithPopup(auth.currentUser, googleProvider)
      // Get the access token from the result
      const credential = GoogleAuthProvider.credentialFromResult(result)
      if (credential?.accessToken) {
        // Save token to sessionStorage so it persists
        sessionStorage.setItem('driveToken', credential.accessToken)
      }
      setMessage({ text: 'Google account linked! You can now upload attachments.', isError: false })
      // Reload to update the auth context with new token
      window.location.reload()
    } catch (error) {
      if (error.code === 'auth/credential-already-in-use') {
        setMessage({ text: 'This Google account is already linked to another user.', isError: true })
      } else {
        setMessage({ text: 'Failed to link Google account. Try again.', isError: true })
      }
    }
    setLinkingGoogle(false)
  }

  const handleAddCategory = useCallback(async (name, type) => {
    if (name.trim()) {
      try {
        await addCategory(name.trim(), type)
        if (type === 'expense') setNewExpenseCategory('')
        else if (type === 'income') setNewIncomeCategory('')
        else setNewTransferCategory('')
        setShowCategorySuggestions(false)
        setMessage({ text: 'Category added!', isError: false })
        setTimeout(() => setMessage(''), 2000)
      } catch (error) {
        setMessage({ text: error.message, isError: true })
        setTimeout(() => setMessage(''), 3000)
      }
    }
  }, [addCategory])

  const handleAddExistingCategory = useCallback(async (cat) => {
    try {
      await addExistingCategory(cat.id)
      setShowCategorySuggestions(false)
      setMessage({ text: `"${cat.name}" added to your list!`, isError: false })
      setTimeout(() => setMessage(''), 2000)
    } catch (error) {
      setMessage({ text: error.message, isError: true })
      setTimeout(() => setMessage(''), 3000)
    }
  }, [addExistingCategory])

  const handleRemoveCategory = async (id, name) => {
    if (confirm(`Remove "${name}" from your list?`)) {
      await removeCategory(id)
      setMessage({ text: 'Category removed from your list', isError: false })
      setTimeout(() => setMessage(''), 2000)
    }
  }

  const handleAddAccount = useCallback(async () => {
    if (newAccount.trim()) {
      try {
        await addAccount(newAccount.trim())
        setNewAccount('')
        setShowAccountSuggestions(false)
        setMessage({ text: 'Account added!', isError: false })
        setTimeout(() => setMessage(''), 2000)
      } catch (error) {
        setMessage({ text: error.message, isError: true })
        setTimeout(() => setMessage(''), 3000)
      }
    }
  }, [newAccount, addAccount])

  const handleAddExistingAccount = useCallback(async (acc) => {
    try {
      await addExistingAccount(acc.id)
      setShowAccountSuggestions(false)
      setMessage({ text: `"${acc.name}" added to your list!`, isError: false })
      setTimeout(() => setMessage(''), 2000)
    } catch (error) {
      setMessage({ text: error.message, isError: true })
      setTimeout(() => setMessage(''), 3000)
    }
  }, [addExistingAccount])

  const handleRemoveAccount = async (id, name) => {
    if (confirm(`Remove "${name}" from your list?`)) {
      await removeAccount(id)
      setMessage({ text: 'Account removed from your list', isError: false })
      setTimeout(() => setMessage(''), 2000)
    }
  }

  const handleDeleteUserAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return
    
    setDeleting(true)
    try {
      // Delete all user's transactions
      const transactionsQuery = query(collection(db, 'transactions'), where('userId', '==', user.uid))
      const transactionsSnapshot = await getDocs(transactionsQuery)
      await Promise.all(transactionsSnapshot.docs.map(d => deleteDoc(doc(db, 'transactions', d.id))))
      
      // Remove user from all categories (not delete, just remove from userIds)
      const categoriesQuery = query(collection(db, 'categories'), where('userIds', 'array-contains', user.uid))
      const categoriesSnapshot = await getDocs(categoriesQuery)
      await Promise.all(categoriesSnapshot.docs.map(d => 
        updateDoc(doc(db, 'categories', d.id), { userIds: arrayRemove(user.uid) })
      ))
      
      // Remove user from all accounts
      const accountsQuery = query(collection(db, 'accounts'), where('userIds', 'array-contains', user.uid))
      const accountsSnapshot = await getDocs(accountsQuery)
      await Promise.all(accountsSnapshot.docs.map(d => 
        updateDoc(doc(db, 'accounts', d.id), { userIds: arrayRemove(user.uid) })
      ))
      
      // Delete the Firebase Auth user
      await deleteUser(user)
    } catch (error) {
      console.error('Error deleting account:', error)
      if (error.code === 'auth/requires-recent-login') {
        alert('For security, please logout and login again before deleting your account.')
      } else {
        alert('Error deleting account. Please try again.')
      }
      setDeleting(false)
    }
  }

  const currentCategories = categoryTab === 'expense' ? expenseCategories : 
                           categoryTab === 'income' ? incomeCategories : 
                           transferCategories

  const currentNewCategory = categoryTab === 'expense' ? newExpenseCategory :
                            categoryTab === 'income' ? newIncomeCategory :
                            newTransferCategory

  const setCurrentNewCategory = categoryTab === 'expense' ? setNewExpenseCategory :
                               categoryTab === 'income' ? setNewIncomeCategory :
                               setNewTransferCategory

  // Filter available categories by current tab type
  const filteredAvailableCategories = availableCategories.filter(c => {
    const catType = c.type || 'expense'
    return catType === categoryTab
  })

  return (
    <div className="container">
      {message && (
        <div style={{ padding: 12, marginBottom: 16, borderRadius: 8, background: message.isError ? '#fef2f2' : '#ecfdf5', color: message.isError ? '#ef4444' : '#10b981' }}>
          {message.text}
        </div>
      )}

      <div className="card">
        <h2 style={{ marginBottom: 20 }}>Account Settings</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: 16, background: '#f9fafb', borderRadius: 8 }}>
          {user?.photoURL && <img src={user.photoURL} alt="Profile" style={{ width: 60, height: 60, borderRadius: '50%' }} />}
          <div>
            <h3 style={{ margin: 0 }}>{user?.displayName}</h3>
            <p style={{ margin: 0, color: '#6b7280' }}>{user?.email}</p>
            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#9ca3af' }}>
              {isGoogleUser ? '✓ Google account linked' : 'Email/Password account'}
            </p>
          </div>
        </div>

        {!isGoogleUser && (
          <div style={{ padding: 16, background: '#fffbeb', borderRadius: 8, border: '1px solid #fcd34d', marginBottom: 16 }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#92400e' }}>📎 Enable Attachments</h4>
            <p style={{ margin: '0 0 12px 0', color: '#a16207', fontSize: 14 }}>
              Link your Google account to upload bill attachments to Google Drive.
            </p>
            <div style={{ background: '#dcfce7', padding: 12, borderRadius: 6, marginBottom: 12 }}>
              <p style={{ margin: 0, color: '#166534', fontSize: 13, fontWeight: 600 }}>
                🔒 100% Private: Only YOU can access your uploaded files. Not even family members can view them.
              </p>
            </div>
            <button className="btn btn-google" onClick={handleLinkGoogle} disabled={linkingGoogle} style={{ justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {linkingGoogle ? 'Linking...' : 'Link Google Account'}
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Categories</h3>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          Manage your category list. Remove categories you don't need.
        </p>
        
        <div className="tabs" style={{ marginBottom: 16 }}>
          <button className={`tab ${categoryTab === 'expense' ? 'active' : ''}`} onClick={() => setCategoryTab('expense')}>Expense</button>
          <button className={`tab ${categoryTab === 'income' ? 'active' : ''}`} onClick={() => setCategoryTab('income')}>Income</button>
          <button className={`tab ${categoryTab === 'transfer' ? 'active' : ''}`} onClick={() => setCategoryTab('transfer')}>Transfer</button>
        </div>
        
        <div className="add-option" style={{ marginBottom: 8 }}>
          <input
            type="text"
            value={currentNewCategory}
            onChange={(e) => setCurrentNewCategory(e.target.value)}
            onFocus={() => setShowCategorySuggestions(true)}
            placeholder={`Add new ${categoryTab} category`}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory(currentNewCategory, categoryTab)}
          />
          <button className="btn btn-primary" onClick={() => handleAddCategory(currentNewCategory, categoryTab)}>Add</button>
        </div>

        {/* Available categories suggestions */}
        {showCategorySuggestions && filteredAvailableCategories.length > 0 && (
          <div style={{ 
            background: '#f0fdf4', 
            border: '1px solid #22c55e', 
            borderRadius: 8, 
            padding: 12, 
            marginBottom: 16 
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
              {filteredAvailableCategories.map(cat => (
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {currentCategories.length === 0 ? (
            <p style={{ color: '#9ca3af', textAlign: 'center', padding: 20 }}>
              No {categoryTab} categories yet. Add one above!
            </p>
          ) : (
            currentCategories.map(cat => (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: '#f9fafb', borderRadius: 8 }}>
                <span>{cat.name}</span>
                <button 
                  className="btn btn-danger" 
                  style={{ padding: '6px 12px' }} 
                  onClick={() => handleRemoveCategory(cat.id, cat.name)}
                  title="Remove from your list"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Accounts / Payment Methods</h3>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          Manage your payment accounts (GPay, cards, bank accounts, etc.)
        </p>
        
        <div className="add-option" style={{ marginBottom: 8 }}>
          <input
            type="text"
            value={newAccount}
            onChange={(e) => setNewAccount(e.target.value)}
            onFocus={() => setShowAccountSuggestions(true)}
            placeholder="Add new account"
            onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
          />
          <button className="btn btn-primary" onClick={handleAddAccount}>Add</button>
        </div>

        {/* Available accounts suggestions */}
        {showAccountSuggestions && availableAccounts.length > 0 && (
          <div style={{ 
            background: '#eff6ff', 
            border: '1px solid #3b82f6', 
            borderRadius: 8, 
            padding: 12, 
            marginBottom: 16 
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
              {availableAccounts.map(acc => (
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {accounts.length === 0 ? (
            <p style={{ color: '#9ca3af', textAlign: 'center', padding: 20 }}>
              No accounts yet. Add one above!
            </p>
          ) : (
            accounts.map(acc => (
              <div key={acc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: '#f9fafb', borderRadius: 8 }}>
                <span>{acc.name}</span>
                <button 
                  className="btn btn-danger" 
                  style={{ padding: '6px 12px' }} 
                  onClick={() => handleRemoveAccount(acc.id, acc.name)}
                  title="Remove from your list"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card" style={{ borderColor: '#ef4444', border: '1px solid #fecaca' }}>
        <h3 style={{ marginBottom: 16, color: '#dc2626' }}>⚠️ Danger Zone</h3>
        
        {!showDeleteConfirm ? (
          <div>
            <p style={{ color: '#6b7280', marginBottom: 16 }}>
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <button 
              className="btn btn-danger" 
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete My Account
            </button>
          </div>
        ) : (
          <div style={{ background: '#fef2f2', padding: 16, borderRadius: 8 }}>
            <p style={{ color: '#dc2626', fontWeight: 600, marginBottom: 12 }}>
              Are you absolutely sure?
            </p>
            <p style={{ color: '#6b7280', marginBottom: 16, fontSize: 14 }}>
              This will permanently delete:
            </p>
            <ul style={{ color: '#6b7280', marginBottom: 16, fontSize: 14, paddingLeft: 20 }}>
              <li>All your transactions</li>
              <li>Your category and account preferences</li>
              <li>Your user account</li>
            </ul>
            <p style={{ color: '#6b7280', marginBottom: 12, fontSize: 14 }}>
              Type <strong>DELETE</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              style={{ marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                className="btn btn-danger" 
                onClick={handleDeleteUserAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
              >
                {deleting ? 'Deleting...' : 'Permanently Delete Account'}
              </button>
              <button 
                className="btn" 
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}
                disabled={deleting}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
