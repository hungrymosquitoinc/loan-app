import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLoan } from '../contexts/LoanContext'

export default function ApplyLoan() {
  const { user } = useAuth()
  const { applyLoan, getBorrowerStats } = useLoan()
  const navigate = useNavigate()
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState('daily')
  const PURPOSES = ['Business Capital', 'Emergency', 'Medical', 'Education', 'Home Improvement', 'Agriculture', 'Transportation', 'Personal', 'Other']
  const [purpose, setPurpose] = useState('')
  const [customPurpose, setCustomPurpose] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [existingLoan, setExistingLoan] = useState(false)

  useEffect(() => { if (user) { checkExistingLoan() } }, [user])

  async function checkExistingLoan() {
    try {
      const stats = await getBorrowerStats(user.id)
      if (stats.active > 0 || stats.pending > 0) setExistingLoan(true)
    } catch {}
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!amount || parseFloat(amount) <= 0) return setError('Enter a valid loan amount')
    if (!purpose) return setError('Select a purpose for your loan')
    if (purpose === 'Other' && !customPurpose.trim()) return setError('Please specify your purpose')
    setSubmitting(true)
    try {
      await applyLoan({
        borrower_id: user.id,
        borrower_name: user.name,
        amount: parseFloat(amount),
        frequency,
        purpose: purpose === 'Other' ? customPurpose.trim() : purpose,
      })
      navigate('/my-loans')
    } catch (e) {
      setError(e.message || 'Application failed')
    }
    setSubmitting(false)
  }

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="borrower-page">
      <h1>Apply for Loan</h1>
      {error && <div className="alert alert-error">{error}</div>}

      {user.kyc_status !== 'approved' ? (
        <div className="empty-state"><span className="empty-icon">🪪</span><h2>KYC not yet approved</h2><p>You must complete your KYC profile and have it approved by an admin before you can apply for a loan.</p><button className="btn btn-primary" onClick={() => navigate('/kyc')}>Go to KYC</button></div>
      ) : existingLoan ? (
        <div className="empty-state"><span className="empty-icon">✅</span><h2>You already have an active loan</h2><p>You can only have one active loan at a time. Wait for your current loan to be fully paid before applying again.</p><button className="btn btn-primary" onClick={() => navigate('/my-loans')}>View My Loans</button></div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Loan Amount (₱)</label>
            <input type="number" min="1" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount" required />
          </div>

          <div className="form-group">
            <label>Repayment Frequency</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['daily', 'weekly', 'monthly'].map(f => (
                <button key={f} type="button"
                  style={{ flex: 1, padding: '10px 4px', borderRadius: 8, border: `2px solid ${frequency === f ? 'var(--primary)' : 'var(--border)'}`, background: frequency === f ? 'var(--primary)' : 'transparent', color: frequency === f ? '#fff' : 'inherit', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'center' }}
                  onClick={() => setFrequency(f)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Purpose of Loan</label>
            <select value={purpose} onChange={e => setPurpose(e.target.value)} required>
              <option value="">Select a purpose</option>
              {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {purpose === 'Other' && (
            <div className="form-group">
              <label>Specify Purpose</label>
              <input type="text" value={customPurpose} onChange={e => setCustomPurpose(e.target.value)} placeholder="Enter your purpose" required />
            </div>
          )}

          <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <strong>Note:</strong> Interest rate, loan term, and number of payments will be set by the administrator upon approval.
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      )}
    </div>
  )
}
