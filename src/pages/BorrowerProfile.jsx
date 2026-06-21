import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { apiPut } from '../lib/api'

export default function BorrowerProfile() {
  const { user, logout, changePassword, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState(user?.phone || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [showChangePw, setShowChangePw] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState('')

  useEffect(() => {
    if (user?.phone && !phone) setPhone(user.phone)
  }, [user?.phone])

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

  async function savePhone() {
    setMsg('')
    setSaving(true)
    try {
      await apiPut(`/borrowers/${user.id}/kyc`, { phone })
      updateProfile({ phone })
      setMsg('Phone updated')
    } catch (e) {
      setMsg(e.message || 'Failed')
    }
    setSaving(false)
  }

  const kycStatus = user?.id_type && user?.id_number ? 'Approved' : 'Not Submitted'
  const joined = user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'

  return (
    <div className="borrower-page">
      <h1>Profile</h1>

      {msg && <div className={`alert ${msg.includes('Error') || msg.includes('Failed') ? 'alert-error' : ''}`} style={{ background: msg.includes('Error') || msg.includes('Failed') ? '#ffebee' : '#e8f5e9', color: msg.includes('Error') || msg.includes('Failed') ? 'var(--danger)' : '#2e7d32' }}>{msg}</div>}

      <div className="checkout-section">
        <h2>Account Info</h2>
        <div className="checkout-items">
          <div className="checkout-item"><span>Name</span><span>{user?.name || '—'}</span></div>
          <div className="checkout-item"><span>Email</span><span>{user?.email || '—'}</span></div>
          <div className="checkout-item"><span>Phone</span><span>{phone || user?.phone || '—'}</span></div>
          <div className="checkout-item"><span>Joined</span><span>{joined}</span></div>
          <div className="checkout-item">
            <span>KYC Status</span>
            <span style={{ fontWeight: 700, color: kycStatus === 'Approved' ? '#4caf50' : '#ff9800' }}>{kycStatus}</span>
          </div>
        </div>
      </div>

      <div className="checkout-section">
        <h2>Phone Number</h2>
        <div className="form-group">
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0917xxxxxxx" />
        </div>
        <button className="btn btn-primary btn-block" onClick={savePhone} disabled={saving}>{saving ? 'Saving...' : 'Update Phone'}</button>
      </div>

      <button className="btn btn-block" style={{ border: '2px solid var(--primary)', color: 'var(--primary)', marginBottom: 12 }} onClick={() => setShowChangePw(true)}>Change Password</button>
      <button className="btn btn-danger btn-block" onClick={async () => { await logout(); navigate('/login') }}>Logout</button>

      {showChangePw && (
        <div className="modal-overlay" onClick={() => setShowChangePw(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Change Password</h2>
            <div className="form-group"><label>Current Password</label><input type="password" value={pwForm.current} onChange={e => setPwForm({ ...pwForm, current: e.target.value })} /></div>
            <div className="form-group"><label>New Password</label><input type="password" value={pwForm.newPw} onChange={e => setPwForm({ ...pwForm, newPw: e.target.value })} /></div>
            <div className="form-group"><label>Confirm New Password</label><input type="password" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} /></div>
            {pwMsg && <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12, color: pwMsg.includes('success') ? 'var(--success)' : 'var(--danger)' }}>{pwMsg}</p>}
            <div className="form-row" style={{ gap: 8 }}>
              <button className="btn btn-block" onClick={() => { setShowChangePw(false); setPwMsg(''); setPwForm({ current: '', newPw: '', confirm: '' }) }}>Cancel</button>
              <button className="btn btn-primary btn-block" onClick={handleChangePw}>Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
