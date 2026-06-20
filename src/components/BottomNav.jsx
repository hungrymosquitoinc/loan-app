import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function BottomNav() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  if (!user) return null

  const isAdmin = user.role === 'admin'

  if (isAdmin) {
    const tabs = [
      { to: '/admin', label: 'Dashboard', icon: '📊' },
      { to: '/admin/kyc', label: 'KYC', icon: '🪪' },
      { to: '/admin/loans', label: 'Loans', icon: '💰' },
      { to: '/admin/borrowers', label: 'Borrowers', icon: '👥' },
      { to: '/admin/profile', label: 'Profile', icon: '⚙️' },
    ]
    return (
      <nav className="bottom-nav">
        {tabs.map(t => (
          <Link key={t.to} to={t.to} className={location.pathname === t.to ? 'active' : ''}>
            <span className="nav-icon">{t.icon}</span>
            <span>{t.label}</span>
          </Link>
        ))}
      </nav>
    )
  }

  const tabs = [
    { to: '/', label: 'Home', icon: '🏠' },
    { to: '/apply-loan', label: 'Apply', icon: '📝' },
    { to: '/my-loans', label: 'My Loans', icon: '💰' },
    { to: '/kyc', label: 'KYC', icon: '🪪' },
    { to: '/profile', label: 'Profile', icon: '👤' },
  ]
  return (
    <nav className="bottom-nav">
      {tabs.map(t => (
        <Link key={t.to} to={t.to} className={location.pathname === t.to ? 'active' : ''}>
          <span className="nav-icon">{t.icon}</span>
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  )
}
