const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

let supabaseConfig = {
  supabaseUrl: process.env.SUPABASE_URL || '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
}
const SUPABASE_CONFIG_PATH = path.join(__dirname, 'supabase-config.json')
try {
  if (fs.existsSync(SUPABASE_CONFIG_PATH)) {
    const fileConfig = JSON.parse(fs.readFileSync(SUPABASE_CONFIG_PATH, 'utf-8'))
    supabaseConfig.supabaseUrl = supabaseConfig.supabaseUrl || fileConfig.supabaseUrl || ''
    supabaseConfig.serviceRoleKey = supabaseConfig.serviceRoleKey || fileConfig.serviceRoleKey || ''
  }
} catch {}

const app = express();
const PORT = process.env.PORT || 3001;
const LOAN_DB_PATH = path.join(__dirname, 'data', 'loans.json');

app.use(cors());
app.use(express.json());

function readLoanDB() {
  try { return JSON.parse(fs.readFileSync(LOAN_DB_PATH, 'utf-8')) }
  catch { return { loan_products: [], loans: [], loan_payments: [], _borrower_profiles: [] } }
}

function writeLoanDB(data) {
  fs.writeFileSync(LOAN_DB_PATH, JSON.stringify(data, null, 2))
}

// === Loan Products ===

app.get('/api/loan/products', (req, res) => {
  const db = readLoanDB();
  const { all } = req.query;
  if (all === 'true') return res.json(db.loan_products);
  res.json(db.loan_products.filter(p => p.is_active));
});

app.post('/api/loan/products', (req, res) => {
  const db = readLoanDB();
  const product = { id: Date.now(), ...req.body, is_active: true };
  db.loan_products.push(product);
  writeLoanDB(db);
  res.status(201).json(product);
});

app.put('/api/loan/products/:id', (req, res) => {
  const db = readLoanDB();
  const idx = db.loan_products.findIndex(p => p.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  db.loan_products[idx] = { ...db.loan_products[idx], ...req.body };
  writeLoanDB(db);
  res.json(db.loan_products[idx]);
});

app.delete('/api/loan/products/:id', (req, res) => {
  const db = readLoanDB();
  db.loan_products = db.loan_products.filter(p => p.id !== parseInt(req.params.id));
  writeLoanDB(db);
  res.json({ success: true });
});

// === Loans ===

app.get('/api/loans', (req, res) => {
  const db = readLoanDB();
  const { borrowerId, status } = req.query;
  let loans = [...db.loans];
  if (borrowerId) loans = loans.filter(l => l.borrower_id === borrowerId);
  if (status) loans = loans.filter(l => l.status === status);
  loans.sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at));
  res.json(loans);
});

app.get('/api/loans/stats', (req, res) => {
  const db = readLoanDB();
  const loans = db.loans;
  res.json({
    total_loans: loans.length,
    pending: loans.filter(l => l.status === 'pending').length,
    approved: loans.filter(l => l.status === 'approved').length,
    rejected: loans.filter(l => l.status === 'rejected').length,
    paid: loans.filter(l => l.status === 'paid').length,
    total_disbursed: loans.filter(l => l.status === 'approved' || l.status === 'paid').reduce((s, l) => s + l.amount, 0),
    total_repaid: loans.filter(l => l.status === 'paid').reduce((s, l) => s + l.total_payable, 0),
    total_interest: loans.filter(l => l.status === 'paid').reduce((s, l) => s + l.total_interest, 0),
    active_borrowers: new Set(loans.filter(l => l.status === 'approved' || l.status === 'pending').map(l => l.borrower_id)).size,
    total_borrowers: new Set(loans.map(l => l.borrower_id)).size,
  });
});

app.get('/api/loans/borrower-stats/:borrowerId', (req, res) => {
  const db = readLoanDB();
  const borrowerLoans = db.loans.filter(l => l.borrower_id === req.params.borrowerId);
  res.json({
    total: borrowerLoans.length,
    active: borrowerLoans.filter(l => l.status === 'approved').length,
    paid: borrowerLoans.filter(l => l.status === 'paid').length,
    pending: borrowerLoans.filter(l => l.status === 'pending').length,
    total_borrowed: borrowerLoans.reduce((s, l) => s + l.amount, 0),
    total_payable: borrowerLoans.reduce((s, l) => s + l.total_payable, 0),
    outstanding: borrowerLoans.filter(l => l.status === 'approved').reduce((s, l) => s + (l.total_payable - (l.paid_amount || 0)), 0),
  });
});

app.post('/api/loans', (req, res) => {
  const db = readLoanDB();
  const { borrower_id, borrower_name, product_id, amount, days, interest_rate, interest_type } = req.body;

  let total_interest;
  if (interest_type === 'daily') total_interest = amount * (interest_rate / 100) * days;
  else if (interest_type === 'weekly') total_interest = amount * (interest_rate / 100) * Math.ceil(days / 7);
  else if (interest_type === 'monthly') total_interest = amount * (interest_rate / 100) * Math.ceil(days / 30);
  else total_interest = 0;

  const total_payable = amount + total_interest;

  const loan = {
    id: `LN-${String(db.loans.length + 1).padStart(4, '0')}`,
    borrower_id,
    borrower_name,
    product_id,
    amount: parseFloat(amount),
    days: parseInt(days),
    interest_rate: parseFloat(interest_rate),
    interest_type,
    total_interest: parseFloat(total_interest.toFixed(2)),
    total_payable: parseFloat(total_payable.toFixed(2)),
    paid_amount: 0,
    status: 'pending',
    applied_at: new Date().toISOString(),
    approved_at: null,
    approved_by: null,
    rejected_reason: '',
    paid_at: null,
    notes: '',
    payments: [],
  };
  db.loans.push(loan);
  writeLoanDB(db);
  res.status(201).json(loan);
});

app.put('/api/loans/:id', (req, res) => {
  const db = readLoanDB();
  const idx = db.loans.findIndex(l => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Loan not found' });
  db.loans[idx] = { ...db.loans[idx], ...req.body };
  writeLoanDB(db);
  res.json(db.loans[idx]);
});

app.post('/api/loans/:id/approve', (req, res) => {
  const db = readLoanDB();
  const idx = db.loans.findIndex(l => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Loan not found' });
  db.loans[idx].status = 'approved';
  db.loans[idx].approved_at = new Date().toISOString();
  db.loans[idx].approved_by = req.body.approved_by || '';
  writeLoanDB(db);
  res.json(db.loans[idx]);
});

app.post('/api/loans/:id/reject', (req, res) => {
  const db = readLoanDB();
  const idx = db.loans.findIndex(l => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Loan not found' });
  db.loans[idx].status = 'rejected';
  db.loans[idx].rejected_reason = req.body.reason || '';
  writeLoanDB(db);
  res.json(db.loans[idx]);
});

app.post('/api/loans/:id/pay', (req, res) => {
  const db = readLoanDB();
  const idx = db.loans.findIndex(l => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Loan not found' });
  const loan = db.loans[idx];
  const paymentAmount = parseFloat(req.body.amount) || loan.total_payable;
  loan.paid_amount = (loan.paid_amount || 0) + paymentAmount;

  if (!loan.payments) loan.payments = [];
  loan.payments.push({
    id: Date.now(),
    amount: paymentAmount,
    date: new Date().toISOString(),
    note: req.body.note || '',
  });

  if (loan.paid_amount >= loan.total_payable) {
    loan.status = 'paid';
    loan.paid_at = new Date().toISOString();
  }
  writeLoanDB(db);
  res.json(loan);
});

// === Local Auth (fallback when Supabase is unavailable) ===

app.post('/api/register', (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, and password required' });
  const db = readLoanDB();
  if (!db._borrower_profiles) db._borrower_profiles = [];
  if (db._borrower_profiles.find(p => p.email === email)) return res.status(400).json({ error: 'Email already registered' });
  const newUser = {
    id: `local-${Date.now()}`,
    name, email, password,
    phone: phone || '',
    role: 'borrower',
    is_active: true,
    address: '', id_type: '', id_number: '', bank_name: '', bank_account: '', qr_data: '',
    created_at: new Date().toISOString(),
  };
  db._borrower_profiles.push(newUser);
  writeLoanDB(db);
  const { password: _, ...safeUser } = newUser;
  res.status(201).json({ user: safeUser, token: `token-${newUser.id}-${Date.now()}` });
});

app.post('/api/login-local', (req, res) => {
  const { email, password } = req.body;
  const db = readLoanDB();
  const profiles = db._borrower_profiles || [];
  const user = profiles.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (!user.is_active) return res.status(403).json({ error: 'inactive' });
  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser, token: `token-${user.id}-${Date.now()}` });
});

app.get('/api/profile/:id', (req, res) => {
  const db = readLoanDB();
  const profiles = db._borrower_profiles || [];
  const user = profiles.find(p => p.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Profile not found' });
  const { password: _, ...safeUser } = user;
  safeUser.total_loans = db.loans.filter(l => l.borrower_id === user.id).length;
  safeUser.active_loans = db.loans.filter(l => l.borrower_id === user.id && l.status === 'approved').length;
  res.json(safeUser);
});

// === Borrowers (admin view) ===

app.get('/api/borrowers', async (req, res) => {
  let profiles = [];
  if (supabaseConfig.supabaseUrl && supabaseConfig.serviceRoleKey) {
    try {
      const headers = { Authorization: `Bearer ${supabaseConfig.serviceRoleKey}`, apikey: supabaseConfig.serviceRoleKey }
      const r = await axios.get(
        `${supabaseConfig.supabaseUrl}/rest/v1/profiles?role=eq.borrower&select=*`,
        { headers }
      )
      profiles = r.data || []
    } catch {}
  }
  if (profiles.length === 0) {
    const db = readLoanDB();
    profiles = db._borrower_profiles || [];
  }
  const db = readLoanDB();
  const borrowers = profiles.map(p => ({
    ...p,
    total_loans: db.loans.filter(l => l.borrower_id === p.id).length,
    active_loans: db.loans.filter(l => l.borrower_id === p.id && l.status === 'approved').length,
    total_borrowed: db.loans.filter(l => l.borrower_id === p.id).reduce((s, l) => s + l.amount, 0),
  }))
  res.json(borrowers)
});

app.put('/api/borrowers/:id/kyc', async (req, res) => {
  let updated = { ...req.body, id: req.params.id };
  if (supabaseConfig.supabaseUrl && supabaseConfig.serviceRoleKey) {
    try {
      const headers = { Authorization: `Bearer ${supabaseConfig.serviceRoleKey}`, apikey: supabaseConfig.serviceRoleKey, 'Content-Type': 'application/json', Prefer: 'return=representation' }
      const r = await axios.patch(
        `${supabaseConfig.supabaseUrl}/rest/v1/profiles?id=eq.${req.params.id}`,
        req.body,
        { headers }
      )
      if (r.data?.[0]) updated = r.data[0];
    } catch {}
  }
  const db = readLoanDB();
  if (!db._borrower_profiles) db._borrower_profiles = [];
  const idx = db._borrower_profiles.findIndex(p => p.id === req.params.id);
  if (idx !== -1) {
    db._borrower_profiles[idx] = { ...db._borrower_profiles[idx], ...req.body };
  } else {
    db._borrower_profiles.push({ id: req.params.id, ...req.body });
  }
  writeLoanDB(db);
  res.json(updated)
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Loan API running on http://0.0.0.0:${PORT}`);
});
