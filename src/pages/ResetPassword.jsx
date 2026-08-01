import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function ResetPassword({ rawHash }) {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(!rawHash)

  useEffect(() => {
    if (!rawHash) {
      setReady(true)
      return
    }
    const params = Object.fromEntries(new URLSearchParams(rawHash))
    if (params.access_token && params.refresh_token) {
      supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      }).then(({ error }) => {
        if (error) {
          setError('Invalid or expired reset link. Please request a new one.')
        } else {
          setReady(true)
        }
      })
    } else {
      setError('Invalid reset link. Please request a new one.')
      setReady(true)
    }
  }, [rawHash])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMsg('')
    if (password.length < 8) return setError('Password must be at least 8 characters')
    if (password !== confirm) return setError('Passwords do not match')
    setLoading(true)
    try {
      await updatePassword(password)
      await supabase.auth.signOut()
      navigate('/login')
    } catch (e) {
      setError(e.message || 'Failed to update password')
    }
    setLoading(false)
  }

  if (!ready && !error) return <div className="auth-page"><div className="auth-card"><p>Verifying reset link...</p></div></div>

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src="/logo.png" alt="JSR Lending Inc" style={{ width: 220, height: 116, borderRadius: 0, margin: '0 auto 16px', display: 'block' }} />
        <h1>Reset Password</h1>
        <p className="auth-subtitle">Enter your new password below.</p>
        {error && <div className="alert alert-error">{error}</div>}
        {msg && <div className="alert" style={{ background: '#e8f5e9', color: '#2e7d32' }}>{msg}</div>}
        {!msg && ready && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" required />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password" required />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</button>
          </form>
        )}
        {!msg && (
          <p className="auth-footer" style={{ marginTop: 8 }}>
            <a href="#/forgot-password" style={{ color: 'var(--primary)', textDecoration: 'underline', fontSize: '0.85rem' }}>Request a new reset link</a>
          </p>
        )}
      </div>
    </div>
  )
}
