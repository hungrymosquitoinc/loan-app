import { useState, useEffect } from 'react'
import { useLoan } from '../contexts/LoanContext'
import { apiPut } from '../lib/api'

export default function AdminKYC() {
  const { getBorrowers } = useLoan()
  const [borrowers, setBorrowers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending')
  const [selected, setSelected] = useState(null)

  useEffect(() => { loadBorrowers() }, [])

  async function loadBorrowers() {
    try { const d = await getBorrowers(); setBorrowers(d) } catch {}
    setLoading(false)
  }

  const hasKyc = (b) => b.id_type && b.id_number
  const filtered = borrowers.filter(b => {
    if (tab === 'pending') return hasKyc(b)
    if (tab === 'active') return false
    return true
  })

  async function approveKYC(id) {
    try { await apiPut(`/borrowers/${id}/kyc`, { kyc_status: 'approved' }); await loadBorrowers() } catch {}
  }

  async function rejectKYC(id) {
    try { await apiPut(`/borrowers/${id}/kyc`, { kyc_status: 'rejected' }); await loadBorrowers() } catch {}
  }

  const tabs = [
    { key: 'pending', label: `Pending (${borrowers.filter(hasKyc).length})` },
    { key: 'active', label: 'Active' },
    { key: 'all', label: `All (${borrowers.length})` },
  ]

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="admin-page">
      <h1>KYC Management</h1>
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem', background: tab === t.key ? 'var(--primary)' : '#f5f5f5', color: tab === t.key ? '#fff' : 'var(--text-secondary)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header"><h3>{selected.name}</h3><button className="modal-close" onClick={() => setSelected(null)}>×</button></div>
            {selected.id_image && <img src={selected.id_image} alt="ID" style={{ width: '100%', maxHeight: 250, objectFit: 'contain', borderRadius: 8, marginBottom: 12 }} />}
            {selected.selfie_image && <img src={selected.selfie_image} alt="Selfie" style={{ width: '100%', maxHeight: 250, objectFit: 'contain', borderRadius: 8, marginBottom: 12 }} />}
            <div className="checkout-items">
              <div className="checkout-item"><span>ID Type</span><span>{selected.id_type || '—'}</span></div>
              <div className="checkout-item"><span>ID Number</span><span>{selected.id_number || '—'}</span></div>
              <div className="checkout-item"><span>Address</span><span>{selected.address || '—'}</span></div>
              <div className="checkout-item"><span>Bank</span><span>{selected.bank_name || '—'}</span></div>
              <div className="checkout-item"><span>Account Holder</span><span>{selected.account_holder || selected.name || '—'}</span></div>
              <div className="checkout-item"><span>Account No.</span><span>{selected.account_number || selected.bank_account || '—'}</span></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { approveKYC(selected.id); setSelected(null) }}>Approve</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => { rejectKYC(selected.id); setSelected(null) }}>Reject</button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state"><span className="empty-icon">🪪</span><h2>No KYC submissions</h2></div>
      ) : (
        <div className="orders-list">
          {filtered.map(b => (
            <div key={b.id} className="order-card" style={{ cursor: 'pointer' }} onClick={() => setSelected(b)}>
              <div className="order-card-header">
                <span className="order-id">{b.name}</span>
                <span className="order-status status-pending">Review</span>
              </div>
              <div className="order-card-items">
                {b.id_type} | 📞 {b.phone || '—'} | 🏦 {b.bank_name || '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
