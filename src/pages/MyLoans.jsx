import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLoan } from '../contexts/LoanContext'

export default function MyLoans() {
  const { user } = useAuth()
  const { getLoans } = useLoan()
  const navigate = useNavigate()
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('active')
  const [selected, setSelected] = useState(null)

  useEffect(() => { loadLoans() }, [user])

  async function loadLoans() {
    try {
      const data = await getLoans({ borrowerId: user.id })
      setLoans(data)
    } catch {}
    setLoading(false)
  }

  const filtered = loans.filter(l => {
    if (tab === 'active') return l.status === 'approved' || l.status === 'pending'
    if (tab === 'closed') return l.status === 'paid' || l.status === 'rejected'
    return true
  })

  const tabs = [
    { key: 'active', label: 'Active' },
    { key: 'closed', label: 'Closed' },
    { key: 'all', label: 'All' },
  ]

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="borrower-page">
      <h1>My Loans</h1>

      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', background: tab === t.key ? 'var(--primary)' : '#f5f5f5', color: tab === t.key ? '#fff' : 'var(--text-secondary)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header"><h3>Loan {selected.id}</h3><button className="modal-close" onClick={() => setSelected(null)}>×</button></div>
            <div className="checkout-items">
              <div className="checkout-item"><span>Amount</span><span>₱{selected.amount?.toLocaleString()}</span></div>
              <div className="checkout-item"><span>Interest/Period</span><span>{selected.interest_rate}% {selected.frequency || selected.interest_type}</span></div>
              <div className="checkout-item"><span>Total Payable</span><span>₱{selected.total_payable?.toLocaleString()}</span></div>
              <div className="checkout-item"><span>EMI</span><span style={{ fontWeight: 700 }}>₱{selected.emi?.toLocaleString() || '—'}</span></div>
              <div className="checkout-item"><span>Payments</span><span>{selected.num_payments || '—'}</span></div>
              <div className="checkout-item"><span>Status</span><span className={`order-status status-${selected.status === 'approved' ? 'ready' : selected.status === 'paid' ? 'delivered' : selected.status === 'rejected' ? 'cancelled' : 'pending'}`}>{selected.status}</span></div>
              <div className="checkout-item"><span>Purpose</span><span>{selected.purpose || '—'}</span></div>
            </div>
            {selected.payments && selected.payments.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h3>Payment History</h3>
                {selected.payments.map((p, i) => (
                  <div key={p.id || i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                    <span>{new Date(p.date).toLocaleDateString()}</span>
                    <span>₱{(p.amount || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state"><span className="empty-icon">📋</span><h2>No loans found</h2></div>
      ) : (
        <div className="orders-list">
          {filtered.map(loan => (
            <div key={loan.id} className="order-card" style={{ cursor: 'pointer', borderLeftColor: loan.status === 'approved' ? '#4caf50' : loan.status === 'paid' ? '#2196f3' : loan.status === 'rejected' ? '#f44336' : '#ff9800' }}
              onClick={() => setSelected(loan)}>
              <div className="order-card-header">
                <span className="order-id">{loan.id}</span>
                <span className={`order-status status-${loan.status === 'approved' ? 'ready' : loan.status === 'paid' ? 'delivered' : loan.status === 'rejected' ? 'cancelled' : 'pending'}`}>{loan.status}</span>
              </div>
              <div className="order-card-items">
                ₱{loan.amount?.toLocaleString()} | {loan.interest_rate}% {loan.frequency || loan.interest_type} | EMI: ₱{loan.emi?.toLocaleString() || '—'}
              </div>
              <div className="order-card-footer">
                <span className="order-total">Payable: ₱{loan.total_payable?.toLocaleString()}</span>
                <span className="order-date">{loan.num_payments || '—'} payments</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
