import { useState, useEffect } from 'react'
import { useLoan } from '../contexts/LoanContext'

export default function AdminLoans() {
  const { getLoans, approveLoan, rejectLoan, recordPayment } = useLoan()
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending')
  const [selected, setSelected] = useState(null)
  const [payAmount, setPayAmount] = useState('')

  useEffect(() => { loadLoans() }, [])

  async function loadLoans() {
    try { const d = await getLoans(); setLoans(d) } catch {}
    setLoading(false)
  }

  const filtered = loans.filter(l => {
    if (tab === 'pending') return l.status === 'pending'
    if (tab === 'active') return l.status === 'approved'
    return true
  })

  async function handleApprove(id) {
    if (!confirm('Approve this loan?')) return
    try { await approveLoan(id, 'admin'); await loadLoans(); setSelected(null) } catch {}
  }

  async function handleReject(id) {
    const reason = prompt('Rejection reason:')
    if (!reason) return
    try { await rejectLoan(id, reason); await loadLoans(); setSelected(null) } catch {}
  }

  async function handlePayment(loanId) {
    const amt = parseFloat(payAmount)
    if (!amt || amt <= 0) return alert('Enter valid amount')
    try { await recordPayment(loanId, amt, ''); setPayAmount(''); await loadLoans() } catch {}
  }

  const tabs = [
    { key: 'pending', label: `Pending (${loans.filter(l => l.status === 'pending').length})` },
    { key: 'active', label: `Active (${loans.filter(l => l.status === 'approved').length})` },
    { key: 'all', label: `All (${loans.length})` },
  ]

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="admin-page">
      <h1>Loans</h1>
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
            <div className="modal-header"><h3>Loan {selected.id} - {selected.borrower_name}</h3><button className="modal-close" onClick={() => setSelected(null)}>×</button></div>
            <div className="checkout-items">
              <div className="checkout-item"><span>Amount</span><span>₱{selected.amount?.toLocaleString()}</span></div>
              <div className="checkout-item"><span>Interest/Period</span><span>{selected.interest_rate}% {selected.frequency || selected.interest_type}</span></div>
              <div className="checkout-item"><span>Total Payable</span><span>₱{selected.total_payable?.toLocaleString()}</span></div>
              <div className="checkout-item"><span>EMI</span><span>₱{selected.emi?.toLocaleString() || '—'}</span></div>
              <div className="checkout-item"><span>Payments</span><span>{selected.num_payments || '—'}</span></div>
              <div className="checkout-item"><span>Paid</span><span>₱{(selected.paid_amount || 0).toLocaleString()}</span></div>
              <div className="checkout-item"><span>Remaining</span><span>₱{((selected.total_payable || 0) - (selected.paid_amount || 0)).toLocaleString()}</span></div>
              <div className="checkout-item"><span>Purpose</span><span>{selected.purpose || '—'}</span></div>
            </div>

            {selected.payments && selected.payments.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <h3>Payments</h3>
                {selected.payments.map((p, i) => (
                  <div key={p.id || i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                    <span>{new Date(p.date).toLocaleDateString()}</span>
                    <span>₱{(p.amount || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {selected.status === 'approved' && (
              <div style={{ marginTop: 12 }}>
                <h3>Record Payment</h3>
                <div className="form-row" style={{ gap: 8 }}>
                  <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="Amount" style={{ flex: 1 }} />
                  <button className="btn btn-primary" onClick={() => handlePayment(selected.id)}>Pay</button>
                </div>
              </div>
            )}

            {selected.status === 'pending' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleApprove(selected.id)}>Approve</button>
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleReject(selected.id)}>Reject</button>
              </div>
            )}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state"><span className="empty-icon">💰</span><h2>No loans</h2></div>
      ) : (
        <div className="orders-list">
          {filtered.map(loan => (
            <div key={loan.id} className="order-card" style={{ cursor: 'pointer', borderLeftColor: loan.status === 'approved' ? '#4caf50' : loan.status === 'paid' ? '#2196f3' : loan.status === 'rejected' ? '#f44336' : '#ff9800' }}
              onClick={() => setSelected(loan)}>
              <div className="order-card-header">
                <span className="order-id">{loan.borrower_name}</span>
                <span className={`order-status status-${loan.status === 'approved' ? 'ready' : loan.status === 'paid' ? 'delivered' : loan.status === 'rejected' ? 'cancelled' : 'pending'}`}>{loan.status}</span>
              </div>
              <div className="order-card-items">
                ₱{loan.amount?.toLocaleString()} | {loan.interest_rate}% {loan.frequency || loan.interest_type}
              </div>
              <div className="order-card-footer">
                <span className="order-total">₱{loan.total_payable?.toLocaleString()}</span>
                <span className="order-date">{new Date(loan.applied_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
