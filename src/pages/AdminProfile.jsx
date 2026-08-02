import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { apiPut, apiGet } from '../lib/api'

export default function AdminProfile() {
  const { user, updateProfile } = useAuth()
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [paymentMethods, setPaymentMethods] = useState([])
  const [showPmForm, setShowPmForm] = useState(false)
  const [pmForm, setPmForm] = useState({ type: 'gcash', name: '', account_holder: '', account_number: '', qr_image: '' })
  const [editingPhone, setEditingPhone] = useState(false)
  const [phoneInput, setPhoneInput] = useState(user?.phone || '')

  useEffect(() => {
    loadPaymentMethods()
  }, [])

  async function loadPaymentMethods() {
    try { const d = await apiGet('/admin/payment-methods'); setPaymentMethods(d) } catch {}
  }

  function handlePmImage(field, file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => setPmForm({ ...pmForm, [field]: e.target.result })
    reader.readAsDataURL(file)
  }

  async function addPaymentMethod() {
    try {
      await apiPut('/admin/payment-methods', pmForm)
      setShowPmForm(false)
      setPmForm({ type: 'gcash', name: '', account_holder: '', account_number: '', qr_image: '' })
      await loadPaymentMethods()
    } catch {}
  }

  async function deletePaymentMethod(id) {
    if (!confirm('Delete this payment method?')) return
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/admin/payment-methods/${id}`, { method: 'DELETE' })
      await loadPaymentMethods()
    } catch {}
  }

  const joined = user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'

  async function savePhone() {
    setSaving(true)
    setMsg('')
    try {
      await apiPut('/profile', { id: user.id, name: user.name, phone: phoneInput })
      updateProfile({ phone: phoneInput })
      setEditingPhone(false)
      setMsg('Phone updated')
    } catch (e) {
      setMsg(e.message || 'Failed')
    }
    setSaving(false)
  }

  return (
    <div className="admin-page">
      <h1>Profile</h1>
      {msg && <div className={`alert ${msg.includes('Error') || msg.includes('Failed') ? 'alert-error' : ''}`} style={{ background: msg.includes('Error') || msg.includes('Failed') ? '#ffebee' : '#e8f5e9', color: msg.includes('Error') || msg.includes('Failed') ? 'var(--danger)' : '#2e7d32' }}>{msg}</div>}

      <div className="checkout-section">
          <h2>Personal Info</h2>
          <div className="checkout-items">
            <div className="checkout-item"><span>Name</span><span>{user?.name || '—'}</span></div>
            <div className="checkout-item"><span>Email</span><span>{user?.email || '—'}</span></div>
            <div className="checkout-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Phone</span>
              <span style={{ flex: 1, textAlign: 'right', minWidth: 0 }}>
                {editingPhone ? (
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <input type="tel" value={phoneInput} onChange={e => setPhoneInput(e.target.value)} style={{ width: '180px', padding: '4px 8px' }} />
                    <button className="btn btn-primary btn-sm" onClick={savePhone} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                    <button className="btn btn-sm" onClick={() => setEditingPhone(false)}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <span style={{ marginRight: 12 }}>{user?.phone || '—'}</span>
                    <button className="btn btn-sm" onClick={() => { setPhoneInput(user?.phone || ''); setEditingPhone(true); }}>Edit</button>
                  </>
                )}
              </span>
            </div>
            <div className="checkout-item"><span>Joined</span><span>{joined}</span></div>
          </div>
        </div>

      <div className="checkout-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Payment Methods</h2>
          <button className="btn btn-sm btn-primary" onClick={() => setShowPmForm(true)}>+ Add</button>
        </div>
        {paymentMethods.length === 0 ? <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No payment methods added</p> : (
          paymentMethods.map((pm, i) => (
            <div key={pm.id || i} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{pm.name || pm.type}</strong>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{pm.account_holder} - {pm.account_number}</div>
                {pm.qr_image && <img src={pm.qr_image} alt="QR" style={{ width: 80, height: 80, marginTop: 4, borderRadius: 4 }} />}
              </div>
              <button className="btn btn-sm btn-danger" onClick={() => deletePaymentMethod(pm.id)}>🗑️</button>
            </div>
          ))
        )}
      </div>

      {showPmForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Add Payment Method</h2>
            <div className="form-group">
              <label>Type</label>
              <select value={pmForm.type} onChange={e => setPmForm({ ...pmForm, type: e.target.value })}>
                <option value="gcash">GCash</option>
                <option value="bank">Bank Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group"><label>Name/Label</label><input value={pmForm.name} onChange={e => setPmForm({ ...pmForm, name: e.target.value })} placeholder="e.g. GCash - 0917xxx" /></div>
            <div className="form-group"><label>Account Holder</label><input value={pmForm.account_holder} onChange={e => setPmForm({ ...pmForm, account_holder: e.target.value })} /></div>
            <div className="form-group"><label>Account Number</label><input value={pmForm.account_number} onChange={e => setPmForm({ ...pmForm, account_number: e.target.value })} /></div>
            <div className="form-group">
              <label>QR Code Image</label>
              <input type="file" accept="image/*" onChange={e => handlePmImage('qr_image', e.target.files[0])} />
              {pmForm.qr_image && <img src={pmForm.qr_image} alt="QR Preview" style={{ width: 100, height: 100, marginTop: 4, borderRadius: 4 }} />}
            </div>
            <div className="form-row" style={{ gap: 8 }}>
              <button className="btn btn-block" onClick={() => setShowPmForm(false)}>Cancel</button>
              <button className="btn btn-primary btn-block" onClick={addPaymentMethod}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
