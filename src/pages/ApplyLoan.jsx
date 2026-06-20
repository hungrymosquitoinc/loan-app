import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLoan } from '../contexts/LoanContext'

export default function ApplyLoan() {
  const { user } = useAuth()
  const { getLoanProducts, applyLoan } = useLoan()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState('daily')
  const [numPayments, setNumPayments] = useState('')
  const [purpose, setPurpose] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    try {
      const data = await getLoanProducts()
      setProducts(data)
      if (data.length > 0) setSelectedProduct(data[0])
    } catch {}
    setLoading(false)
  }

  function getSelectedRate() {
    if (!selectedProduct) return 0
    if (frequency === 'daily') return selectedProduct.daily_rate || 0
    if (frequency === 'weekly') return selectedProduct.weekly_rate || 0
    return selectedProduct.monthly_rate || 0
  }

  function getCalculations() {
    if (!selectedProduct || !amount || !numPayments) return null
    const principal = parseFloat(amount)
    const payments = parseInt(numPayments)
    if (isNaN(principal) || isNaN(payments) || payments < 1) return null
    const rate = getSelectedRate()
    const days = selectedProduct.days
    let totalInterest
    if (frequency === 'daily') totalInterest = principal * (rate / 100) * days
    else if (frequency === 'weekly') totalInterest = principal * (rate / 100) * Math.ceil(days / 7)
    else totalInterest = principal * (rate / 100) * Math.ceil(days / 30)
    totalInterest = parseFloat(totalInterest.toFixed(2))
    const totalPayable = principal + totalInterest
    const emi = parseFloat((totalPayable / payments).toFixed(2))
    return { totalInterest, totalPayable, emi, rate, payments }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!selectedProduct) return setError('Select a loan product')
    if (!amount || parseFloat(amount) < selectedProduct.min_amount || parseFloat(amount) > selectedProduct.max_amount)
      return setError(`Amount must be between ₱${selectedProduct.min_amount?.toLocaleString()} and ₱${selectedProduct.max_amount?.toLocaleString()}`)
    setSubmitting(true)
    try {
      const calc = getCalculations()
      await applyLoan({
        borrower_id: user.id,
        borrower_name: user.name,
        product_id: selectedProduct.id,
        amount: parseFloat(amount),
        days: selectedProduct.days,
        interest_rate: getSelectedRate(),
        interest_type: frequency,
        frequency,
        num_payments: parseInt(numPayments),
        purpose,
        emi: calc?.emi || 0,
        total_payable: calc?.totalPayable || 0,
      })
      navigate('/my-loans')
    } catch (e) {
      setError(e.message || 'Application failed')
    }
    setSubmitting(false)
  }

  if (loading) return <div className="page-loading">Loading...</div>
  const calc = getCalculations()

  return (
    <div className="borrower-page">
      <h1>Apply for Loan</h1>
      {error && <div className="alert alert-error">{error}</div>}

      {products.length === 0 ? (
        <div className="empty-state"><span className="empty-icon">📋</span><h2>No loan products available</h2><p>Check back later</p></div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Loan Product</label>
            <select value={selectedProduct?.id || ''} onChange={e => setSelectedProduct(products.find(p => p.id === parseInt(e.target.value)))}>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Loan Amount (₱)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min={selectedProduct?.min_amount || 0} max={selectedProduct?.max_amount || 999999} placeholder="Enter amount" required />
          </div>

          {selectedProduct && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ background: '#e3f2fd', padding: '2px 8px', borderRadius: 4 }}>Daily: {selectedProduct.daily_rate || 0}%</span>
              <span style={{ background: '#e3f2fd', padding: '2px 8px', borderRadius: 4 }}>Weekly: {selectedProduct.weekly_rate || 0}%</span>
              <span style={{ background: '#e3f2fd', padding: '2px 8px', borderRadius: 4 }}>Monthly: {selectedProduct.monthly_rate || 0}%</span>
            </div>
          )}

          <div className="form-group">
            <label>Repayment Frequency</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['daily', 'weekly', 'monthly'].map(f => {
                const rate = selectedProduct ? (f === 'daily' ? selectedProduct.daily_rate : f === 'weekly' ? selectedProduct.weekly_rate : selectedProduct.monthly_rate) : 0
                return (
                  <button key={f} type="button"
                    style={{ flex: 1, padding: '10px 4px', borderRadius: 8, border: `2px solid ${frequency === f ? 'var(--primary)' : 'var(--border)'}`, background: frequency === f ? 'var(--primary)' : 'transparent', color: frequency === f ? '#fff' : 'inherit', cursor: 'pointer', fontSize: '0.78rem', textAlign: 'center' }}
                    onClick={() => setFrequency(f)}>
                    <div style={{ fontWeight: 700 }}>{f.charAt(0).toUpperCase() + f.slice(1)}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>{rate || 0}%</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="form-group">
            <label>Number of Payments (installments)</label>
            <input type="number" min="1" value={numPayments} onChange={e => setNumPayments(e.target.value)} placeholder="e.g. 4" required />
          </div>

          <div className="form-group">
            <label>Purpose of Loan</label>
            <textarea value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g. Business capital, emergency, etc." rows={3} />
          </div>

          {calc && (
            <div className="checkout-section">
              <h2>Loan Summary</h2>
              <div className="checkout-items">
                <div className="checkout-item"><span>Principal</span><span>₱{parseFloat(amount).toLocaleString()}</span></div>
                <div className="checkout-item"><span>Interest ({frequency} @ {calc.rate}%)</span><span>₱{calc.totalInterest.toLocaleString()}</span></div>
                <div className="checkout-item"><span>Total Payable</span><span>₱{calc.totalPayable.toLocaleString()}</span></div>
                <div className="checkout-item"><span>EMI ({calc.payments} payments)</span><span style={{ fontWeight: 700, color: 'var(--primary)' }}>₱{calc.emi.toLocaleString()}</span></div>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      )}
    </div>
  )
}
