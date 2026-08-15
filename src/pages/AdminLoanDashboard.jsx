import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLoan } from '../contexts/LoanContext'

export default function AdminLoanDashboard() {
  const { getLoanStats, getLoans, getBorrowers } = useLoan()
  const [stats, setStats] = useState(null)
  const [loans, setLoans] = useState([])
  const [borrowers, setBorrowers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [statsData, loansData, borrowersData] = await Promise.all([
        getLoanStats(),
        getLoans(),
        getBorrowers(),
      ])
      setStats(statsData)
      setLoans(loansData)
      setBorrowers(borrowersData)
    } catch {}
    setLoading(false)
  }

  const pendingKyc = borrowers.filter(b => b.id_type && b.id_number && !b.kyc_status).length
  const pendingLoans = stats?.pending || 0
  const totalBorrowers = stats?.total_borrowers || borrowers.length || 0
  const activeLoans = stats?.approved || 0
  const totalDisbursed = stats?.total_disbursed || 0
  const totalRepaid = stats?.total_repaid || 0
  const totalInterest = stats?.total_interest || 0
  const outstanding = totalDisbursed - totalRepaid
  const recentLoans = loans.slice(0, 5)

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="admin-page">
      <h1>Dashboard</h1>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="stat-card" style={{ borderTopColor: '#ff9800' }}>
          <span className="stat-value">{pendingLoans}</span>
          <span className="stat-label">Pending Loans</span>
        </div>
        <div className="stat-card" style={{ borderTopColor: '#1565c0' }}>
          <span className="stat-value">{totalBorrowers}</span>
          <span className="stat-label">Total Borrowers</span>
        </div>
        <div className="stat-card" style={{ borderTopColor: '#4caf50' }}>
          <span className="stat-value">{activeLoans}</span>
          <span className="stat-label">Active Loans</span>
        </div>
        <div className="stat-card" style={{ borderTopColor: '#9c27b0' }}>
          <span className="stat-value">{pendingKyc}</span>
          <span className="stat-label">KYC Queue</span>
        </div>
        <div className="stat-card" style={{ borderTopColor: '#2196f3' }}>
          <span className="stat-value">{stats?.total_payments || 0}</span>
          <span className="stat-label">Payments Made</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
        <div className="checkout-section" style={{ padding: 14 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Total Disbursed</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1565c0' }}>₱{totalDisbursed.toLocaleString()}</div>
        </div>
        <div className="checkout-section" style={{ padding: 14 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Total Repaid</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#4caf50' }}>₱{totalRepaid.toLocaleString()}</div>
        </div>
        <div className="checkout-section" style={{ padding: 14 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Interest Earned</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ff9800' }}>₱{totalInterest.toLocaleString()}</div>
        </div>
      </div>

      {outstanding > 0 && (
        <div className="checkout-section" style={{ padding: 14, marginTop: 12, borderLeft: '3px solid #f44336' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Outstanding Balance</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f44336' }}>₱{outstanding.toLocaleString()}</div>
        </div>
      )}

      {recentLoans.length > 0 && (
        <div className="checkout-section" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Recent Loans</h2>
            <Link to="/admin/loans" style={{ fontSize: '0.82rem', color: 'var(--primary)', textDecoration: 'none' }}>View All</Link>
          </div>
          <div className="orders-list">
            {recentLoans.map(loan => (
              <Link key={loan.id} to="/admin/loans" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="order-card" style={{ borderLeftColor: loan.status === 'approved' ? '#4caf50' : loan.status === 'paid' ? '#2196f3' : loan.status === 'rejected' ? '#f44336' : '#ff9800', cursor: 'pointer' }}>
                  <div className="order-card-header">
                    <span className="order-id">{loan.borrower_name || 'Unknown'}</span>
                    <span className={`order-status status-${loan.status === 'approved' ? 'ready' : loan.status === 'paid' ? 'delivered' : loan.status === 'rejected' ? 'cancelled' : 'pending'}`}>{loan.status}</span>
                  </div>
                  <div className="order-card-items">
                    ₱{loan.amount?.toLocaleString()} | {loan.frequency || '—'} | {loan.purpose || '—'}
                  </div>
                  <div className="order-card-footer">
                    <span className="order-total">{loan.total_payable ? `₱${loan.total_payable.toLocaleString()}` : '—'}</span>
                    <span className="order-date">{new Date(loan.applied_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 16 }}>
        <Link to="/admin/loans" className="btn btn-primary" style={{ textDecoration: 'none', textAlign: 'center' }}>Manage Loans</Link>
        <Link to="/admin/borrowers" className="btn btn-primary" style={{ textDecoration: 'none', textAlign: 'center' }}>Borrowers</Link>
        <Link to="/admin/kyc" className="btn btn-primary" style={{ textDecoration: 'none', textAlign: 'center' }}>KYC Review</Link>
      </div>
    </div>
  )
}
