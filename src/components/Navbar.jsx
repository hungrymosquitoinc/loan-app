import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { user, logout, changePassword } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [showChangePw, setShowChangePw] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState('')

  const validatePassword = (pw) => {
    if (pw.length < 8) return 'Password must be at least 8 characters'
    if (!/[A-Z]/.test(pw)) return 'Password must contain an uppercase letter'
    if (!/[a-z]/.test(pw)) return 'Password must contain a lowercase letter'
    if (!/[0-9]/.test(pw)) return 'Password must contain a number'
    if (!/[^A-Za-z0-9]/.test(pw)) return 'Password must contain a special character'
    return null
  }

  const handleChangePw = async () => {
    setPwMsg('')
    if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) return setPwMsg('All fields required')
    if (pwForm.newPw !== pwForm.confirm) return setPwMsg('New passwords do not match')
    const pwErr = validatePassword(pwForm.newPw)
    if (pwErr) return setPwMsg(pwErr)
    const result = await changePassword(pwForm.current, pwForm.newPw)
    if (!result.ok) return setPwMsg(result.reason)
    setPwMsg('Password updated successfully')
    setPwForm({ current: '', newPw: '', confirm: '' })
  }

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

  const role = user.role

  return (
    <nav className="navbar" style={{ background: role === 'admin' ? '#1a237e' : '#1565c0' }}>
      <Link to={role === 'admin' ? '/admin' : '/'} className="nav-brand">LoanApp</Link>
      <div className="nav-links">
        {role === 'admin' ? (
          <>
            <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}>Dashboard</Link>
            <Link to="/admin/loan-products" className={`nav-link ${location.pathname === '/admin/loan-products' ? 'active' : ''}`}>Products</Link>
            <Link to="/admin/loan-applications" className={`nav-link ${location.pathname === '/admin/loan-applications' ? 'active' : ''}`}>Applications</Link>
            <Link to="/admin/borrowers" className={`nav-link ${location.pathname === '/admin/borrowers' ? 'active' : ''}`}>Borrowers</Link>
          </>
        ) : (
          <>
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Home</Link>
            <Link to="/apply-loan" className={`nav-link ${location.pathname === '/apply-loan' ? 'active' : ''}`}>Apply</Link>
            <Link to="/my-loans" className={`nav-link ${location.pathname === '/my-loans' ? 'active' : ''}`}>My Loans</Link>
            <Link to="/kyc" className={`nav-link ${location.pathname === '/kyc' ? 'active' : ''}`}>KYC</Link>
          </>
        )}
        <button onClick={() => setShowChangePw(true)} className="nav-link" style={{ fontSize: '0.75rem' }}>🔑</button>
        <button onClick={async () => { await logout(); navigate('/login') }} className="nav-link logout-btn">Logout</button>
      </div>

      {showChangePw && (
        <div className="modal-overlay" onClick={() => setShowChangePw(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Change Password</h2>
            <div className="form-group">
              <label>Current Password</label>
              <input type="password" value={pwForm.current} onChange={e => setPwForm({ ...pwForm, current: e.target.value })} />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" value={pwForm.newPw} onChange={e => setPwForm({ ...pwForm, newPw: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} />
            </div>
            {pwMsg && (
              <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12, color: pwMsg.includes('success') ? 'var(--success)' : 'var(--danger)' }}>
                {pwMsg}
              </p>
            )}
            <div className="form-row" style={{ gap: 8 }}>
              <button className="btn btn-block" onClick={() => { setShowChangePw(false); setPwMsg(''); setPwForm({ current: '', newPw: '', confirm: '' }) }}>Cancel</button>
              <button className="btn btn-primary btn-block" onClick={handleChangePw}>Update</button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
