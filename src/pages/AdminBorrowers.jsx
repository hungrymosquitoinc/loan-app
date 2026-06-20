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
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    loadBorrowers()
  }, [])

  async function loadBorrowers() {
    try {
      const data = await getBorrowers()
      setBorrowers(data)
    } catch {}
    setLoading(false)
  }

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="admin-page">
      <h1>Borrowers</h1>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>{selected.name}</h3>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 180, height: 180, margin: '0 auto', background: '#f5f5f5', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)' }}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=Borrower:${selected.id}|${selected.name}`} alt="QR Code" style={{ width: 180, height: 180, borderRadius: 12 }} />
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 8 }}>Scan QR to view borrower details</p>
              </div>

              <div className="checkout-section" style={{ padding: 16, marginBottom: 12 }}>
                <h2>Personal Info</h2>
                <div className="checkout-items">
                  <div className="checkout-item"><span>Name</span><span>{maskName(selected.name)}</span></div>
                  <div className="checkout-item"><span>Phone</span><span>{selected.phone || '—'}</span></div>
                  <div className="checkout-item"><span>Address</span><span>{selected.address || '—'}</span></div>
                </div>
              </div>

              <div className="checkout-section" style={{ padding: 16, marginBottom: 12 }}>
                <h2>KYC / ID</h2>
                <div className="checkout-items">
                  <div className="checkout-item"><span>ID Type</span><span>{selected.id_type || '—'}</span></div>
                  <div className="checkout-item"><span>ID Number</span><span>{selected.id_number || '—'}</span></div>
                </div>
              </div>

              <div className="checkout-section" style={{ padding: 16 }}>
                <h2>Bank Account</h2>
                <div className="checkout-items">
                  <div className="checkout-item"><span>Bank</span><span>{selected.bank_name || '—'}</span></div>
                  <div className="checkout-item"><span>Account No.</span><span>{selected.bank_account || '—'}</span></div>
                </div>
              </div>

              <div className="checkout-section" style={{ padding: 16 }}>
                <h2>Loan Summary</h2>
                <div className="checkout-items">
                  <div className="checkout-item"><span>Total Loans</span><span>{selected.total_loans || 0}</span></div>
                  <div className="checkout-item"><span>Active Loans</span><span>{selected.active_loans || 0}</span></div>
                  <div className="checkout-item"><span>Total Borrowed</span><span>₱{(selected.total_borrowed || 0)?.toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {borrowers.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">👥</span>
          <h2>No borrowers yet</h2>
          <p>Borrowers will appear here once they register</p>
        </div>
      ) : (
        <div className="orders-list">
          {borrowers.map(b => (
            <div key={b.id} className="order-card" style={{ cursor: 'pointer' }} onClick={() => setSelected(b)}>
              <div className="order-card-header">
                <span className="order-id">{b.name}</span>
                <span style={{ display: 'flex', gap: 8 }}>
                  <span className="order-status status-ready">{b.active_loans || 0} active</span>
                  <span className="order-status status-delivered">{b.total_loans || 0} total</span>
                </span>
              </div>
              <div className="order-card-items">
                📞 {b.phone || 'No phone'} | 🏦 {b.bank_name || 'No bank'}
                {b.address && <> | 📍 {b.address.substring(0, 30)}...</>}
              </div>
              <div className="order-card-footer">
                <span className="order-total">₱{(b.total_borrowed || 0)?.toLocaleString()} borrowed</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {b.id_type ? `✅ KYC: ${b.id_type}` : '❌ No KYC'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
