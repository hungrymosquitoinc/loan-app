import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../contexts/NotificationContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [showPanel, setShowPanel] = useState(false)
  const panelRef = useRef(null)
  const notif = useNotifications()

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setShowPanel(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!user) {
    return (
      <nav className="navbar" style={{ background: '#0d47a1' }}>
        <Link to="/" className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img src="/logo.png" alt="JSR" style={{ height: 45, width: 'auto' }} />
          JSR Lending Inc
        </Link>
        <div className="nav-links">
          <Link to="/login" className={`nav-link ${location.pathname === '/login' ? 'active' : ''}`}>Login</Link>
          <Link to="/register" className={`nav-link ${location.pathname === '/register' ? 'active' : ''}`}>Register</Link>
        </div>
      </nav>
    )
  }

  return (
    <nav className="navbar" style={{ background: user.role === 'admin' ? '#1a237e' : '#1565c0' }}>
      <Link to={user.role === 'admin' ? '/admin' : '/'} className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <img src="/logo.png" alt="JSR" style={{ height: 45, width: 'auto' }} />
        JSR Lending Inc
      </Link>
      <div className="nav-links">
        {user.role === 'admin' && notif && (
          <div ref={panelRef} style={{ position: 'relative' }}>
            <button onClick={() => setShowPanel(!showPanel)} className={notif.unreadCount > 0 ? 'notif-bell-pulse' : ''} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.3rem', position: 'relative', padding: '4px 8px' }}>
              🔔
              {notif.unreadCount > 0 && (
                <span style={{ position: 'absolute', top: 0, right: 0, background: '#f44336', color: 'white', borderRadius: '50%', fontSize: '0.65rem', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {notif.unreadCount > 9 ? '9+' : notif.unreadCount}
                </span>
              )}
            </button>
            {showPanel && (
              <div className="notif-panel">
                <div className="notif-panel-header">
                  <span style={{ fontWeight: 700 }}>Notifications</span>
                  {notif.unreadCount > 0 && (
                    <button onClick={() => notif.markAllAsRead()} className="notif-mark-all">Mark all read</button>
                  )}
                </div>
                <div className="notif-panel-body">
                  {notif.notifications.length === 0 ? (
                    <div className="notif-empty">No notifications</div>
                  ) : (
                    notif.notifications.slice(0, 20).map(n => (
                      <div key={n.id} className={`notif-item ${!n.is_read ? 'unread' : ''}`} onClick={() => { notif.markAsRead(n.id); if (n.link) { navigate(n.link); setShowPanel(false) } }}>
                        <div className="notif-item-icon">{n.type === 'kyc' ? '📋' : n.type === 'loan' ? '💰' : 'ℹ️'}</div>
                        <div className="notif-item-content">
                          <div className="notif-item-title">{n.title}</div>
                          <div className="notif-item-message">{n.message}</div>
                          <div className="notif-item-time">{new Date(n.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        <button onClick={async () => { await logout(); navigate('/login') }} className="nav-link logout-btn">Logout</button>
      </div>
    </nav>
  )
}
