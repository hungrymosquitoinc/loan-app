import { useState, useEffect } from 'react'
import { useLoan } from '../contexts/LoanContext'

const INTEREST_TYPES = ['daily', 'weekly', 'monthly']

export default function AdminLoanProducts() {
  const { getLoanProducts, createProduct, updateProduct, deleteProduct } = useLoan()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', interest_type: 'daily', interest_rate: '', days: '', min_amount: '', max_amount: '' })

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    try {
      const data = await getLoanProducts(true)
      setProducts(data)
    } catch {}
    setLoading(false)
  }

  function resetForm() {
    setForm({ name: '', description: '', interest_type: 'daily', interest_rate: '', days: '', min_amount: '', max_amount: '' })
    setEditing(null)
    setShowForm(false)
  }

  function editProduct(p) {
    setForm({ name: p.name, description: p.description || '', interest_type: p.interest_type, interest_rate: String(p.interest_rate), days: String(p.days), min_amount: String(p.min_amount || ''), max_amount: String(p.max_amount || '') })
    setEditing(p)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const data = {
      name: form.name,
      description: form.description,
      interest_type: form.interest_type,
      interest_rate: parseFloat(form.interest_rate),
      days: parseInt(form.days),
      min_amount: parseFloat(form.min_amount || 0),
      max_amount: parseFloat(form.max_amount || 999999.99),
    }
    try {
      if (editing) {
        await updateProduct(editing.id, data)
      } else {
        await createProduct(data)
      }
      resetForm()
      await loadProducts()
    } catch {}
  }

  async function handleDelete(id) {
    if (!confirm('Delete this product?')) return
    try {
      await deleteProduct(id)
      await loadProducts()
    } catch {}
  }

  async function toggleActive(product) {
    try {
      await updateProduct(product.id, { is_active: !product.is_active })
      await loadProducts()
    } catch {}
  }

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="admin-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h1 style={{ margin: 0 }}>Loan Products</h1>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true) }}>+ Add Product</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => resetForm()}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editing ? 'Edit Product' : 'New Loan Product'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Product Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Quick Loan" required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Product description" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Interest Type</label>
                  <select value={form.interest_type} onChange={e => setForm({ ...form, interest_type: e.target.value })}>
                    {INTEREST_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Interest Rate (%)</label>
                  <input type="number" step="0.01" value={form.interest_rate} onChange={e => setForm({ ...form, interest_rate: e.target.value })} placeholder="5" required />
                </div>
              </div>
              <div className="form-group">
                <label>Number of Days</label>
                <input type="number" value={form.days} onChange={e => setForm({ ...form, days: e.target.value })} placeholder="30" required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Min Amount (₱)</label>
                  <input type="number" value={form.min_amount} onChange={e => setForm({ ...form, min_amount: e.target.value })} placeholder="1000" />
                </div>
                <div className="form-group">
                  <label>Max Amount (₱)</label>
                  <input type="number" value={form.max_amount} onChange={e => setForm({ ...form, max_amount: e.target.value })} placeholder="50000" />
                </div>
              </div>
              <div className="form-row" style={{ gap: 8 }}>
                <button type="button" className="btn btn-block" onClick={resetForm}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-block">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📦</span>
          <h2>No loan products</h2>
          <p>Create your first loan product to get started</p>
        </div>
      ) : (
        <div className="admin-menu-list">
          {products.map(p => (
            <div key={p.id} className="admin-menu-item">
              <div className="admin-menu-info">
                <div>
                  <strong>{p.name}</strong>
                  <div className="menu-item-desc">{p.description || `${p.interest_type} @ ${p.interest_rate}% | ${p.days} days`}</div>
                  <div className="menu-item-desc">
                    ₱{p.min_amount?.toLocaleString()} - ₱{p.max_amount?.toLocaleString()} | <span className="menu-item-price">{p.interest_type} @ {p.interest_rate}%</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <label className="toggle-switch" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={p.is_active} onChange={() => toggleActive(p)} />
                  <span className="toggle-slider">{p.is_active ? 'Active' : 'Inactive'}</span>
                </label>
                <button className="btn btn-sm" onClick={() => editProduct(p)}>✏️</button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
