const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

let supabaseConfig = {
  supabaseUrl: process.env.SUPABASE_URL || '',
  publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
  secretKey: process.env.SUPABASE_SECRET_KEY || '',
  anonKey: process.env.SUPABASE_ANON_KEY || '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
}
const SUPABASE_CONFIG_PATH = path.join(__dirname, 'supabase-config.json')
try {
  if (fs.existsSync(SUPABASE_CONFIG_PATH)) {
    const fileConfig = JSON.parse(fs.readFileSync(SUPABASE_CONFIG_PATH, 'utf-8'))
    supabaseConfig.supabaseUrl = supabaseConfig.supabaseUrl || fileConfig.supabaseUrl || ''
    supabaseConfig.publishableKey = supabaseConfig.publishableKey || fileConfig.publishableKey || fileConfig.anonKey || ''
    supabaseConfig.secretKey = supabaseConfig.secretKey || fileConfig.secretKey || fileConfig.serviceRoleKey || ''
    supabaseConfig.anonKey = supabaseConfig.anonKey || fileConfig.anonKey || ''
    supabaseConfig.serviceRoleKey = supabaseConfig.serviceRoleKey || fileConfig.serviceRoleKey || ''
  }
} catch {}

const app = express();
const PORT = process.env.PORT || 3001;
const LOAN_DB_PATH = path.join(__dirname, 'data', 'loans.json');

app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '2mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => req.path === '/api/register',
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts. Try again later.' },
});
app.use('/api/register', authLimiter);

function sbHeaders() {
  const key = supabaseConfig.secretKey || supabaseConfig.serviceRoleKey
  return { apikey: key, 'Content-Type': 'application/json', Prefer: 'return=representation' }
}

async function readData(key) {
  if (supabaseConfig.supabaseUrl && supabaseConfig.serviceRoleKey) {
    try {
      const r = await axios.get(`${supabaseConfig.supabaseUrl}/rest/v1/app_data?key=eq.${encodeURIComponent(key)}&select=value`, { headers: sbHeaders(), timeout: 5000 })
      if (r.data?.[0]?.value) return r.data[0].value
    } catch {}
  }
  try {
    const db = JSON.parse(fs.readFileSync(LOAN_DB_PATH, 'utf-8'))
    return db[key] || (key.endsWith('s') ? [] : {})
  } catch { return key.endsWith('s') ? [] : {} }
}

async function writeData(key, value) {
  if (supabaseConfig.supabaseUrl && supabaseConfig.serviceRoleKey) {
    try {
      await axios.patch(`${supabaseConfig.supabaseUrl}/rest/v1/app_data?key=eq.${encodeURIComponent(key)}`, { value }, { headers: sbHeaders(), timeout: 5000 })
    } catch (e) {
      if (e.response?.status === 404) {
        try {
          await axios.post(`${supabaseConfig.supabaseUrl}/rest/v1/app_data`, { key, value }, { headers: { ...sbHeaders(), Prefer: 'return=representation,resolution=merge-duplicates' }, timeout: 5000 })
        } catch {}
      }
    }
  }
  try {
    const db = JSON.parse(fs.readFileSync(LOAN_DB_PATH, 'utf-8'))
    db[key] = value
    fs.writeFileSync(LOAN_DB_PATH, JSON.stringify(db, null, 2))
  } catch {}
}

async function mutateData(key, fn) {
  const data = await readData(key)
  const result = fn(data)
  await writeData(key, result)
  return result
}

// Auth middleware

function isSupabaseConfigured() {
  return supabaseConfig.supabaseUrl && ((supabaseConfig.publishableKey && supabaseConfig.secretKey) || (supabaseConfig.anonKey && supabaseConfig.serviceRoleKey));
}

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token' });
  }
  const token = authHeader.split(' ')[1];
  if (!isSupabaseConfigured()) {
    return res.status(500).json({ error: 'Authentication not configured' });
  }
  try {
    const apikey = supabaseConfig.publishableKey || supabaseConfig.anonKey
    const r = await axios.get(`${supabaseConfig.supabaseUrl}/auth/v1/user`, {
      headers: { apikey, Authorization: `Bearer ${token}` },
      timeout: 5000
    });
    if (!r.data?.id) return res.status(401).json({ error: 'Invalid token' });
    const user = { id: r.data.id, email: r.data.email, phone: r.data.user_metadata?.phone, name: r.data.user_metadata?.name };
    try {
      const profileRes = await axios.get(
        `${supabaseConfig.supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=role`,
        { headers: sbHeaders(), timeout: 3000 }
      );
      user.role = profileRes.data?.[0]?.role || 'borrower';
    } catch {
      user.role = 'borrower';
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function requireSameUserOrAdmin(req, res, next) {
  const targetId = req.params.id || req.params.borrowerId || req.body?.borrower_id;
  if (req.user?.id !== targetId && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
}

const ALLOWED_LOAN_PRODUCT_FIELDS = ['name', 'description', 'min_amount', 'max_amount', 'daily_rate', 'weekly_rate', 'monthly_rate', 'interest_type'];
const ALLOWED_LOAN_FIELDS = ['borrower_id', 'borrower_name', 'product_id', 'amount', 'days', 'interest_rate', 'interest_type', 'frequency', 'num_payments', 'purpose', 'emi'];
const ALLOWED_LOAN_UPDATE_FIELDS = ['notes'];
const ALLOWED_APPROVE_FIELDS = ['days', 'interest_rate', 'approved_by'];
const ALLOWED_PAYMENT_FIELDS = ['amount', 'note'];
const ALLOWED_PAYMENT_METHOD_FIELDS = ['type', 'account_holder', 'account_number', 'qr_image'];
const ALLOWED_KYC_FIELDS = ['name', 'phone', 'address', 'id_type', 'id_number', 'id_image', 'selfie_image', 'bank_name', 'bank_account', 'account_holder', 'account_number', 'qr_data', 'kyc_status'];

function pick(obj, keys) {
  const result = {};
  for (const key of keys) {
    if (obj[key] !== undefined) result[key] = obj[key];
  }
  return result;
}

// === Loan Products ===

app.get('/api/loan/products', authenticate, async (req, res) => {
  const products = await readData('loan_products')
  const { all } = req.query;
  if (all === 'true') return res.json(products);
  res.json(products.filter(p => p.is_active));
});

app.post('/api/loan/products', authenticate, requireAdmin, async (req, res) => {
  const data = pick(req.body, ALLOWED_LOAN_PRODUCT_FIELDS);
  const product = { id: Date.now(), ...data, is_active: true };
  await mutateData('loan_products', arr => { arr.push(product); return arr })
  res.status(201).json(product);
});

app.put('/api/loan/products/:id', authenticate, requireAdmin, async (req, res) => {
  const pid = parseInt(req.params.id)
  const data = pick(req.body, ALLOWED_LOAN_PRODUCT_FIELDS);
  let found = null
  await mutateData('loan_products', arr => {
    const idx = arr.findIndex(p => p.id === pid)
    if (idx !== -1) { arr[idx] = { ...arr[idx], ...data }; found = arr[idx] }
    return arr
  })
  if (!found) return res.status(404).json({ error: 'Product not found' })
  res.json(found)
});

app.delete('/api/loan/products/:id', authenticate, requireAdmin, async (req, res) => {
  const pid = parseInt(req.params.id)
  await mutateData('loan_products', arr => arr.filter(p => p.id !== pid))
  res.json({ success: true })
});

// === Loans ===

app.get('/api/loans', authenticate, async (req, res) => {
  let loans = await readData('loans')
  const { borrowerId, status } = req.query;
  if (req.user.role !== 'admin' && borrowerId && borrowerId !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  if (req.user.role !== 'admin') {
    loans = loans.filter(l => l.borrower_id === req.user.id);
  } else if (borrowerId) {
    loans = loans.filter(l => l.borrower_id === borrowerId);
  }
  if (status) loans = loans.filter(l => l.status === status);
  loans.sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at));
  res.json(loans);
});

app.get('/api/loans/stats', authenticate, requireAdmin, async (req, res) => {
  const loans = await readData('loans')
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
  })
});

app.get('/api/loans/borrower-stats/:borrowerId', authenticate, requireSameUserOrAdmin, async (req, res) => {
  const loans = await readData('loans')
  const borrowerLoans = loans.filter(l => l.borrower_id === req.params.borrowerId);
  res.json({
    total: borrowerLoans.length,
    active: borrowerLoans.filter(l => l.status === 'approved').length,
    paid: borrowerLoans.filter(l => l.status === 'paid').length,
    pending: borrowerLoans.filter(l => l.status === 'pending').length,
    total_borrowed: borrowerLoans.reduce((s, l) => s + l.amount, 0),
    total_payable: borrowerLoans.reduce((s, l) => s + l.total_payable, 0),
    outstanding: borrowerLoans.filter(l => l.status === 'approved').reduce((s, l) => s + (l.total_payable - (l.paid_amount || 0)), 0),
  })
});

app.post('/api/loans', authenticate, async (req, res) => {
  const data = pick(req.body, ALLOWED_LOAN_FIELDS);
  if (!data.borrower_id || !data.amount || !data.product_id) {
    return res.status(400).json({ error: 'borrower_id, amount, and product_id required' });
  }
  if (data.borrower_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Cannot apply for another user' });
  }
  const loans = await readData('loans')
  const existingActive = loans.some(l => l.borrower_id === data.borrower_id && (l.status === 'pending' || l.status === 'approved'));
  if (existingActive) return res.status(400).json({ error: 'You already have an active loan. Wait for it to be paid before applying again.' });

  // Check KYC approval
  let profiles = [];
  if (isSupabaseConfigured()) {
    try {
      const r = await axios.get(`${supabaseConfig.supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(data.borrower_id)}&select=kyc_status`, { headers: sbHeaders(), timeout: 5000 })
      profiles = r.data || []
    } catch {}
  }
  const localProfiles = await readData('_borrower_profiles')
  const profile = profiles[0] || localProfiles.find(p => p.id === data.borrower_id)
  if (!profile || profile.kyc_status !== 'approved') return res.status(403).json({ error: 'KYC must be approved before applying for a loan.' });

  const rate = parseFloat(data.interest_rate) || 0;
  let total_interest = 0;
  const freq = data.frequency || data.interest_type || 'daily';
  const loanDays = parseInt(data.days) || 0;
  if (loanDays > 0) {
    if (freq === 'daily') total_interest = data.amount * (rate / 100) * loanDays;
    else if (freq === 'weekly') total_interest = data.amount * (rate / 100) * Math.ceil(loanDays / 7);
    else if (freq === 'monthly') total_interest = data.amount * (rate / 100) * Math.ceil(loanDays / 30);
  }
  total_interest = parseFloat(total_interest.toFixed(2))
  const total_payable = data.amount + total_interest;

  const loan = {
    id: `LN-${String(loans.length + 1).padStart(4, '0')}`,
    borrower_id: data.borrower_id, borrower_name: data.borrower_name || '', product_id: data.product_id, amount: parseFloat(data.amount), days: loanDays,
    interest_rate: rate, interest_type: freq, frequency: freq,
    total_interest, total_payable: parseFloat(total_payable.toFixed(2)),
    num_payments: data.num_payments ? parseInt(data.num_payments) : 0, purpose: data.purpose || '', emi: data.emi ? parseFloat(data.emi) : 0,
    paid_amount: 0, status: 'pending', applied_at: new Date().toISOString(),
    approved_at: null, approved_by: null, rejected_reason: '', paid_at: null, notes: '', payments: [],
  };
  loans.push(loan)
  await writeData('loans', loans)
  res.status(201).json(loan);
});

app.put('/api/loans/:id', authenticate, requireAdmin, async (req, res) => {
  const data = pick(req.body, ALLOWED_LOAN_UPDATE_FIELDS);
  let found = null
  await mutateData('loans', arr => {
    const idx = arr.findIndex(l => l.id === req.params.id)
    if (idx !== -1) { arr[idx] = { ...arr[idx], ...data }; found = arr[idx] }
    return arr
  })
  if (!found) return res.status(404).json({ error: 'Loan not found' })
  res.json(found)
});

app.post('/api/loans/:id/approve', authenticate, requireAdmin, async (req, res) => {
  const data = pick(req.body, ALLOWED_APPROVE_FIELDS);
  let found = null
  await mutateData('loans', arr => {
    const idx = arr.findIndex(l => l.id === req.params.id)
    if (idx !== -1) {
      const loan = arr[idx]
      if (data.days) {
        const days = parseInt(data.days)
        loan.days = days
        const rate = data.interest_rate !== undefined ? parseFloat(data.interest_rate) : (loan.interest_rate || 0)
        loan.interest_rate = rate
        const freq = loan.frequency || loan.interest_type || 'daily'
        let total_interest
        if (freq === 'daily') total_interest = loan.amount * (rate / 100) * days
        else if (freq === 'weekly') total_interest = loan.amount * (rate / 100) * Math.ceil(days / 7)
        else if (freq === 'monthly') total_interest = loan.amount * (rate / 100) * Math.ceil(days / 30)
        else total_interest = 0
        loan.total_interest = parseFloat(total_interest.toFixed(2))
        loan.total_payable = parseFloat((loan.amount + total_interest).toFixed(2))
        if (freq === 'daily') loan.num_payments = days
        else if (freq === 'weekly') loan.num_payments = Math.ceil(days / 7)
        else if (freq === 'monthly') loan.num_payments = Math.ceil(days / 30)
        loan.emi = loan.num_payments > 0 ? parseFloat((loan.total_payable / loan.num_payments).toFixed(2)) : 0
      }
      loan.status = 'approved'
      loan.approved_at = new Date().toISOString()
      loan.approved_by = data.approved_by || ''
      found = loan
    }
    return arr
  })
  if (!found) return res.status(404).json({ error: 'Loan not found' })
  res.json(found)
});

app.post('/api/loans/:id/reject', authenticate, requireAdmin, async (req, res) => {
  let found = null
  await mutateData('loans', arr => {
    const idx = arr.findIndex(l => l.id === req.params.id)
    if (idx !== -1) { arr[idx].status = 'rejected'; arr[idx].rejected_reason = req.body.reason || ''; found = arr[idx] }
    return arr
  })
  if (!found) return res.status(404).json({ error: 'Loan not found' })
  res.json(found)
});

app.post('/api/loans/:id/pay', authenticate, requireAdmin, async (req, res) => {
  const data = pick(req.body, ALLOWED_PAYMENT_FIELDS);
  let found = null
  await mutateData('loans', arr => {
    const idx = arr.findIndex(l => l.id === req.params.id)
    if (idx === -1) return arr
    const loan = arr[idx];
    const paymentAmount = parseFloat(data.amount) || loan.total_payable;
    loan.paid_amount = (loan.paid_amount || 0) + paymentAmount;
    if (!loan.payments) loan.payments = [];
    loan.payments.push({ id: Date.now(), amount: paymentAmount, date: new Date().toISOString(), note: data.note || '' });
    if (loan.paid_amount >= loan.total_payable) { loan.status = 'paid'; loan.paid_at = new Date().toISOString() }
    found = loan
    return arr
  })
  if (!found) return res.status(404).json({ error: 'Loan not found' })
  res.json(found)
});

// === Registration ===

app.post('/api/register', async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, and password required' });

  const profiles = await readData('_borrower_profiles')
  if (profiles.find(p => p.email === email)) return res.status(400).json({ error: 'Email already registered' });

  let userId;

  if (isSupabaseConfigured()) {
    try {
      const createRes = await axios.post(`${supabaseConfig.supabaseUrl}/auth/v1/admin/users`, {
        email, password, email_confirm: true,
        user_metadata: { name, phone, email_verified: true, phone_verified: false }
      }, { headers: { ...sbHeaders(), Prefer: 'return=representation' }, timeout: 10000 });
      if (!createRes.data?.id) throw new Error('No user ID returned');
      userId = createRes.data.id;

      try {
        await axios.post(`${supabaseConfig.supabaseUrl}/rest/v1/profiles`, {
          id: userId, name, role: 'borrower', phone: phone || '', is_active: true,
          address: '', id_type: '', id_number: '', bank_name: '', bank_account: '',
          account_holder: '', account_number: '', qr_data: '', kyc_status: '',
          id_image: '', selfie_image: '',
        }, { headers: { ...sbHeaders(), Prefer: 'return=representation,resolution=merge-duplicates' }, timeout: 5000 });
      } catch {}
      await mutateData('_borrower_profiles', arr => {
        const existing = arr.find(p => p.id === userId);
        if (!existing) arr.push({ id: userId, name, phone: phone || '', role: 'borrower' });
        return arr;
      });
    } catch (e) {
      if (e.response?.status === 409) return res.status(400).json({ error: 'Email already registered' });
      return res.status(500).json({ error: 'Registration failed. Contact support.' });
    }
  } else {
    userId = `local-${Date.now()}`;
    profiles.push({ id: userId, name, email, password, phone: phone || '', role: 'borrower', is_active: true, address: '', id_type: '', id_number: '', bank_name: '', bank_account: '', account_holder: '', account_number: '', qr_data: '', kyc_status: '', id_image: '', selfie_image: '', created_at: new Date().toISOString() });
    await writeData('_borrower_profiles', profiles);
  }

  res.status(201).json({ user: { id: userId, name, email, phone, role: 'borrower' } });
});

// === Profile ===

app.get('/api/profile/:id', authenticate, requireSameUserOrAdmin, async (req, res) => {
  const profiles = await readData('_borrower_profiles')
  const loans = await readData('loans')
  let user = profiles.find(p => p.id === req.params.id);
  if (!user && isSupabaseConfigured()) {
    try {
      const headers = sbHeaders()
      const r = await axios.get(`${supabaseConfig.supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(req.params.id)}&select=*`, { headers, timeout: 5000 })
      if (r.data?.[0]) user = r.data[0];
    } catch {}
  }
  if (!user) return res.status(404).json({ error: 'Profile not found' });
  const { password: _, ...safeUser } = user;
  safeUser.total_loans = loans.filter(l => l.borrower_id === user.id).length;
  safeUser.active_loans = loans.filter(l => l.borrower_id === user.id && l.status === 'approved').length;
  res.json(safeUser);
});

// === Admin Profile ===

app.put('/api/admin/profile', authenticate, requireAdmin, async (req, res) => {
  const { id, name, phone } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'id and name required' });
  if (isSupabaseConfigured()) {
    try {
      const r = await axios.patch(`${supabaseConfig.supabaseUrl}/rest/v1/profiles?id=eq.${id}`, { name, phone }, { headers: sbHeaders(), timeout: 5000 })
      if (r.data?.[0]) return res.json(r.data[0]);
    } catch {}
  }
  res.json({ id, name, phone, updated: true });
});

app.delete('/api/borrowers/:id', authenticate, requireAdmin, async (req, res) => {
  // Check borrower has no active loans
  const loans = await readData('loans');
  const activeLoans = loans.filter(l => l.borrower_id === req.params.id && (l.status === 'pending' || l.status === 'approved'));
  if (activeLoans.length > 0) return res.status(400).json({ error: 'Cannot delete borrower with active loans' });

  try {
    await axios.delete(`${supabaseConfig.supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(req.params.id)}`, { headers: sbHeaders(), timeout: 5000 })
  } catch {}

  try {
    await axios.delete(`${supabaseConfig.supabaseUrl}/auth/v1/admin/users/${req.params.id}`, { headers: sbHeaders(), timeout: 5000 })
  } catch {}

  await mutateData('_borrower_profiles', arr => arr.filter(p => p.id !== req.params.id));

  res.json({ success: true });
});

// === Borrowers (admin view) ===

app.get('/api/borrowers', authenticate, requireAdmin, async (req, res) => {
  let profiles = [];
  if (isSupabaseConfigured()) {
    try {
      const r = await axios.get(`${supabaseConfig.supabaseUrl}/rest/v1/profiles?role=eq.borrower&select=*`, { headers: sbHeaders(), timeout: 5000 })
      profiles = r.data || []
    } catch {}
  }
  const localProfiles = await readData('_borrower_profiles')
  const loans = await readData('loans')
  const merged = profiles.map(p => {
    const local = localProfiles.find(l => l.id === p.id);
    return local ? { ...p, ...local } : p;
  });
  localProfiles.forEach(l => {
    if (!merged.find(p => p.id === l.id)) merged.push(l);
  });
  const borrowers = merged.map(p => ({
    ...p, total_loans: loans.filter(l => l.borrower_id === p.id).length,
    active_loans: loans.filter(l => l.borrower_id === p.id && l.status === 'approved').length,
    total_borrowed: loans.filter(l => l.borrower_id === p.id).reduce((s, l) => s + l.amount, 0),
  }))
  res.json(borrowers)
});

// === Payment Methods ===

app.get('/api/admin/payment-methods', authenticate, async (req, res) => {
  const pms = await readData('_payment_methods')
  res.json(pms)
});

app.put('/api/admin/payment-methods', authenticate, requireAdmin, async (req, res) => {
  const data = pick(req.body, ALLOWED_PAYMENT_METHOD_FIELDS);
  if (!data.type || !data.account_holder || !data.account_number) {
    return res.status(400).json({ error: 'type, account_holder, and account_number required' });
  }
  const pm = { id: Date.now(), ...data };
  await mutateData('_payment_methods', arr => { arr.push(pm); return arr })
  res.status(201).json(pm);
});

app.delete('/api/admin/payment-methods/:id', authenticate, requireAdmin, async (req, res) => {
  const pid = parseInt(req.params.id)
  await mutateData('_payment_methods', arr => arr.filter(p => p.id !== pid && p.id !== req.params.id))
  res.json({ success: true })
});

// === Borrower KYC ===

app.put('/api/borrowers/:id/kyc', authenticate, requireSameUserOrAdmin, async (req, res) => {
  const data = pick(req.body, ALLOWED_KYC_FIELDS);
  const isAdminAction = req.body.kyc_status !== undefined && req.user.role === 'admin';
  if (req.body.kyc_status !== undefined && !isAdminAction) {
    return res.status(403).json({ error: 'Only admin can set KYC status' });
  }
  if (data.kyc_status === undefined) data.kyc_status = 'pending';
  data.id = req.params.id;
  if (isSupabaseConfigured()) {
    try {
      const supabaseFields = ['name', 'phone', 'address', 'id_type', 'id_number', 'bank_name', 'bank_account', 'account_holder', 'account_number', 'kyc_status'];
      const supabaseData = {};
      for (const key of supabaseFields) {
        if (data[key] !== undefined) supabaseData[key] = data[key];
      }
      if (Object.keys(supabaseData).length > 0) {
        const r = await axios.patch(`${supabaseConfig.supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(req.params.id)}`, supabaseData, { headers: sbHeaders(), timeout: 10000 })
        if (r.data?.[0]) data.updated = r.data[0];
      }
    } catch {}
  }
  await mutateData('_borrower_profiles', arr => {
    const idx = arr.findIndex(p => p.id === req.params.id);
    if (idx !== -1) { arr[idx] = { ...arr[idx], ...data } }
    else { arr.push({ id: req.params.id, ...data }) }
    return arr
  })
  res.json({ success: true })
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Loan API running on http://127.0.0.1:${PORT}`);
});
