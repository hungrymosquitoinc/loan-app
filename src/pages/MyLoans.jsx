import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLoan } from '../contexts/LoanContext'

const STATUS_FILTERS = ['all', 'pending', 'approved', 'paid', 'rejected']

export default function MyLoans() {
  const { user } = useAuth()
  const { getLoans } = useLoan()
  const navigate = useNavigate()
  const [loans, setLoans] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadLoans()
  }, [user])

  async function loadLoans() {
    try {
      const data = await getLoans({ borrowerId: user.id })
      setLoans(data)
    } catch {}
    setLoading(false)
  }

  const filtered = filter === 'all' ? loans : loans.filter(l => l.status === filter)

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="borrower-page">
      <h1>My Loans</h1>

      <div className="category-tabs" style={{ marginBottom: 18 }}>
        {STATUS_FILTERS.map(f => (
          <button key={f} className={`cat-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <h2>No loans found</h2>
          <p>{filter === 'all' ? 'You have not applied for any loans yet' : `No ${filter} loans`}</p>
        </div>
      ) : (
        <div className="orders-list">
          {filtered.map(loan => (
            <div key={loan.id} className="order-card" style={{
              cursor: 'pointer',
              borderLeftColor: loan.status === 'approved' ? '#4caf50' : loan.status === 'paid' ? '#2196f3' : loan.status === 'rejected' ? '#f44336' : '#ff9800',
            }} onClick={() => navigate(`/my-loans/${loan.id}`)}>
              <div className="order-card-header">
                <span className="order-id">{loan.id}</span>
                <span className={`order-status status-${loan.status === 'approved' ? 'ready' : loan.status === 'paid' ? 'delivered' : loan.status === 'rejected' ? 'cancelled' : 'pending'}`}>
                  {loan.status}
                </span>
              </div>
              <div className="order-card-items">
                <strong>Amount:</strong> ₱{loan.amount?.toLocaleString()} |
                <strong> Payable:</strong> ₱{loan.total_payable?.toLocaleString()} |
                <strong> Paid:</strong> ₱{(loan.paid_amount || 0)?.toLocaleString()}
              </div>
              <div className="order-card-footer">
                <span className="order-total">{loan.interest_type} @ {loan.interest_rate}% | {loan.days} days</span>
                <span className="order-date">{new Date(loan.applied_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
