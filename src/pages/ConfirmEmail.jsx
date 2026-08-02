import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Capacitor } from '@capacitor/core'

export default function ConfirmEmail({ rawHash }) {
  const navigate = useNavigate()

  const hash = rawHash || window.location.hash.replace(/^#\/?/, '')
  const params = new URLSearchParams(hash)
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')

  const openInApp = () => {
    if (Capacitor.isNativePlatform()) return
    if (accessToken && refreshToken) {
      localStorage.setItem('pending_auth_tokens', JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
      }))
    }
    window.location.href = 'jsrlending://login'
  }

  const handleSignIn = async () => {
    openInApp()
    await supabase.auth.signOut().catch(() => {})
    navigate('/login')
  }

  if (accessToken && refreshToken && !Capacitor.isNativePlatform()) {
    localStorage.setItem('pending_auth_tokens', JSON.stringify({
      access_token: accessToken,
      refresh_token: refreshToken,
    }))
    setTimeout(() => { window.location.href = 'jsrlending://login' }, 500)
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <img src="/logo.png" alt="JSR Lending Inc" style={{ width: 220, height: 116, borderRadius: 0, objectFit: 'cover', margin: '0 auto 16px', display: 'block' }} />
        <div style={{ fontSize: 48, marginBottom: 12 }}>&#10003;</div>
        <h1>Email Confirmed</h1>
        <p style={{ color: 'var(--text-secondary)', margin: '12px 0 20px', lineHeight: 1.6 }}>
          Your email has been verified successfully.<br />
          Opening the app...
        </p>
        <button onClick={handleSignIn} className="btn btn-primary btn-block">Open JSR Lending</button>
      </div>
    </div>
  )
}
