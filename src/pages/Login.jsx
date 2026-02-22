import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { loginWithGoogle, loginWithEmail, signupWithEmail } = useAuth()
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const getErrorMessage = (code) => {
    switch (code) {
      case 'auth/email-already-in-use': return 'Email already registered. Please login.'
      case 'auth/invalid-email': return 'Invalid email address.'
      case 'auth/weak-password': return 'Password should be at least 6 characters.'
      case 'auth/user-not-found': return 'No account found with this email.'
      case 'auth/wrong-password': return 'Incorrect password.'
      case 'auth/invalid-credential': return 'Invalid email or password.'
      case 'auth/too-many-requests': return 'Too many attempts. Please try again later.'
      default: return 'An error occurred. Please try again.'
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (isSignup) {
      if (!displayName.trim()) {
        setError('Please enter your name.')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }
      if (password.length < 6) {
        setError('Password should be at least 6 characters.')
        return
      }
    }

    setLoading(true)
    try {
      if (isSignup) {
        await signupWithEmail(email, password, displayName.trim())
      } else {
        await loginWithEmail(email, password)
      }
    } catch (err) {
      setError(getErrorMessage(err.code))
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      await loginWithGoogle()
    } catch (err) {
      setError(getErrorMessage(err.code))
    }
    setLoading(false)
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>💰 Money Manager</h1>
        <p>Track your expenses and income easily</p>

        {error && (
          <div style={{ background: '#fef2f2', color: '#ef4444', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          {isSignup && (
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {isSignup && (
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginBottom: 12 }}>
            {loading ? 'Please wait...' : isSignup ? 'Sign Up' : 'Login'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }}></div>
          <span style={{ color: '#9ca3af', fontSize: 14 }}>or</span>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }}></div>
        </div>

        <button className="btn btn-google" onClick={handleGoogleLogin} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <p style={{ marginTop: 20, color: '#6b7280', fontSize: 14 }}>
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button 
            onClick={() => { setIsSignup(!isSignup); setError('') }} 
            style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontWeight: 600 }}
          >
            {isSignup ? 'Login' : 'Sign Up'}
          </button>
        </p>

        <p style={{ marginTop: 12, color: '#9ca3af', fontSize: 12 }}>
          {isSignup 
            ? 'Sign up with Google to enable bill attachments via Google Drive.' 
            : 'Login with Google for Google Drive attachment support.'}
        </p>
      </div>
    </div>
  )
}
