import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { apiPut } from '../lib/api'

export default function AdminProfile() {
  const { user } = useAuth()
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setMsg('')
    setSaving(true)
    try {
      await apiPut('/admin/profile', { id: user.id, ...form })
      setMsg('Profile updated successfully')
    } catch (e) {
      setMsg(e.message || 'Failed to update profile')
    }
    setSaving(false)
  }

  return (
    <div className="admin-page">
      <h1>Admin Profile</h1>

      {msg && (
        <div className={`alert ${msg.includes('Error') ? 'alert-error' : ''}`}
          style={{ background: msg.includes('Error') ? '#ffebee' : '#e8f5e9', color: msg.includes('Error') ? 'var(--danger)' : '#2e7d32' }}>
          {msg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="checkout-section">
          <h2>Personal Information</h2>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0917xxxxxxx" />
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={saving}>
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  )
}
