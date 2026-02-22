import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { auth, googleProvider } from '../firebase'
import { 
  signInWithPopup, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  updateProfile, GoogleAuthProvider, reauthenticateWithPopup
} from 'firebase/auth'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
      // Clear token when user changes (security)
      if (!user) {
        setAccessToken(null)
        sessionStorage.removeItem('driveToken')
      }
    })
    return unsubscribe
  }, [])

  const loginWithGoogle = useCallback(async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const credential = GoogleAuthProvider.credentialFromResult(result)
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken)
        sessionStorage.setItem('driveToken', credential.accessToken)
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }, [])

  // Refresh Google token (for linked accounts or expired tokens)
  const refreshGoogleToken = useCallback(async () => {
    if (!auth.currentUser) return null
    
    try {
      const result = await reauthenticateWithPopup(auth.currentUser, googleProvider)
      const credential = GoogleAuthProvider.credentialFromResult(result)
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken)
        sessionStorage.setItem('driveToken', credential.accessToken)
        return credential.accessToken
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      throw error
    }
    return null
  }, [])

  const signupWithEmail = useCallback(async (email, password, displayName) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(result.user, { displayName })
      return result.user
    } catch (error) {
      console.error('Signup error:', error)
      throw error
    }
  }, [])

  const loginWithEmail = useCallback(async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      return result.user
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await signOut(auth)
      setAccessToken(null)
      sessionStorage.removeItem('driveToken')
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }, [])

  // Restore token from sessionStorage on mount (same session only)
  useEffect(() => {
    const savedToken = sessionStorage.getItem('driveToken')
    if (savedToken) {
      setAccessToken(savedToken)
    }
  }, [])

  const value = useMemo(() => ({
    user,
    accessToken,
    loading,
    isGoogleUser: user?.providerData?.some(p => p.providerId === 'google.com') || false,
    loginWithGoogle,
    refreshGoogleToken,
    signupWithEmail,
    loginWithEmail,
    logout
  }), [user, accessToken, loading, loginWithGoogle, refreshGoogleToken, signupWithEmail, loginWithEmail, logout])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
