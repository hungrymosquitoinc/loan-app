import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()

  const validatePassword = (pw) => {
    if (pw.length < 8) return 'Password must be at least 8 characters'
    if (!/[A-Z]/.test(pw)) return 'Password must contain an uppercase letter'
    if (!/[a-z]/.test(pw)) return 'Password must contain a lowercase letter'
    if (!/[0-9]/.test(pw)) return 'Password must contain a number'
    if (!/[^A-Za-z0-9]/.test(pw)) return 'Password must contain a special character'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const pwErr = validatePassword(password)
    if (pwErr) { setError(pwErr); return }
    try {
      const res = await register(name, email, password, phone)
      if (!res.ok) {
        setError(res.error || 'Registration failed')
        return
      }
      navigate('/login')
    } catch (e) {
      setError(e.message || 'Registration failed')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src="/logo.png" alt="JSR Lending Inc" style={{ width: 220, height: 116, borderRadius: 0, objectFit: 'cover', margin: '0 auto 16px', display: 'block' }} />
        <h1>Borrower Registration</h1>
        <p className="auth-subtitle">Create your account to apply for loans</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label>Mobile Number</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0917xxxxxxx" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 chars, uppercase, lowercase, number, special" required />
          </div>
          {password && (
            <div style={{ fontSize: '0.78rem', marginBottom: 12 }}>
              {[
                { label: 'At least 8 characters', test: pw => pw.length >= 8 },
                { label: 'Uppercase letter', test: pw => /[A-Z]/.test(pw) },
                { label: 'Lowercase letter', test: pw => /[a-z]/.test(pw) },
                { label: 'Number', test: pw => /[0-9]/.test(pw) },
                { label: 'Special character', test: pw => /[^A-Za-z0-9]/.test(pw) },
              ].map(({ label, test }) => (
                <div key={label} style={{ color: test(password) ? '#4caf50' : '#9e9e9e', marginBottom: 2 }}>
                  {test(password) ? '✓' : '○'} {label}
                </div>
              ))}
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-block">Create Account</button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  )
}
