import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLoan } from '../contexts/LoanContext'

export default function MyLoans() {
  const { user } = useAuth()
  const { getLoans } = useLoan()
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

      <div className="tab-bar" style={{ display: 'flex', gap: 0, marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={tab === t.key ? 'active' : ''}
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
              <div className="checkout-item"><span>Total Payable</span><span style={{ color: 'var(--primary)', fontWeight: 700 }}>₱{selected.total_payable?.toLocaleString()}</span></div>
              <div className="checkout-item"><span>EMI</span><span style={{ color: 'var(--primary)', fontWeight: 700 }}>₱{selected.emi?.toLocaleString() || '—'}</span></div>
              <div className="checkout-item"><span>Payments Made</span><span>{(selected.payments?.length || 0)} / {selected.num_payments || 0}</span></div>
              <div className="checkout-item"><span>Paid</span><span style={{ color: '#4caf50', fontWeight: 700 }}>₱{(selected.paid_amount || 0).toLocaleString()}</span></div>
              <div className="checkout-item"><span>Remaining</span><span style={{ color: '#f44336', fontWeight: 700 }}>₱{Math.max(0, (selected.total_payable || 0) - (selected.paid_amount || 0)).toLocaleString()}</span></div>
              <div className="checkout-item"><span>Status</span><span className={`order-status status-${selected.status === 'approved' ? 'ready' : selected.status === 'paid' ? 'delivered' : selected.status === 'rejected' ? 'cancelled' : 'pending'}`}>{selected.status}</span></div>
              <div className="checkout-item"><span>Purpose</span><span>{selected.purpose || '—'}</span></div>
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
                const matched = payments.filter(p => toLocalStr(new Date(p.date)) === dateStr)
                const totalDay = matched.reduce((s, p) => s + (Number(p.amount) || 0), 0)
                schedule.push({ date: d, paid: matched.length > 0, amount: totalDay })
              }
              const today = toLocalStr(new Date())
              const daysPassed = schedule.filter(s => toLocalStr(s.date) <= today).length
              return schedule.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h3>Payment Schedule ({daysPassed} / {totalSlots})</h3>
                  {schedule.map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                      <span style={{ color: s.paid ? 'inherit' : '#f44336', fontWeight: s.paid ? 400 : 600 }}>
                        {i + 1}. {s.date.toLocaleDateString()}
                      </span>
                      <span style={{ fontWeight: 600, color: s.paid ? '#4caf50' : '#f44336' }}>
                        {s.paid ? `₱${(s.amount || emi).toLocaleString()}` : '\u00A0'}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })()}
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
                <span className="order-date">{loan.payments?.length || 0}/{loan.num_payments || 0} payments</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
