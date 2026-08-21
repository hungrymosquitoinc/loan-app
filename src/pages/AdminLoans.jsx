import { useState, useEffect } from 'react'
import { useLoan } from '../contexts/LoanContext'

export default function AdminLoans() {
  const { getLoans, approveLoan, rejectLoan, recordPayment } = useLoan()
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending')
  const [selected, setSelected] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [approveDays, setApproveDays] = useState('')
  const [approveRate, setApproveRate] = useState('')
  const [approvePayments, setApprovePayments] = useState('')

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

  function openApprove(loan) {
    setSelected(loan)
    setApproveDays(loan.days || '')
    setApproveRate(loan.interest_rate || '')
    setApprovePayments(loan.num_payments || '')
  }

  function calcApproval() {
    const amt = parseFloat(selected?.amount) || 0
    const termInput = parseInt(approveDays) || 0
    const rate = parseFloat(approveRate) || 0
    const payments = parseInt(approvePayments) || 0
    const freq = selected?.frequency || 'daily'
    const days = freq === 'weekly' ? termInput * 7 : freq === 'monthly' ? termInput * 30 : termInput
    if (termInput < 1 || rate < 0 || payments < 1) return null
    let totalInterest
    if (freq === 'daily') totalInterest = amt * (rate / 100) * days
    else if (freq === 'weekly') totalInterest = amt * (rate / 100) * Math.ceil(days / 7)
    else totalInterest = amt * (rate / 100) * Math.ceil(days / 30)
    totalInterest = parseFloat(totalInterest.toFixed(2))
    const totalPayable = parseFloat((amt + totalInterest).toFixed(2))
    const emi = parseFloat((totalPayable / payments).toFixed(2))
    return { totalInterest, totalPayable, emi }
  }

  async function handleApprove() {
    const days = parseInt(approveDays)
    const rate = parseFloat(approveRate)
    const payments = parseInt(approvePayments)
    if (!days || days < 1) return alert('Enter valid loan term (days)')
    if (rate < 0) return alert('Enter valid interest rate')
    if (!payments || payments < 1) return alert('Enter valid number of payments')
    if (!confirm('Approve this loan?')) return
    try {
      await approveLoan(selected.id, { days, interest_rate: rate, num_payments: payments, approved_by: 'admin' })
      await loadLoans()
      setSelected(null)
    } catch (e) {
      alert(e.message || 'Failed to approve')
    }
  }

  async function handleReject(id) {
    const reason = prompt('Rejection reason:')
    if (!reason) return
    try { await rejectLoan(id, reason); await loadLoans(); setSelected(null) } catch {}
  }

  async function handlePayment(loanId) {
    const amt = parseFloat(payAmount)
    if (!amt || amt <= 0) return alert('Enter valid amount')
    const emi = Number(selected?.emi) || 0
    const remaining = (Number(selected?.total_payable) || 0) - (Number(selected?.paid_amount) || 0)
    if (amt > remaining) return alert(`Payment exceeds remaining balance of ₱${remaining.toLocaleString()}`)
    const minPayment = Math.min(emi, remaining)
    if (amt < minPayment) return alert(`Payment must be at least ₱${minPayment.toLocaleString()}`)
    try {
      const updated = await recordPayment(loanId, amt, '')
      setPayAmount('')
      await loadLoans()
      if (updated && updated.id) {
        setSelected(updated)
      }
    } catch (e) { alert(e?.message || 'Failed to record payment') }
  }

  const tabs = [
    { key: 'pending', label: `Pending (${loans.filter(l => l.status === 'pending').length})` },
    { key: 'active', label: `Active (${loans.filter(l => l.status === 'approved').length})` },
    { key: 'all', label: `All (${loans.length})` },
  ]

  const approvalCalc = selected?.status === 'pending' ? calcApproval() : null

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="admin-page">
      <h1>Loans</h1>
      <div className="tab-bar" style={{ display: 'flex', gap: 0, marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={tab === t.key ? 'active' : ''}
            style={{ flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem', background: tab === t.key ? 'var(--primary)' : '#f5f5f5', color: tab === t.key ? '#fff' : 'var(--text-secondary)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {selected && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header"><h3>Loan {selected.id} - {selected.borrower_name}</h3><button className="modal-close" onClick={() => setSelected(null)}>×</button></div>
            <div className="checkout-items">
              <div className="checkout-item"><span>Amount</span><span>₱{selected.amount?.toLocaleString()}</span></div>
              <div className="checkout-item"><span>Frequency</span><span>{selected.frequency || selected.interest_type || '—'}</span></div>
              <div className="checkout-item"><span>Purpose</span><span>{selected.purpose || '—'}</span></div>
              <div className="checkout-item"><span>Status</span><span className={`order-status status-${selected.status === 'approved' ? 'ready' : selected.status === 'paid' ? 'delivered' : selected.status === 'rejected' ? 'cancelled' : 'pending'}`}>{selected.status}</span></div>
              {(selected.status === 'approved' || selected.status === 'paid') && (
                <>
                  <div className="checkout-item"><span>Term</span><span>{selected.days} days</span></div>
                  <div className="checkout-item"><span>Interest</span><span>{selected.interest_rate}% {selected.frequency}</span></div>
                  <div className="checkout-item"><span>Payments Made</span><span>{(selected.payments?.length || 0)} / {selected.num_payments || 0}</span></div>
                  <div className="checkout-item"><span>EMI</span><span style={{ color: 'var(--primary)', fontWeight: 700 }}>₱{selected.emi?.toLocaleString() || '—'}</span></div>
                  <div className="checkout-item"><span>Total Payable</span><span style={{ color: 'var(--primary)', fontWeight: 700 }}>₱{selected.total_payable?.toLocaleString()}</span></div>
                  <div className="checkout-item"><span>Paid</span><span style={{ color: '#4caf50', fontWeight: 700 }}>₱{(selected.paid_amount || 0).toLocaleString()}</span></div>
                  <div className="checkout-item"><span>Remaining</span><span style={{ color: '#f44336', fontWeight: 700 }}>₱{Math.max(0, (selected.total_payable || 0) - (selected.paid_amount || 0)).toLocaleString()}</span></div>
                </>
              )}
            </div>

            {(selected.status === 'approved' || selected.status === 'paid') && (() => {
              const freq = selected.frequency || 'daily'
              const startDate = selected.approved_at ? new Date(selected.approved_at) : new Date(selected.applied_at)
              const totalSlots = selected.num_payments || 0
              const payments = selected.payments || []
              const emi = selected.emi || 0
              const toLocalStr = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}` }
              const schedule = []
              for (let i = 0; i < totalSlots; i++) {
                const d = new Date(startDate)
                if (freq === 'weekly') d.setDate(d.getDate() + i * 7)
                else if (freq === 'monthly') d.setMonth(d.getMonth() + i)
                else d.setDate(d.getDate() + i)
                const dateStr = toLocalStr(d)
                const matched = payments.find(p => toLocalStr(new Date(p.date)) === dateStr)
                schedule.push({ date: d, paid: !!matched, amount: matched?.amount })
              }
              const today = toLocalStr(new Date())
              const daysPassed = schedule.filter(s => toLocalStr(s.date) <= today).length
              return schedule.length > 0 && (
                <div style={{ marginTop: 12 }} className="animate-slide-up">
                  <h3>Payment Schedule ({daysPassed} / {totalSlots})</h3>
                  {schedule.map((s, i) => (
                    <div key={i} className="animate-slide-in" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem', animationDelay: `${i * 0.03}s` }}>
                      <span style={{ color: s.paid ? 'inherit' : '#f44336', fontWeight: s.paid ? 400 : 600 }}>
                        {i + 1}. {s.date.toLocaleDateString()}
                      </span>
                      <span style={{ fontWeight: 600, color: s.paid ? '#4caf50' : '#f44336' }}>
                        {s.paid ? `₱${(s.amount || emi).toLocaleString()}` : '\u00A0'}
                      </span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 700, fontSize: '0.9rem' }}>
                    <span>Total Paid</span>
                    <span style={{ color: '#4caf50' }}>₱{(selected.paid_amount || 0).toLocaleString()}</span>
                  </div>
                </div>
              )
            })()}

            {selected.status === 'approved' && (
              <div style={{ marginTop: 12 }}>
                <h3>Record Payment</h3>
                <div className="form-row" style={{ gap: 8 }}>
                  <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handlePayment(selected.id) } }} placeholder="Amount" style={{ flex: 1 }} />
                  <button className="btn btn-primary" onClick={() => handlePayment(selected.id)}>Pay</button>
                </div>
              </div>
            )}

            {selected.status === 'pending' && (
              <div style={{ marginTop: 16 }}>
                <h3>Set Loan Terms</h3>
                <div className="form-group">
                  <label>Loan Term ({selected.frequency === 'weekly' ? 'weeks' : selected.frequency === 'monthly' ? 'months' : 'days'})</label>
                  <input type="number" min="1" value={approveDays} onChange={e => setApproveDays(e.target.value)} placeholder={selected.frequency === 'weekly' ? 'e.g. 4' : selected.frequency === 'monthly' ? 'e.g. 3' : 'e.g. 30'} />
                </div>
                <div className="form-group">
                  <label>Interest Rate (%)</label>
                  <input type="number" min="0" step="0.01" value={approveRate} onChange={e => setApproveRate(e.target.value)} placeholder="e.g. 5" />
                </div>
                <div className="form-group">
                  <label>Number of Payments</label>
                  <input type="number" min="1" value={approvePayments} onChange={e => setApprovePayments(e.target.value)} placeholder="e.g. 4" />
                </div>

                {approvalCalc && (
                  <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Interest:</span><span>₱{approvalCalc.totalInterest.toLocaleString()}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Total Payable:</span><span>₱{approvalCalc.totalPayable.toLocaleString()}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--primary)' }}><span>EMI:</span><span>₱{approvalCalc.emi.toLocaleString()}</span></div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleApprove}>Approve</button>
                  <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleReject(selected.id)}>Reject</button>
                </div>
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
              onClick={() => openApprove(loan)}>
              <div className="order-card-header">
                <span className="order-id">{loan.borrower_name}</span>
                <span className={`order-status status-${loan.status === 'approved' ? 'ready' : loan.status === 'paid' ? 'delivered' : loan.status === 'rejected' ? 'cancelled' : 'pending'}`}>{loan.status}</span>
              </div>
              <div className="order-card-items">
                ₱{loan.amount?.toLocaleString()} | {loan.frequency || loan.interest_type || '—'}
              </div>
              <div className="order-card-footer">
                <span className="order-total">{loan.status === 'approved' ? `₱${loan.total_payable?.toLocaleString()}` : '—'}</span>
                <span className="order-date">{new Date(loan.applied_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
