import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLoan } from '../contexts/LoanContext'

const FILTERS = ['all', 'pending', 'approved', 'rejected', 'paid']

export default function AdminLoanApplications() {
  const { getLoans } = useLoan()
  const navigate = useNavigate()
  const [loans, setLoans] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLoans()
  }, [])

  async function loadLoans() {
    try {
      const data = await getLoans()
      setLoans(data)
    } catch {}
    setLoading(false)
  }

  const filtered = filter === 'all' ? loans : loans.filter(l => l.status === filter)

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="admin-page">
      <h1>Loan Applications</h1>

      <div className="category-tabs">
        {FILTERS.map(f => (
          <button key={f} className={`cat-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <h2>No applications</h2>
          <p>No {filter === 'all' ? '' : filter} loan applications found</p>
        </div>
      ) : (
        <div className="orders-list">
          {filtered.map(loan => (
            <div key={loan.id} className="order-card" style={{ cursor: 'pointer', borderLeftColor: loan.status === 'approved' ? '#4caf50' : loan.status === 'paid' ? '#2196f3' : loan.status === 'rejected' ? '#f44336' : '#ff9800' }}
              onClick={() => navigate(`/my-loans/${loan.id}`)}>
              <div className="order-card-header">
                <div>
                  <span className="order-id">{loan.id}</span>
                  <span style={{ marginLeft: 8, fontSize: '0.85rem', fontWeight: 600 }}>{loan.borrower_name}</span>
                </div>
                <span className={`order-status status-${loan.status === 'approved' ? 'ready' : loan.status === 'paid' ? 'delivered' : loan.status === 'rejected' ? 'cancelled' : 'pending'}`}>
                  {loan.status}
                </span>
              </div>
              <div className="order-card-items">
                <strong>Amount:</strong> ₱{loan.amount?.toLocaleString()} |
                <strong> Payable:</strong> ₱{loan.total_payable?.toLocaleString()} |
                <strong> Term:</strong> {loan.days} days
              </div>
              <div className="order-card-footer">
                <span className="order-total">{loan.interest_type} @ {loan.interest_rate}%</span>
                <span className="order-date">{new Date(loan.applied_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
