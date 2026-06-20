import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLoan } from '../contexts/LoanContext'

export default function AdminLoanDashboard() {
  const { getLoanStats, getLoans } = useLoan()
  const [stats, setStats] = useState(null)
  const [recentLoans, setRecentLoans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [statsData, loansData] = await Promise.all([
        getLoanStats(),
        getLoans(),
      ])
      setStats(statsData)
      setRecentLoans(loansData.slice(0, 5))
    } catch {}
    setLoading(false)
  }

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="admin-page">
      <h1>Loan Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card" style={{ borderTopColor: '#1565c0' }}>
          <span className="stat-value">{stats?.total_loans || 0}</span>
          <span className="stat-label">Total Loans</span>
        </div>
        <div className="stat-card pending">
          <span className="stat-value">{stats?.pending || 0}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat-card ready">
          <span className="stat-value">{stats?.approved || 0}</span>
          <span className="stat-label">Approved</span>
        </div>
        <div className="stat-card completed">
          <span className="stat-value">{stats?.paid || 0}</span>
          <span className="stat-label">Paid</span>
        </div>
        <div className="stat-card" style={{ borderTopColor: '#f44336' }}>
          <span className="stat-value">{stats?.rejected || 0}</span>
          <span className="stat-label">Rejected</span>
        </div>
        <div className="stat-card revenue">
          <span className="stat-value">₱{(stats?.total_disbursed || 0)?.toLocaleString()}</span>
          <span className="stat-label">Disbursed</span>
        </div>
        <div className="stat-card" style={{ borderTopColor: '#4caf50' }}>
          <span className="stat-value">₱{(stats?.total_repaid || 0)?.toLocaleString()}</span>
          <span className="stat-label">Repaid</span>
        </div>
        <div className="stat-card" style={{ borderTopColor: '#9c27b0' }}>
          <span className="stat-value">₱{(stats?.total_interest || 0)?.toLocaleString()}</span>
          <span className="stat-label">Interest Earned</span>
        </div>
        <div className="stat-card" style={{ borderTopColor: '#ff9800' }}>
          <span className="stat-value">{stats?.active_borrowers || 0}</span>
          <span className="stat-label">Active Borrowers</span>
        </div>
      </div>

      <div className="admin-actions" style={{ marginTop: 24 }}>
        <Link to="/admin/loan-products" className="btn btn-primary" style={{ textDecoration: 'none', textAlign: 'center' }}>Manage Products</Link>
        <Link to="/admin/loan-applications" className="btn btn-secondary" style={{ textDecoration: 'none', textAlign: 'center' }}>Applications</Link>
        <Link to="/admin/borrowers" className="btn" style={{ textDecoration: 'none', textAlign: 'center', border: '2px solid var(--primary)', color: 'var(--primary)' }}>Borrowers</Link>
      </div>

      {recentLoans.length > 0 && (
        <section>
          <h2>Recent Applications</h2>
          <div className="orders-list">
            {recentLoans.map(loan => (
              <div key={loan.id} className="order-card" style={{
                borderLeftColor: loan.status === 'approved' ? '#4caf50' : loan.status === 'paid' ? '#2196f3' : loan.status === 'rejected' ? '#f44336' : '#ff9800',
              }}>
                <div className="order-card-header">
                  <span className="order-id">{loan.id}</span>
                  <span className={`order-status status-${loan.status === 'approved' ? 'ready' : loan.status === 'paid' ? 'delivered' : loan.status === 'rejected' ? 'cancelled' : 'pending'}`}>
                    {loan.status}
                  </span>
                </div>
                <div className="order-card-items">
                  <strong>{loan.borrower_name}</strong> — ₱{loan.amount?.toLocaleString()} @ {loan.interest_rate}% {loan.interest_type}
                </div>
                <div className="order-card-footer">
                  <span className="order-total">₱{loan.total_payable?.toLocaleString()}</span>
                  <span className="order-date">{new Date(loan.applied_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
