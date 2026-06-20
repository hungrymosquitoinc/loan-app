import { useState, useEffect } from 'react'
import { useLoan } from '../contexts/LoanContext'

function maskName(name) {
  if (!name || name.length <= 2) return name || '—'
  return name.substring(0, 2) + '...'
}

export default function AdminBorrowers() {
  const { getBorrowers } = useLoan()
  const [borrowers, setBorrowers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('approved')
  const [selected, setSelected] = useState(null)

  useEffect(() => { loadBorrowers() }, [])

  async function loadBorrowers() {
    try { const d = await getBorrowers(); setBorrowers(d) } catch {}
    setLoading(false)
  }

  const hasKyc = (b) => b.id_type && b.id_number
  const kycStatus = (b) => {
    if (!hasKyc(b)) return 'not_submitted'
    if (b.kyc_status === 'rejected') return 'disapproved'
    if (b.kyc_status === 'approved') return 'approved'
    return 'pending'
  }

  const filtered = borrowers.filter(b => {
    const s = kycStatus(b)
    if (tab === 'approved') return s === 'approved'
    if (tab === 'not_submitted') return s === 'not_submitted'
    if (tab === 'pending') return s === 'pending'
    if (tab === 'disapproved') return s === 'disapproved'
    return true
  })

  const tabs = [
    { key: 'approved', label: `Approved (${borrowers.filter(b => kycStatus(b) === 'approved').length})` },
    { key: 'not_submitted', label: `Not Submitted (${borrowers.filter(b => kycStatus(b) === 'not_submitted').length})` },
    { key: 'pending', label: `Pending (${borrowers.filter(b => kycStatus(b) === 'pending').length})` },
    { key: 'disapproved', label: `Disapproved (${borrowers.filter(b => kycStatus(b) === 'disapproved').length})` },
  ]

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="admin-page">
      <h1>Borrowers</h1>
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.7rem', background: tab === t.key ? 'var(--primary)' : '#f5f5f5', color: tab === t.key ? '#fff' : 'var(--text-secondary)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header"><h3>{selected.name}</h3><button className="modal-close" onClick={() => setSelected(null)}>×</button></div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 160, height: 160, margin: '0 auto', background: '#f5f5f5', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)' }}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=Borrower:${selected.id}|${selected.name}`} alt="QR" style={{ width: 160, height: 160, borderRadius: 12 }} />
              </div>
            </div>
            {selected.id_image && <img src={selected.id_image} alt="ID" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8, marginBottom: 8 }} />}
            {selected.selfie_image && <img src={selected.selfie_image} alt="Selfie" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8, marginBottom: 8 }} />}
            <div className="checkout-section" style={{ padding: 12, marginBottom: 8 }}>
              <h2>Personal Info</h2>
              <div className="checkout-items">
                <div className="checkout-item"><span>Name</span><span>{maskName(selected.name)}</span></div>
                <div className="checkout-item"><span>Phone</span><span>{selected.phone || '—'}</span></div>
                <div className="checkout-item"><span>Address</span><span>{selected.address || '—'}</span></div>
                <div className="checkout-item"><span>KYC Status</span><span style={{ fontWeight: 700, color: kycStatus(selected) === 'approved' ? '#4caf50' : kycStatus(selected) === 'disapproved' ? '#f44336' : kycStatus(selected) === 'pending' ? '#ff9800' : '#9e9e9e' }}>{kycStatus(selected).replace('_', ' ').toUpperCase()}</span></div>
              </div>
            </div>
            <div className="checkout-section" style={{ padding: 12, marginBottom: 8 }}>
              <h2>Bank Account</h2>
              <div className="checkout-items">
                <div className="checkout-item"><span>Bank</span><span>{selected.bank_name || '—'}</span></div>
                <div className="checkout-item"><span>Account Holder</span><span>{selected.account_holder || selected.name || '—'}</span></div>
                <div className="checkout-item"><span>Account No.</span><span>{selected.account_number || selected.bank_account || '—'}</span></div>
              </div>
            </div>
            <div className="checkout-section" style={{ padding: 12 }}>
              <h2>Loan Summary</h2>
              <div className="checkout-items">
                <div className="checkout-item"><span>Total Loans</span><span>{selected.total_loans || 0}</span></div>
                <div className="checkout-item"><span>Active Loans</span><span>{selected.active_loans || 0}</span></div>
                <div className="checkout-item"><span>Total Borrowed</span><span>₱{(selected.total_borrowed || 0).toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state"><span className="empty-icon">👥</span><h2>No borrowers</h2></div>
      ) : (
        <div className="orders-list">
          {filtered.map(b => (
            <div key={b.id} className="order-card" style={{ cursor: 'pointer' }} onClick={() => setSelected(b)}>
              <div className="order-card-header">
                <span className="order-id">{b.name}</span>
              </div>
              <div className="order-card-items">
                📞 {b.phone || 'No phone'} | 🏦 {b.bank_name || 'No bank'}
              </div>
              <div className="order-card-footer">
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: kycStatus(b) === 'approved' ? '#4caf50' : kycStatus(b) === 'disapproved' ? '#f44336' : kycStatus(b) === 'pending' ? '#ff9800' : '#9e9e9e' }}>
                  {kycStatus(b).replace('_', ' ').toUpperCase()}
                </span>
                <span>₱{(b.total_borrowed || 0).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
