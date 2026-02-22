import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { auth, googleProvider } from '../firebase'
import { 
  signInWithPopup, signInWithCredential, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  updateProfile, GoogleAuthProvider, reauthenticateWithPopup
} from 'firebase/auth'
import { Capacitor } from '@capacitor/core'
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Check if running on native mobile
const isNative = Capacitor.isNativePlatform()

// Initialize Google Auth for native
if (isNative) {
  GoogleAuth.initialize({
    clientId: '941221002278-n2mtpb20hcd1lvr9mfjb1u3pv244mad1.apps.googleusercontent.com',
    serverClientId: '941221002278-35tkbeipm2rn7aeps8gv8s24tl2oo5p7.apps.googleusercontent.com',
    scopes: ['profile', 'email', 'https://www.googleapis.com/auth/drive.file'],
    grantOfflineAccess: true
  })
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let timeoutId
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timeoutId)
      setUser(user)
      setLoading(false)
      if (!user) {
        setAccessToken(null)
        sessionStorage.removeItem('driveToken')
      }
    }, (error) => {
      console.error('Auth state error:', error)
      setLoading(false)
    })
    
    timeoutId = setTimeout(() => {
      console.log('Auth timeout - proceeding without auth')
      setLoading(false)
    }, 5000)
    
    return () => {
      unsubscribe()
      clearTimeout(timeoutId)
    }
  }, [])

  const loginWithGoogle = useCallback(async () => {
    try {
      if (isNative) {
        // Native Google Sign-In
        const googleUser = await GoogleAuth.signIn()
        console.log('Google user:', JSON.stringify(googleUser))
        
        // Create Firebase credential from Google ID token
        const idToken = googleUser.authentication.idToken
        if (!idToken) {
          throw new Error('No ID token received from Google')
        }
        
        console.log('Creating Firebase credential with idToken...')
        const credential = GoogleAuthProvider.credential(idToken)
        
        console.log('Calling signInWithCredential...')
        try {
          const result = await signInWithCredential(auth, credential)
          console.log('Firebase sign in success:', result.user.email)
        } catch (firebaseError) {
          console.error('Firebase signInWithCredential error:', firebaseError.code, firebaseError.message)
          throw firebaseError
        }
        
        // Store access token for Google Drive
        if (googleUser.authentication.accessToken) {
          setAccessToken(googleUser.authentication.accessToken)
          sessionStorage.setItem('driveToken', googleUser.authentication.accessToken)
        }
      } else {
        // Web Google Sign-In with popup
        const result = await signInWithPopup(auth, googleProvider)
        const credential = GoogleAuthProvider.credentialFromResult(result)
        if (credential?.accessToken) {
          setAccessToken(credential.accessToken)
          sessionStorage.setItem('driveToken', credential.accessToken)
        }
      }
    } catch (error) {
      console.error('Login error:', error.message, error.code, error)
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
