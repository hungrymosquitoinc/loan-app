import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ConfirmEmail() {
  const navigate = useNavigate()

  const handleSignIn = async () => {
    await supabase.auth.signOut().catch(() => {})
    navigate('/login')
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <img src="/logo.png" alt="JSR Lending Inc" style={{ width: 220, height: 116, borderRadius: 0, objectFit: 'cover', margin: '0 auto 16px', display: 'block' }} />
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <h1>Email Confirmed</h1>
        <p style={{ color: 'var(--text-secondary)', margin: '12px 0 20px', lineHeight: 1.6 }}>
          Your email has been verified successfully.<br />
          You can now sign in to your account.
        </p>
        <button onClick={handleSignIn} className="btn btn-primary btn-block">Sign In</button>
      </div>
    </div>
  )
}
