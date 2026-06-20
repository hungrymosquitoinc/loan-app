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

  function getCalculatedInterest() {
    if (!selectedProduct || !amount) return null
    const principal = parseFloat(amount)
    if (isNaN(principal)) return null
    const p = selectedProduct
    let interest
    if (p.interest_type === 'daily') interest = principal * (p.interest_rate / 100) * p.days
    else if (p.interest_type === 'weekly') interest = principal * (p.interest_rate / 100) * Math.ceil(p.days / 7)
    else interest = principal * (p.interest_rate / 100) * Math.ceil(p.days / 30)
    return { interest: parseFloat(interest.toFixed(2)), total: principal + parseFloat(interest.toFixed(2)) }
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
        interest_rate: selectedProduct.interest_rate,
        interest_type: selectedProduct.interest_type,
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
                <option key={p.id} value={p.id}>{p.name} - {p.interest_type} @ {p.interest_rate}%</option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="checkout-section">
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {selectedProduct.description}<br />
                <strong>Interest:</strong> {selectedProduct.interest_type} @ {selectedProduct.interest_rate}% | <strong>Term:</strong> {selectedProduct.days} days<br />
                <strong>Range:</strong> ₱{selectedProduct.min_amount?.toLocaleString()} - ₱{selectedProduct.max_amount?.toLocaleString()}
              </p>
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
            <label>Loan Amount (₱)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min={selectedProduct?.min_amount || 0} max={selectedProduct?.max_amount || 999999} placeholder="Enter amount" required />
          </div>

          {calc && (
            <div className="checkout-section">
              <h2>Loan Summary</h2>
              <div className="checkout-items">
                <div className="checkout-item"><span>Principal</span><span>₱{parseFloat(amount).toLocaleString()}</span></div>
                <div className="checkout-item"><span>Interest ({selectedProduct.interest_type}, {selectedProduct.days} days @ {selectedProduct.interest_rate}%)</span><span>₱{calc.interest.toLocaleString()}</span></div>
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
