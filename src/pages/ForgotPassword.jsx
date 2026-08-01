import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMsg('')
    if (!email) return setError('Enter your email address')
    setLoading(true)
    try {
      await resetPassword(email)
      setMsg('Check your email for the password reset link.')
    } catch (e) {
      setError(e.message || 'Failed to send reset email')
    }
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src="/logo.png" alt="JSR Lending Inc" style={{ width: 220, height: 116, borderRadius: 0, margin: '0 auto 16px', display: 'block' }} />
        <h1>Forgot Password</h1>
        <p className="auth-subtitle">Enter your email and we'll send you a reset link.</p>
        {error && <div className="alert alert-error">{error}</div>}
        {msg && <div className="alert" style={{ background: '#e8f5e9', color: '#2e7d32' }}>{msg}</div>}
        {!msg && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your registered email" required />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>{loading ? 'Sending...' : 'Send Reset Link'}</button>
          </form>
        )}
        <p className="auth-footer">
          <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'underline', fontSize: '0.85rem' }}>Back to Login</Link>
        </p>
      </div>
    </div>
  )
}
