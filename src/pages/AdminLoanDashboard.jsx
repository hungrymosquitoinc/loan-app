import { useState, useEffect } from 'react'
import { useLoan } from '../contexts/LoanContext'

export default function AdminLoanDashboard() {
  const { getLoanStats, getLoans, getBorrowers } = useLoan()
  const [stats, setStats] = useState(null)
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
      setBorrowers(borrowersData)
    } catch {}
    setLoading(false)
  }

  const pendingKyc = borrowers.filter(b => b.id_type && b.id_number && !b.kyc_status).length
  const pendingLoans = stats?.pending || 0
  const totalBorrowers = stats?.total_borrowers || borrowers.length || 0
  const activeLoans = stats?.approved || 0

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
      </div>
    </div>
  )
}
