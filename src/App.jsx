import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Entry from './pages/Entry'
import Transactions from './pages/Transactions'
import Stats from './pages/Stats'
import Settings from './pages/Settings'
import Family from './pages/Family'

function Navigation() {
  const { user, logout } = useAuth()

  return (
    <nav className="nav">
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <h2 style={{ color: '#4f46e5' }}>💰 Money Manager</h2>
        <div className="nav-links">
          <NavLink to="/entry" className={({ isActive }) => isActive ? 'active' : ''}>Add Entry</NavLink>
          <NavLink to="/transactions" className={({ isActive }) => isActive ? 'active' : ''}>Transactions</NavLink>
          <NavLink to="/stats" className={({ isActive }) => isActive ? 'active' : ''}>Stats</NavLink>
          <NavLink to="/family" className={({ isActive }) => isActive ? 'active' : ''}>Family</NavLink>
          <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>Settings</NavLink>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ color: '#6b7280' }}>{user?.email}</span>
        <button className="btn" onClick={logout} style={{ padding: '8px 16px' }}>Logout</button>
      </div>
    </nav>
  )
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) return <div className="container">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  
  return (
    <>
      <Navigation />
      {children}
    </>
  )
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) return <div className="container">Loading...</div>
  if (user) return <Navigate to="/entry" replace />
  
  return children
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/entry" element={<PrivateRoute><Entry /></PrivateRoute>} />
          <Route path="/transactions" element={<PrivateRoute><Transactions /></PrivateRoute>} />
          <Route path="/stats" element={<PrivateRoute><Stats /></PrivateRoute>} />
          <Route path="/family" element={<PrivateRoute><Family /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/entry" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
