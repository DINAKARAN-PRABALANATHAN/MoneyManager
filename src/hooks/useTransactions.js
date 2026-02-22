import { useState, useEffect, useCallback, useMemo } from 'react'
import { db, uploadToDrive } from '../firebase'
import { 
  collection, addDoc, query, where, orderBy, onSnapshot, 
  deleteDoc, doc, getDocs, updateDoc, arrayUnion, arrayRemove
} from 'firebase/firestore'
import { useAuth } from '../context/AuthContext'
import { useFamily } from './useFamily'

export function useTransactions() {
  const { user, accessToken } = useAuth()
  const { familyMemberIds } = useFamily()
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [allCategories, setAllCategories] = useState([]) // All available categories
  const [accounts, setAccounts] = useState([])
  const [allAccounts, setAllAccounts] = useState([]) // All available accounts
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    // Query transactions for all family members
    let q
    if (familyMemberIds.length > 1) {
      q = query(
        collection(db, 'transactions'),
        where('userId', 'in', familyMemberIds),
        orderBy('date', 'desc')
      )
    } else {
      q = query(
        collection(db, 'transactions'),
        where('userId', '==', user.uid),
        orderBy('date', 'desc')
      )
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setTransactions(data)
      setLoading(false)
    }, (error) => {
      console.error('Transactions error:', error)
      setLoading(false)
    })

    return unsubscribe
  }, [user, familyMemberIds])

  // Load user's categories (where user is in userIds array)
  const loadCategories = useCallback(async () => {
    if (!user) return
    
    // Get categories where current user is in userIds array
    const q = query(collection(db, 'categories'), where('userIds', 'array-contains', user.uid))
    const snapshot = await getDocs(q)
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    
    // Remove duplicates by name+type
    const seen = new Set()
    const unique = data.filter(cat => {
      const key = `${cat.name.toLowerCase()}-${cat.type || 'expense'}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    setCategories(unique)
  }, [user])

  // Load ALL categories (for suggestions)
  const loadAllCategories = useCallback(async () => {
    if (!user) return
    
    const snapshot = await getDocs(collection(db, 'categories'))
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    
    // Remove duplicates by name+type
    const seen = new Set()
    const unique = data.filter(cat => {
      const key = `${cat.name.toLowerCase()}-${cat.type || 'expense'}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    setAllCategories(unique)
  }, [user])

  // Load user's accounts
  const loadAccounts = useCallback(async () => {
    if (!user) return
    
    const q = query(collection(db, 'accounts'), where('userIds', 'array-contains', user.uid))
    const snapshot = await getDocs(q)
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    
    // Remove duplicates by name
    const seen = new Set()
    const unique = data.filter(acc => {
      const key = acc.name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    setAccounts(unique)
  }, [user])

  // Load ALL accounts (for suggestions)
  const loadAllAccounts = useCallback(async () => {
    if (!user) return
    
    const snapshot = await getDocs(collection(db, 'accounts'))
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    
    // Remove duplicates by name
    const seen = new Set()
    const unique = data.filter(acc => {
      const key = acc.name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    setAllAccounts(unique)
  }, [user])

  useEffect(() => {
    loadCategories()
    loadAllCategories()
    loadAccounts()
    loadAllAccounts()
  }, [loadCategories, loadAllCategories, loadAccounts, loadAllAccounts])

  // Filter categories by type
  const expenseCategories = useMemo(() => 
    categories.filter(c => !c.type || c.type === 'expense'), [categories])
  
  const incomeCategories = useMemo(() => 
    categories.filter(c => c.type === 'income'), [categories])
  
  const transferCategories = useMemo(() => 
    categories.filter(c => c.type === 'transfer'), [categories])

  // Available categories not yet added by user
  const availableCategories = useMemo(() => 
    allCategories.filter(c => !c.userIds?.includes(user?.uid)), [allCategories, user])

  // Available accounts not yet added by user
  const availableAccounts = useMemo(() => 
    allAccounts.filter(a => !a.userIds?.includes(user?.uid)), [allAccounts, user])

  const addTransaction = useCallback(async (data, file) => {
    if (!user) throw new Error('Not authenticated')
    
    let attachmentUrl = null
    let attachmentName = null
    let attachmentOwnerId = null
    
    if (file && accessToken) {
      try {
        const result = await uploadToDrive(file, accessToken)
        attachmentUrl = result.viewLink
        attachmentName = file.name
        attachmentOwnerId = user.uid
      } catch (error) {
        console.error('Drive upload error:', error)
      }
    }
    
    await addDoc(collection(db, 'transactions'), {
      ...data, 
      attachmentUrl, 
      attachmentName, 
      attachmentOwnerId,
      userId: user.uid, 
      userName: user.displayName, 
      createdAt: new Date().toISOString()
    })
  }, [user, accessToken])

  const updateTransaction = useCallback(async (id, data, file) => {
    if (!user) throw new Error('Not authenticated')
    
    const updateData = { ...data }
    
    if (file && accessToken) {
      try {
        const result = await uploadToDrive(file, accessToken)
        updateData.attachmentUrl = result.viewLink
        updateData.attachmentName = file.name
      } catch (error) {
        console.error('Drive upload error:', error)
      }
    }
    
    await updateDoc(doc(db, 'transactions', id), updateData)
  }, [user, accessToken])

  const deleteTransaction = useCallback(async (id) => {
    await deleteDoc(doc(db, 'transactions', id))
  }, [])

  // Add category - either create new or add user to existing
  const addCategory = useCallback(async (name, type = 'expense') => {
    if (!user) throw new Error('Not authenticated')
    
    // Check if user already has this category
    const exists = categories.some(c => c.name.toLowerCase() === name.toLowerCase() && c.type === type)
    if (exists) throw new Error('Category already in your list')
    
    // Check if category exists globally
    const existing = allCategories.find(c => c.name.toLowerCase() === name.toLowerCase() && c.type === type)
    
    if (existing) {
      // Add user to existing category
      await updateDoc(doc(db, 'categories', existing.id), {
        userIds: arrayUnion(user.uid)
      })
    } else {
      // Create new category with user in userIds
      await addDoc(collection(db, 'categories'), { 
        name, 
        type, 
        userIds: [user.uid],
        createdBy: user.uid,
        createdAt: new Date().toISOString()
      })
    }
    
    await loadCategories()
    await loadAllCategories()
  }, [user, categories, allCategories, loadCategories, loadAllCategories])

  // Add existing category to user's list
  const addExistingCategory = useCallback(async (categoryId) => {
    if (!user) throw new Error('Not authenticated')
    
    await updateDoc(doc(db, 'categories', categoryId), {
      userIds: arrayUnion(user.uid)
    })
    
    await loadCategories()
    await loadAllCategories()
  }, [user, loadCategories, loadAllCategories])

  // Add account - either create new or add user to existing
  const addAccount = useCallback(async (name) => {
    if (!user) throw new Error('Not authenticated')
    
    const exists = accounts.some(a => a.name.toLowerCase() === name.toLowerCase())
    if (exists) throw new Error('Account already in your list')
    
    // Check if account exists globally
    const existing = allAccounts.find(a => a.name.toLowerCase() === name.toLowerCase())
    
    if (existing) {
      await updateDoc(doc(db, 'accounts', existing.id), {
        userIds: arrayUnion(user.uid)
      })
    } else {
      await addDoc(collection(db, 'accounts'), { 
        name, 
        userIds: [user.uid],
        createdBy: user.uid,
        createdAt: new Date().toISOString()
      })
    }
    
    await loadAccounts()
    await loadAllAccounts()
  }, [user, accounts, allAccounts, loadAccounts, loadAllAccounts])

  // Add existing account to user's list
  const addExistingAccount = useCallback(async (accountId) => {
    if (!user) throw new Error('Not authenticated')
    
    await updateDoc(doc(db, 'accounts', accountId), {
      userIds: arrayUnion(user.uid)
    })
    
    await loadAccounts()
    await loadAllAccounts()
  }, [user, loadAccounts, loadAllAccounts])

  // Remove category from user's list (not delete globally)
  const removeCategory = useCallback(async (id) => {
    if (!user) throw new Error('Not authenticated')
    
    await updateDoc(doc(db, 'categories', id), {
      userIds: arrayRemove(user.uid)
    })
    
    await loadCategories()
    await loadAllCategories()
  }, [user, loadCategories, loadAllCategories])

  // Remove account from user's list
  const removeAccount = useCallback(async (id) => {
    if (!user) throw new Error('Not authenticated')
    
    await updateDoc(doc(db, 'accounts', id), {
      userIds: arrayRemove(user.uid)
    })
    
    await loadAccounts()
    await loadAllAccounts()
  }, [user, loadAccounts, loadAllAccounts])

  return useMemo(() => ({
    transactions, categories, accounts, loading,
    expenseCategories, incomeCategories, transferCategories,
    availableCategories, availableAccounts,
    addTransaction, updateTransaction, deleteTransaction,
    addCategory, addExistingCategory, removeCategory,
    addAccount, addExistingAccount, removeAccount
  }), [transactions, categories, accounts, loading, expenseCategories, incomeCategories, transferCategories, availableCategories, availableAccounts, addTransaction, updateTransaction, deleteTransaction, addCategory, addExistingCategory, removeCategory, addAccount, addExistingAccount, removeAccount])
}
