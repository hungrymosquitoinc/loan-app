import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLoan } from '../contexts/LoanContext'

export default function LoanDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const { getLoans, approveLoan, rejectLoan, recordPayment } = useLoan()
  const navigate = useNavigate()
  const [loan, setLoan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rejectReason, setRejectReason] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [actionMsg, setActionMsg] = useState('')

  useEffect(() => {
    loadLoan()
  }, [id])

  async function loadLoan() {
    try {
      const data = await getLoans()
      const found = data.find(l => l.id === id)
      if (found) setLoan(found)
    } catch {}
    setLoading(false)
  }

  const isAdmin = user?.role === 'admin'

  async function handleApprove() {
    if (!confirm('Approve this loan?')) return
    try {
      const updated = await approveLoan(loan.id, user.id)
      setLoan(updated)
      setActionMsg('Loan approved successfully')
    } catch (e) {
      setActionMsg('Error approving loan')
    }
  }

  async function handleReject() {
    if (!rejectReason) return alert('Please provide a reason for rejection')
    if (!confirm('Reject this loan?')) return
    try {
      const updated = await rejectLoan(loan.id, rejectReason)
      setLoan(updated)
      setRejectReason('')
      setActionMsg('Loan rejected')
    } catch {
      setActionMsg('Error rejecting loan')
    }
  }

  async function handlePayment() {
    const amt = parseFloat(paymentAmount)
    if (!amt || amt <= 0) return alert('Enter a valid payment amount')
    if (!confirm(`Record payment of ₱${amt.toLocaleString()}?`)) return
    try {
      const updated = await recordPayment(loan.id, amt, paymentNote)
      setLoan(updated)
      setPaymentAmount('')
      setPaymentNote('')
      setActionMsg('Payment recorded')
    } catch {
      setActionMsg('Error recording payment')
    }
  }

  if (loading) return <div className="page-loading">Loading...</div>
  if (!loan) return <div className="empty-state"><h2>Loan not found</h2></div>

  return (
    <div className="borrower-page">
      <button className="btn btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>← Back</button>
      <div className="order-detail-header">
        <h1>Loan {loan.id}</h1>
        <span className={`order-status status-${loan.status === 'approved' ? 'ready' : loan.status === 'paid' ? 'delivered' : loan.status === 'rejected' ? 'cancelled' : 'pending'}`}>
          {loan.status}
        </span>
      </div>

      {actionMsg && (
        <div className={`alert ${actionMsg.includes('Error') ? 'alert-error' : ''}`} style={{ background: actionMsg.includes('success') || actionMsg.includes('approved') || !actionMsg.includes('Error') ? '#e8f5e9' : '#ffebee', color: actionMsg.includes('Error') ? 'var(--danger)' : '#2e7d32' }}>
          {actionMsg}
        </div>
      )}

      <div className="checkout-section">
        <h2>Loan Details</h2>
        <div className="checkout-items">
          <div className="checkout-item"><span>Borrower</span><span>{loan.borrower_name}</span></div>
          <div className="checkout-item"><span>Amount</span><span>₱{loan.amount?.toLocaleString()}</span></div>
          <div className="checkout-item"><span>Interest Type</span><span>{loan.interest_type}</span></div>
          <div className="checkout-item"><span>Interest Rate</span><span>{loan.interest_rate}%</span></div>
          <div className="checkout-item"><span>Term</span><span>{loan.days} days</span></div>
          <div className="checkout-item"><span>Total Interest</span><span>₱{loan.total_interest?.toLocaleString()}</span></div>
          <div className="checkout-item"><span>Applied</span><span>{new Date(loan.applied_at).toLocaleDateString()}</span></div>
          {loan.approved_at && <div className="checkout-item"><span>Approved</span><span>{new Date(loan.approved_at).toLocaleDateString()}</span></div>}
          {loan.paid_at && <div className="checkout-item"><span>Paid</span><span>{new Date(loan.paid_at).toLocaleDateString()}</span></div>}
          {loan.rejected_reason && <div className="checkout-item"><span>Rejection Reason</span><span style={{ color: 'var(--danger)' }}>{loan.rejected_reason}</span></div>}
        </div>
        <div className="checkout-total" style={{ marginTop: 12, paddingTop: 12, borderTop: '2px solid var(--primary)' }}>
          <strong>Total Payable</strong>
          <strong style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>₱{loan.total_payable?.toLocaleString()}</strong>
        </div>
        {(loan.paid_amount || 0) > 0 && (
          <div className="checkout-total" style={{ marginTop: 8 }}>
            <strong>Paid So Far</strong>
            <strong style={{ color: '#4caf50' }}>₱{loan.paid_amount?.toLocaleString()}</strong>
          </div>
        )}
        {(loan.paid_amount || 0) > 0 && (loan.paid_amount || 0) < loan.total_payable && (
          <div className="checkout-total" style={{ marginTop: 8 }}>
            <strong>Remaining</strong>
            <strong style={{ color: '#f44336' }}>₱{(loan.total_payable - (loan.paid_amount || 0))?.toLocaleString()}</strong>
          </div>
        )}
      </div>

      {loan.payments && loan.payments.length > 0 && (
        <div className="checkout-section">
          <h2>Payment History</h2>
          <div className="checkout-items">
            {loan.payments.map(p => (
              <div key={p.id} className="checkout-item">
                <span>{new Date(p.date).toLocaleDateString()}</span>
                <span>₱{p.amount?.toLocaleString()} {p.note && <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>({p.note})</span>}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(isAdmin && loan.status === 'pending') && (
        <div className="checkout-section">
          <h2>Actions</h2>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleApprove}>Approve</button>
            <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleReject}>Reject</button>
          </div>
          <div className="form-group">
            <label>Rejection Reason (required for reject)</label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Enter reason for rejection" />
          </div>
        </div>
      )}

      {(isAdmin && (loan.status === 'approved' || (loan.paid_amount || 0) < loan.total_payable)) && (
        <div className="checkout-section">
          <h2>Record Payment</h2>
          <div className="form-group">
            <label>Payment Amount (₱)</label>
            <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="Enter amount" />
          </div>
          <div className="form-group">
            <label>Note (optional)</label>
            <input type="text" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} placeholder="Payment note" />
          </div>
          <button className="btn btn-primary btn-block" onClick={handlePayment}>Record Payment</button>
        </div>
      )}
    </div>
  )
}
