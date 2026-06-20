import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  if (!user) {
    return (
      <nav className="navbar" style={{ background: '#0d47a1' }}>
        <Link to="/" className="nav-brand">LoanApp</Link>
        <div className="nav-links">
          <Link to="/login" className={`nav-link ${location.pathname === '/login' ? 'active' : ''}`}>Login</Link>
          <Link to="/register" className={`nav-link ${location.pathname === '/register' ? 'active' : ''}`}>Register</Link>
        </div>
      </nav>
    )
  }

  return (
    <nav className="navbar" style={{ background: user.role === 'admin' ? '#1a237e' : '#1565c0' }}>
      <Link to={user.role === 'admin' ? '/admin' : '/'} className="nav-brand">LoanApp</Link>
      <div className="nav-links">
        <button onClick={async () => { await logout(); navigate('/login') }} className="nav-link logout-btn">Logout</button>
      </div>
    </nav>
  )
}
