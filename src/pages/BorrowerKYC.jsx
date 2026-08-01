import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLoan } from '../contexts/LoanContext'

export default function BorrowerKYC() {
  const { user, updateProfile } = useAuth()
  const { updateKYC } = useLoan()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', phone: '', address: '', id_type: '', id_number: '',
    id_image: '', selfie_image: '', bank_name: '', account_holder: '', account_number: '', qr_data: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const kycStatus = user?.kyc_status || ''

  useEffect(() => {
    if (!user?.id) return
    setForm({
      name: user.name || '',
      phone: user.phone || '',
      address: user.address || '',
      id_type: user.id_type || '',
      id_number: user.id_number || '',
      id_image: user.id_image || '',
      selfie_image: user.selfie_image || '',
      bank_name: user.bank_name || '',
      account_holder: user.account_holder || user.name || '',
      account_number: user.bank_account || user.account_number || '',
      qr_data: user.qr_data || '',
    })
  }, [user?.id])

  function handleImageUpload(field, file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => setForm(prev => ({ ...prev, [field]: e.target.result }))
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      await updateKYC(user.id, {
        ...form,
        account_number: form.account_number,
        bank_account: form.account_number,
      })
      updateProfile({ ...form, kyc_status: 'pending' })
      setSuccess('KYC information updated successfully')
    } catch (e) {
      setError(e.message || 'Failed to update KYC')
    }
    setSaving(false)
  }

  const qrData = `Borrower:${user?.id || ''}|${form.name}`

  if (kycStatus === 'approved') {
    return (
      <div className="borrower-page">
        <h1>KYC Profile</h1>
        <div className="kyc-approved-banner" style={{ background: '#e8f5e9', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
          <h2 style={{ color: '#2e7d32', margin: 0 }}>KYC Approved</h2>
          <p style={{ color: '#558b2f', fontSize: '0.9rem', marginTop: 8 }}>Your identity has been verified. You can now apply for loans.</p>
        </div>

        <div className="checkout-section">
          <h2>Personal Information</h2>
          <div className="checkout-items">
            <div className="checkout-item"><span>Full Name</span><span>{form.name || '—'}</span></div>
            <div className="checkout-item"><span>Mobile Number</span><span>{form.phone || '—'}</span></div>
            <div className="checkout-item"><span>Address</span><span>{form.address || '—'}</span></div>
          </div>
        </div>

        <div className="checkout-section">
          <h2>Government ID</h2>
          <div className="checkout-items">
            <div className="checkout-item"><span>ID Type</span><span>{form.id_type || '—'}</span></div>
            <div className="checkout-item"><span>ID Number</span><span>{form.id_number || '—'}</span></div>
          </div>
          {form.id_image && <img src={form.id_image} alt="ID" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', marginTop: 8, borderRadius: 8 }} />}
          {form.selfie_image && <img src={form.selfie_image} alt="Selfie" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', marginTop: 8, borderRadius: 8 }} />}
        </div>

        <div className="checkout-section">
          <h2>Bank Account Details</h2>
          <div className="checkout-items">
            <div className="checkout-item"><span>Bank / Fintech</span><span>{form.bank_name || '—'}</span></div>
            <div className="checkout-item"><span>Account Holder</span><span>{form.account_holder || '—'}</span></div>
            <div className="checkout-item"><span>Account Number</span><span>{form.account_number || '—'}</span></div>
          </div>
        </div>

        {form.qr_data && (
          <div className="checkout-section" style={{ textAlign: 'center' }}>
            <h2>Your QR Code</h2>
            <img src={form.qr_data} alt="QR" style={{ width: 160, height: 160, borderRadius: 12, objectFit: 'contain' }} />
          </div>
        )}

        <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={() => navigate('/apply-loan')}>Apply for Loan</button>
      </div>
    )
  }

  return (
    <div className="borrower-page">
      <h1>KYC Profile</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 18, fontSize: '0.9rem' }}>
        {kycStatus === 'rejected' ? 'Your KYC was rejected. Please update and resubmit.' : kycStatus === 'pending' ? 'Your KYC is under review. You will be notified once approved.' : 'Complete your profile to apply for loans'}
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert" style={{ background: '#e8f5e9', color: '#2e7d32' }}>{success}</div>}

      {kycStatus === 'pending' && (
        <div className="kyc-pending-banner" style={{ background: '#fff3e0', borderRadius: 12, padding: 16, marginBottom: 18, textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 4 }}>⏳</div>
          <p style={{ color: '#e65100', margin: 0, fontWeight: 600 }}>KYC Under Review</p>
          <p style={{ color: '#bf360c', fontSize: '0.85rem', marginTop: 6 }}>Your submitted information is shown below. You will be notified once approved.</p>
        </div>
      )}

      {(kycStatus === 'pending') ? (
        <div>
          <div className="checkout-section">
            <h2>Personal Information</h2>
            <div className="checkout-items">
              <div className="checkout-item"><span>Full Name</span><span>{form.name || '—'}</span></div>
              <div className="checkout-item"><span>Mobile Number</span><span>{form.phone || '—'}</span></div>
              <div className="checkout-item"><span>Address</span><span>{form.address || '—'}</span></div>
            </div>
          </div>
          <div className="checkout-section">
            <h2>Government ID</h2>
            <div className="checkout-items">
              <div className="checkout-item"><span>ID Type</span><span>{form.id_type || '—'}</span></div>
              <div className="checkout-item"><span>ID Number</span><span>{form.id_number || '—'}</span></div>
            </div>
            {form.id_image && <img src={form.id_image} alt="ID" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', marginTop: 8, borderRadius: 8 }} />}
            {form.selfie_image && <img src={form.selfie_image} alt="Selfie" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', marginTop: 8, borderRadius: 8 }} />}
          </div>
          <div className="checkout-section">
            <h2>Bank Account Details</h2>
            <div className="checkout-items">
              <div className="checkout-item"><span>Bank / Fintech</span><span>{form.bank_name || '—'}</span></div>
              <div className="checkout-item"><span>Account Holder</span><span>{form.account_holder || '—'}</span></div>
              <div className="checkout-item"><span>Account Number</span><span>{form.account_number || '—'}</span></div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="checkout-section">
            <h2>Personal Information</h2>
            <div className="form-group"><label>Full Name</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="form-group"><label>Mobile Number</label><input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required /></div>
            <div className="form-group"><label>Address</label><textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} required /></div>
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
            <div className="form-group"><label>ID Number</label><input type="text" value={form.id_number} onChange={e => setForm({ ...form, id_number: e.target.value })} required /></div>
            <div className="form-group">
              <label>Upload ID Image</label>
              <input type="file" accept="image/*" onChange={e => handleImageUpload('id_image', e.target.files[0])} />
              {form.id_image && <img src={form.id_image} alt="ID" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', marginTop: 8, borderRadius: 8 }} />}
            </div>
            <div className="form-group">
              <label>Upload Selfie</label>
              <input type="file" accept="image/*" onChange={e => handleImageUpload('selfie_image', e.target.files[0])} />
              {form.selfie_image && <img src={form.selfie_image} alt="Selfie" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', marginTop: 8, borderRadius: 8 }} />}
            </div>
          </div>

          <div className="checkout-section">
            <h2>Bank Account Details</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>For loan disbursement</p>
            <div className="form-group"><label>Bank Name / Fintech</label><input type="text" value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} placeholder="e.g. BDO, GCash" required /></div>
            <div className="form-group"><label>Account Holder Name</label><input type="text" value={form.account_holder} onChange={e => setForm({ ...form, account_holder: e.target.value })} required /></div>
            <div className="form-group"><label>Account Number</label><input type="text" value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} required /></div>
            <div className="form-group">
              <label>Upload QR Code (GCash / Bank)</label>
              <input type="file" accept="image/*" onChange={e => handleImageUpload('qr_data', e.target.files[0])} />
              {form.qr_data && <img src={form.qr_data} alt="QR" style={{ width: 120, height: 120, marginTop: 8, borderRadius: 8 }} />}
            </div>
          </div>

          <div className="checkout-section" style={{ textAlign: 'center' }}>
            <h2>Your QR Code</h2>
            {form.qr_data ? (
              <img src={form.qr_data} alt="QR" style={{ width: 160, height: 160, borderRadius: 12, objectFit: 'contain' }} />
            ) : (
            <div style={{ width: 160, height: 160, margin: '0 auto', background: '#f5f5f5', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)' }}>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrData)}`} alt="QR" style={{ width: 160, height: 160, borderRadius: 12 }} />
            </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={saving}>
            {saving ? 'Saving...' : 'Save KYC Information'}
          </button>
        </form>
      )}
    </div>
  )
}
