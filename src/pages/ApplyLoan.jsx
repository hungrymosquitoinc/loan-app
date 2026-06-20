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
  const [frequency, setFrequency] = useState('daily')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [])

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

  function getCalculatedInterest() {
    if (!selectedProduct || !amount) return null
    const principal = parseFloat(amount)
    if (isNaN(principal)) return null
    const rate = getSelectedRate()
    const days = selectedProduct.days
    let interest
    if (frequency === 'daily') interest = principal * (rate / 100) * days
    else if (frequency === 'weekly') interest = principal * (rate / 100) * Math.ceil(days / 7)
    else interest = principal * (rate / 100) * Math.ceil(days / 30)
    return { interest: parseFloat(interest.toFixed(2)), total: principal + parseFloat(interest.toFixed(2)), rate }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!selectedProduct) return setError('Select a loan product')
    if (!amount || parseFloat(amount) < selectedProduct.min_amount || parseFloat(amount) > selectedProduct.max_amount) {
      return setError(`Amount must be between ₱${selectedProduct.min_amount?.toLocaleString()} and ₱${selectedProduct.max_amount?.toLocaleString()}`)
    }
    setSubmitting(true)
    try {
      await applyLoan({
        borrower_id: user.id,
        borrower_name: user.name,
        product_id: selectedProduct.id,
        amount: parseFloat(amount),
        days: selectedProduct.days,
        interest_rate: getSelectedRate(),
        interest_type: frequency,
        frequency,
      })
      navigate('/my-loans')
    } catch (e) {
      setError(e.message || 'Application failed')
    }
    setSubmitting(false)
  }

  if (loading) return <div className="page-loading">Loading...</div>

  const calc = getCalculatedInterest()

  return (
    <div className="borrower-page">
      <h1>Apply for Loan</h1>
      {error && <div className="alert alert-error">{error}</div>}

      {products.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <h2>No loan products available</h2>
          <p>Check back later for available loan products</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Select Loan Product</label>
            <select value={selectedProduct?.id || ''} onChange={e => setSelectedProduct(products.find(p => p.id === parseInt(e.target.value)))}>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="checkout-section">
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {selectedProduct.description}<br />
                <strong>Term:</strong> {selectedProduct.days} days | <strong>Range:</strong> ₱{selectedProduct.min_amount?.toLocaleString()} - ₱{selectedProduct.max_amount?.toLocaleString()}
              </p>
              <div style={{ marginTop: 8, fontSize: '0.85rem', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ background: '#e3f2fd', padding: '2px 8px', borderRadius: 4 }}>Daily: {selectedProduct.daily_rate || 0}%</span>
                <span style={{ background: '#e3f2fd', padding: '2px 8px', borderRadius: 4 }}>Weekly: {selectedProduct.weekly_rate || 0}%</span>
                <span style={{ background: '#e3f2fd', padding: '2px 8px', borderRadius: 4 }}>Monthly: {selectedProduct.monthly_rate || 0}%</span>
              </div>
            </div>
          )}

          {user && (!user.address || !user.id_type) && (
            <div className="checkout-section" style={{ background: '#fff3e0', border: '1px solid #ff9800' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#e65100' }}>
                ⚠️ Complete your <a href="/#/kyc" style={{ color: '#e65100', fontWeight: 700 }}>KYC profile</a> to apply for loans
              </p>
            </div>
          )}

          <div className="form-group">
            <label>Repayment Frequency</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['daily', 'weekly', 'monthly'].map(f => {
                const rate = selectedProduct ? (f === 'daily' ? selectedProduct.daily_rate : f === 'weekly' ? selectedProduct.weekly_rate : selectedProduct.monthly_rate) : 0
                return (
                  <button key={f} type="button"
                    style={{
                      flex: 1, padding: '10px 8px', borderRadius: 8, border: `2px solid ${frequency === f ? 'var(--primary)' : 'var(--border)'}`,
                      background: frequency === f ? 'var(--primary)' : 'transparent',
                      color: frequency === f ? '#fff' : 'inherit',
                      cursor: 'pointer', fontSize: '0.8rem', textAlign: 'center',
                    }}
                    onClick={() => setFrequency(f)}>
                    <div style={{ fontWeight: 700 }}>{f.charAt(0).toUpperCase() + f.slice(1)}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{rate || 0}%</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="form-group">
            <label>Loan Amount (₱)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min={selectedProduct?.min_amount || 0} max={selectedProduct?.max_amount || 999999} placeholder="Enter amount" required />
          </div>

          {calc && (
            <div className="checkout-section">
              <h2>Loan Summary</h2>
              <div className="checkout-items">
                <div className="checkout-item"><span>Principal</span><span>₱{parseFloat(amount).toLocaleString()}</span></div>
                <div className="checkout-item"><span>Interest ({frequency}, {selectedProduct.days} days @ {calc.rate}%)</span><span>₱{calc.interest.toLocaleString()}</span></div>
              </div>
              <div className="checkout-total" style={{ marginTop: 10, paddingTop: 10, borderTop: '2px solid var(--primary)' }}>
                <strong>Total Payable</strong>
                <strong style={{ color: 'var(--primary)', fontSize: '1.3rem' }}>₱{calc.total.toLocaleString()}</strong>
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
