import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLoan } from '../contexts/LoanContext'

export default function BorrowerDashboard() {
  const { user } = useAuth()
  const { getLoans, getBorrowerStats } = useLoan()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [recentLoans, setRecentLoans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    try {
      const [loansData, statsData] = await Promise.all([
        getLoans({ borrowerId: user.id }),
        getBorrowerStats(user.id),
      ])
      setRecentLoans(loansData.slice(0, 5))
      setStats(statsData)
    } catch {}
    setLoading(false)
  }

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="borrower-page">
      <div className="hero" style={{ background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)', padding: '28px 20px' }}>
        <div className="hero-content">
          <div className="hero-badge">Welcome</div>
          <h1 style={{ fontSize: '1.6rem' }}>Hello, {user?.name || 'Borrower'}</h1>
          <p style={{ fontSize: '0.9rem', opacity: 0.85 }}>Manage your loans and applications</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, margin: '18px 0' }}>
        <Link to="/apply-loan" className="btn btn-primary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>Apply for Loan</Link>
        <Link to="/my-loans" className="btn" style={{ flex: 1, textAlign: 'center', textDecoration: 'none', border: '2px solid var(--primary)', color: 'var(--primary)' }}>My Loans</Link>
      </div>

      {stats && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="stat-card" style={{ borderTopColor: '#1565c0' }}>
            <span className="stat-value">{stats.active}</span>
            <span className="stat-label">Active</span>
          </div>
          <div className="stat-card" style={{ borderTopColor: '#4caf50' }}>
            <span className="stat-value">₱{stats.total_borrowed?.toLocaleString()}</span>
            <span className="stat-label">Borrowed</span>
          </div>
          <div className="stat-card" style={{ borderTopColor: '#ff9800' }}>
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Loans</span>
          </div>
          <div className="stat-card" style={{ borderTopColor: '#9c27b0' }}>
            <span className="stat-value">₱{stats.total_payable?.toLocaleString()}</span>
            <span className="stat-label">Payable</span>
          </div>
          <div className="stat-card" style={{ borderTopColor: '#4caf50' }}>
            <span className="stat-value">{stats.paid}</span>
            <span className="stat-label">Paid</span>
          </div>
          <div className="stat-card" style={{ borderTopColor: '#f44336' }}>
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
      )}

      <section style={{ marginTop: 24 }}>
        <div className="section-header">
          <h2>Recent Loans</h2>
          <Link to="/my-loans" className="section-link">View All</Link>
        </div>
        {recentLoans.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <span className="empty-icon">📋</span>
            <h2>No loans yet</h2>
            <p>Apply for your first loan today</p>
            <Link to="/apply-loan" className="btn btn-primary">Apply Now</Link>
          </div>
        ) : (
          <div className="orders-list">
            {recentLoans.map(loan => (
              <div key={loan.id} className="order-card" style={{ cursor: 'pointer', borderLeftColor: loan.status === 'approved' ? '#4caf50' : loan.status === 'paid' ? '#2196f3' : loan.status === 'rejected' ? '#f44336' : '#ff9800' }}
                onClick={() => navigate(`/my-loans/${loan.id}`)}>
                <div className="order-card-header">
                  <span className="order-id">{loan.id}</span>
                  <span className={`order-status status-${loan.status === 'approved' ? 'ready' : loan.status === 'paid' ? 'delivered' : loan.status === 'rejected' ? 'cancelled' : 'pending'}`}>{loan.status}</span>
                </div>
                <div className="order-card-items">
                  Amount: ₱{loan.amount?.toLocaleString()} | Payable: ₱{loan.total_payable?.toLocaleString()}
                </div>
                <div className="order-card-footer">
                  <span className="order-total">{loan.interest_type} - {loan.interest_rate}%</span>
                  <span className="order-date">{new Date(loan.applied_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
