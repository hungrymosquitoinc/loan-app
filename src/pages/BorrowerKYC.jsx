import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLoan } from '../contexts/LoanContext'

export default function BorrowerKYC() {
  const { user } = useAuth()
  const { updateKYC } = useLoan()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', phone: '', address: '', id_type: '', id_number: '', bank_name: '', bank_account: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!user) return
    setForm({
      name: user.name || '',
      phone: user.phone || '',
      address: user.address || '',
      id_type: user.id_type || '',
      id_number: user.id_number || '',
      bank_name: user.bank_name || '',
      bank_account: user.bank_account || '',
    })
  }, [user])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      await updateKYC(user.id, form)
      setSuccess('KYC information updated successfully')
    } catch (e) {
      setError(e.message || 'Failed to update KYC')
    }
    setSaving(false)
  }

  return (
    <div className="borrower-page">
      <h1>KYC Profile</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 18, fontSize: '0.9rem' }}>
        Complete your profile to apply for loans. Your information is kept confidential.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert" style={{ background: '#e8f5e9', color: '#2e7d32' }}>{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="checkout-section">
          <h2>Personal Information</h2>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Mobile Number</label>
            <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0917xxxxxxx" required />
          </div>
          <div className="form-group">
            <label>Address</label>
            <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Complete address" required />
          </div>
        </div>

        <div className="checkout-section">
          <h2>Government ID</h2>
          <div className="form-group">
            <label>ID Type</label>
            <select value={form.id_type} onChange={e => setForm({ ...form, id_type: e.target.value })} required>
              <option value="">Select ID type</option>
              <option value="National ID">National ID</option>
              <option value="Passport">Passport</option>
              <option value="Driver's License">Driver's License</option>
              <option value="SSS ID">SSS ID</option>
              <option value="UMID">UMID</option>
              <option value="Postal ID">Postal ID</option>
              <option value="Voter's ID">Voter's ID</option>
              <option value="PRC ID">PRC ID</option>
            </select>
          </div>
          <div className="form-group">
            <label>ID Number</label>
            <input type="text" value={form.id_number} onChange={e => setForm({ ...form, id_number: e.target.value })} placeholder="Enter ID number" required />
          </div>
        </div>

        <div className="checkout-section">
          <h2>Bank Account Details</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
            This will be used for loan disbursement and is visible to admin
          </p>
          <div className="form-group">
            <label>Bank Name</label>
            <input type="text" value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} placeholder="e.g. BDO, BPI, GCash" required />
          </div>
          <div className="form-group">
            <label>Account Number</label>
            <input type="text" value={form.bank_account} onChange={e => setForm({ ...form, bank_account: e.target.value })} placeholder="Enter account number" required />
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={saving}>
          {saving ? 'Saving...' : 'Save KYC Information'}
        </button>
      </form>
    </div>
  )
}
