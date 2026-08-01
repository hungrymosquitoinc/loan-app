const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { z } = require('zod');
const crypto = require('crypto');

// --- Input Sanitization ---

function isImageDataUrl(str) {
  return typeof str === 'string'
    && str.length > 100
    && /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(str);
}

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  if (isImageDataUrl(str)) return str;
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeString(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function sanitizeMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

// --- Supabase Config ---

const supabaseConfig = {
  supabaseUrl: process.env.SUPABASE_URL || '',
  publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
  secretKey: process.env.SUPABASE_SECRET_KEY || '',
  anonKey: process.env.SUPABASE_ANON_KEY || '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
};

const SUPABASE_CONFIG_PATH = path.join(__dirname, 'supabase-config.json');
try {
  if (fs.existsSync(SUPABASE_CONFIG_PATH)) {
    const fileConfig = JSON.parse(fs.readFileSync(SUPABASE_CONFIG_PATH, 'utf-8'));
    supabaseConfig.supabaseUrl = supabaseConfig.supabaseUrl || fileConfig.supabaseUrl || '';
    supabaseConfig.publishableKey = supabaseConfig.publishableKey || fileConfig.publishableKey || fileConfig.anonKey || '';
    supabaseConfig.secretKey = supabaseConfig.secretKey || fileConfig.secretKey || fileConfig.serviceRoleKey || '';
    supabaseConfig.anonKey = supabaseConfig.anonKey || fileConfig.anonKey || '';
    supabaseConfig.serviceRoleKey = supabaseConfig.serviceRoleKey || fileConfig.serviceRoleKey || '';
  }
} catch (e) {
  logSafe('Config load', e.message);
}

// --- App Setup ---

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'https://localhost', 'capacitor://localhost'];

// --- Safe Logging ---

function logSafe(label, msg) {
  if (!IS_PRODUCTION) console.error(`${label}:`, msg);
}

// --- Helpers ---

function getUserHeaders(userToken) {
  return {
    apikey: supabaseConfig.publishableKey || supabaseConfig.anonKey,
    Authorization: `Bearer ${userToken}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
    'User-Agent': 'node-axios',
  };
}

function getAdminHeaders() {
  return {
    apikey: supabaseConfig.secretKey || supabaseConfig.serviceRoleKey,
    Authorization: `Bearer ${supabaseConfig.serviceRoleKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
    'User-Agent': 'node-axios',
  };
}

function sbHeaders() {
  return getAdminHeaders();
}

async function createNotification({ title, message, type = 'info', from_user_id = null, to_role = 'admin', link = null }) {
  try {
    await axios.post(
      `${supabaseConfig.supabaseUrl}/rest/v1/notifications`,
      { title, message, type, from_user_id, to_role, link },
      { headers: { ...sbHeaders(), Prefer: 'return=representation' }, timeout: 5000 }
    );
  } catch (e) {
    logSafe('Notification create', e.message);
  }
}

function isSupabaseConfigured() {
  return supabaseConfig.supabaseUrl && (supabaseConfig.publishableKey || supabaseConfig.anonKey) && (supabaseConfig.secretKey || supabaseConfig.serviceRoleKey);
}

function requireSupabase(req, res, next) {
  if (!isSupabaseConfigured()) {
    return res.status(500).json({ error: 'Service not configured' });
  }
  next();
}

// --- ID Generation ---

function generateId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

// --- Middleware ---

app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);

app.use(helmet({
  contentSecurityPolicy: IS_PRODUCTION ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", ...(supabaseConfig.supabaseUrl ? [supabaseConfig.supabaseUrl] : []), ...(process.env.API_PUBLIC_URL ? [process.env.API_PUBLIC_URL] : [])],
      frameAncestors: ["'none'"],
    },
  } : false,
  hsts: IS_PRODUCTION ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  xssFilter: true,
  frameguard: { action: 'deny' },
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(sanitizeMiddleware);

// --- Rate Limiting ---

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use('/api', generalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
});
app.use('/api/register', authLimiter);
app.use('/api/login', authLimiter);

const financialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use('/api/loans', financialLimiter);
app.use('/api/borrowers', financialLimiter);
app.use('/api/admin/payment-methods', financialLimiter);

// --- Health Check ---

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Validation Schemas ---

const loanProductSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  min_amount: z.number().positive().max(1000000).optional(),
  max_amount: z.number().positive().max(1000000).optional(),
  daily_rate: z.number().min(0).max(100).optional(),
  weekly_rate: z.number().min(0).max(100).optional(),
  monthly_rate: z.number().min(0).max(100).optional(),
  interest_type: z.enum(['daily', 'weekly', 'monthly']).optional(),
});

const loanSchema = z.object({
  borrower_id: z.string().uuid(),
  borrower_name: z.string().max(100).optional(),
  amount: z.number().positive().max(1000000),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  purpose: z.string().max(500).optional(),
});

const loanApproveSchema = z.object({
  days: z.number().int().positive().max(3650),
  interest_rate: z.number().min(0).max(100),
  num_payments: z.number().int().positive().max(3650),
  approved_by: z.string().max(100).optional(),
});

const loanUpdateSchema = z.object({
  notes: z.string().max(1000).optional(),
});

const paymentSchema = z.object({
  amount: z.number().positive().max(1000000),
  note: z.string().max(500).optional(),
});

const rejectSchema = z.object({
  reason: z.string().max(500).optional(),
});

const imageSchema = (max) => z.string().max(max).refine(
  (v) => !v || isImageDataUrl(v),
  { message: 'Must be a valid base64 image (data:image/*;base64,...)' }
);

const paymentMethodSchema = z.object({
  type: z.enum(['bank', 'mobile_money', 'cash', 'other']),
  account_holder: z.string().min(1).max(100),
  account_number: z.string().min(1).max(50),
  qr_image: imageSchema(1000000).optional(),
});

const kycSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  id_type: z.string().max(50).optional(),
  id_number: z.string().max(50).optional(),
  id_image: imageSchema(30000000).optional(),
  selfie_image: imageSchema(30000000).optional(),
  bank_name: z.string().max(100).optional(),
  bank_account: z.string().max(50).optional(),
  account_holder: z.string().max(100).optional(),
  account_number: z.string().max(50).optional(),
  qr_data: imageSchema(30000000).optional(),
  kyc_status: z.enum(['pending', 'approved', 'rejected']).optional(),
});

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  phone: z.string().max(20).optional(),
});

const profileUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
});

const validateRequest = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    logSafe('VALIDATION FAILED', errors);
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  req.body = result.data;
  next();
};

// --- Field Allowlists ---

const ALLOWED_LOAN_PRODUCT_FIELDS = ['name', 'description', 'min_amount', 'max_amount', 'daily_rate', 'weekly_rate', 'monthly_rate', 'interest_type'];
const ALLOWED_LOAN_FIELDS = ['borrower_id', 'borrower_name', 'amount', 'frequency', 'purpose'];
const ALLOWED_LOAN_UPDATE_FIELDS = ['notes'];
const ALLOWED_APPROVE_FIELDS = ['days', 'interest_rate', 'num_payments', 'approved_by'];
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

// --- Auth Middleware ---

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
    const r = await axios.get(`${supabaseConfig.supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseConfig.publishableKey || supabaseConfig.anonKey, Authorization: `Bearer ${token}` },
      timeout: 5000,
    });
    if (!r.data?.id) return res.status(401).json({ error: 'Invalid token' });
    const user = { id: r.data.id, email: r.data.email, phone: r.data.user_metadata?.phone, name: r.data.user_metadata?.name };
    try {
      const profileRes = await axios.get(
        `${supabaseConfig.supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=role`,
        { headers: getUserHeaders(token), timeout: 3000 }
      );
      user.role = profileRes.data?.[0]?.role || 'borrower';
    } catch {
      user.role = 'borrower';
    }
    req.user = user;
    req.authToken = token;
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
  const targetId = req.params.id || req.params.borrowerId;
  if (req.user?.id !== targetId && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
}

// === Loan Products ===

app.get('/api/loan/products', authenticate, requireSupabase, async (req, res) => {
  try {
    const r = await axios.get(
      `${supabaseConfig.supabaseUrl}/rest/v1/loan_products?select=*&order=created_at.desc`,
      { headers: getUserHeaders(req.authToken), timeout: 5000 }
    );
    const { all } = req.query;
    const products = all === 'true' ? r.data : (r.data || []).filter(p => p.is_active);
    res.json(products);
  } catch {
    res.json([]);
  }
});

app.post('/api/loan/products', authenticate, requireAdmin, requireSupabase, validateRequest(loanProductSchema), async (req, res) => {
  const data = pick(req.body, ALLOWED_LOAN_PRODUCT_FIELDS);
  try {
    const r = await axios.post(
      `${supabaseConfig.supabaseUrl}/rest/v1/loan_products`,
      { ...data, is_active: true },
      { headers: { ...sbHeaders(), Prefer: 'return=representation' }, timeout: 5000 }
    );
    res.status(201).json(r.data?.[0] || data);
  } catch (e) {
    logSafe('Loan product create', e.message);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/loan/products/:id', authenticate, requireAdmin, requireSupabase, validateRequest(loanProductSchema), async (req, res) => {
  const pid = parseInt(req.params.id, 10);
  if (isNaN(pid)) return res.status(400).json({ error: 'Invalid product ID' });
  const data = pick(req.body, ALLOWED_LOAN_PRODUCT_FIELDS);
  try {
    const r = await axios.patch(
      `${supabaseConfig.supabaseUrl}/rest/v1/loan_products?id=eq.${pid}`,
      data,
      { headers: { ...sbHeaders(), Prefer: 'return=representation' }, timeout: 5000 }
    );
    if (!r.data?.length) return res.status(404).json({ error: 'Product not found' });
    res.json(r.data[0]);
  } catch {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/loan/products/:id', authenticate, requireAdmin, requireSupabase, async (req, res) => {
  const pid = parseInt(req.params.id, 10);
  if (isNaN(pid)) return res.status(400).json({ error: 'Invalid product ID' });
  try {
    await axios.delete(`${supabaseConfig.supabaseUrl}/rest/v1/loan_products?id=eq.${pid}`, { headers: sbHeaders(), timeout: 5000 });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// === Loans ===

app.get('/api/loans', authenticate, requireSupabase, async (req, res) => {
  try {
    let query = `${supabaseConfig.supabaseUrl}/rest/v1/loans?select=*&order=applied_at.desc`;
    if (req.user.role !== 'admin') {
      query += `&borrower_id=eq.${req.user.id}`;
    } else if (req.query.borrowerId) {
      query += `&borrower_id=eq.${encodeURIComponent(req.query.borrowerId)}`;
    }
    if (req.query.status) {
      query += `&status=eq.${encodeURIComponent(req.query.status)}`;
    }
    const r = await axios.get(query, { headers: getUserHeaders(req.authToken), timeout: 5000 });
    res.json(r.data || []);
  } catch {
    res.json([]);
  }
});

app.get('/api/loans/stats', authenticate, requireAdmin, requireSupabase, async (req, res) => {
  try {
    const base = `${supabaseConfig.supabaseUrl}/rest/v1/loans`;
    const h = { ...sbHeaders(), timeout: 10000 };
    const [all, pending, approved, rejected, paid, disbursed, repaid, interest] = await Promise.all([
      axios.get(`${base}?select=id,borrower_id`, h),
      axios.get(`${base}?select=id&status=eq.pending`, h),
      axios.get(`${base}?select=id,borrower_id&status=eq.approved`, h),
      axios.get(`${base}?select=id&status=eq.rejected`, h),
      axios.get(`${base}?select=id,borrower_id,amount,total_payable,total_interest&status=eq.paid`, h),
      axios.get(`${base}?select=amount&status=in.(approved,paid)`, h),
      axios.get(`${base}?select=total_payable&status=eq.paid`, h),
      axios.get(`${base}?select=total_interest&status=eq.paid`, h),
    ]);
    const allLoans = all.data || [];
    const paidLoans = paid.data || [];
    const approvedLoans = approved.data || [];
    const activeBorrowers = new Set([...approvedLoans.map(l => l.borrower_id), ...(pending.data || []).map(l => l.borrower_id)]);
    res.json({
      total_loans: allLoans.length,
      pending: (pending.data || []).length,
      approved: approvedLoans.length,
      rejected: (rejected.data || []).length,
      paid: paidLoans.length,
      total_disbursed: (disbursed.data || []).reduce((s, l) => s + Number(l.amount), 0),
      total_repaid: (repaid.data || []).reduce((s, l) => s + Number(l.total_payable), 0),
      total_interest: (interest.data || []).reduce((s, l) => s + Number(l.total_interest), 0),
      active_borrowers: activeBorrowers.size,
      total_borrowers: new Set(allLoans.map(l => l.borrower_id)).size,
    });
  } catch {
    res.json({ total_loans: 0, pending: 0, approved: 0, rejected: 0, paid: 0, total_disbursed: 0, total_repaid: 0, total_interest: 0, active_borrowers: 0, total_borrowers: 0 });
  }
});

app.get('/api/loans/borrower-stats/:borrowerId', authenticate, requireSameUserOrAdmin, requireSupabase, async (req, res) => {
  try {
    const r = await axios.get(
      `${supabaseConfig.supabaseUrl}/rest/v1/loans?select=*&borrower_id=eq.${encodeURIComponent(req.params.borrowerId)}`,
      { headers: getUserHeaders(req.authToken), timeout: 5000 }
    );
    const loans = r.data || [];
    res.json({
      total: loans.length,
      active: loans.filter(l => l.status === 'approved').length,
      paid: loans.filter(l => l.status === 'paid').length,
      pending: loans.filter(l => l.status === 'pending').length,
      total_borrowed: loans.reduce((s, l) => s + Number(l.amount), 0),
      total_payable: loans.reduce((s, l) => s + Number(l.total_payable), 0),
      outstanding: loans.filter(l => l.status === 'approved').reduce((s, l) => s + (Number(l.total_payable) - (Number(l.paid_amount) || 0)), 0),
    });
  } catch {
    res.json({ total: 0, active: 0, paid: 0, pending: 0, total_borrowed: 0, total_payable: 0, outstanding: 0 });
  }
});

app.post('/api/loans', authenticate, requireSupabase, validateRequest(loanSchema), async (req, res) => {
  const data = pick(req.body, ALLOWED_LOAN_FIELDS);
  if (data.borrower_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Cannot apply for another user' });
  }

  // Check KYC
  try {
    const r = await axios.get(
      `${supabaseConfig.supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(data.borrower_id)}&select=kyc_status`,
      { headers: sbHeaders(), timeout: 5000 }
    );
    const profile = r.data?.[0];
    if (!profile || profile.kyc_status !== 'approved') {
      return res.status(403).json({ error: 'KYC must be approved before applying for a loan.' });
    }
  } catch {
    return res.status(500).json({ error: 'Failed to verify KYC status' });
  }

  // Check active loan
  try {
    const r = await axios.get(
      `${supabaseConfig.supabaseUrl}/rest/v1/loans?borrower_id=eq.${encodeURIComponent(data.borrower_id)}&status=in.(pending,approved)&select=id`,
      { headers: sbHeaders(), timeout: 5000 }
    );
    if (r.data?.length > 0) {
      return res.status(400).json({ error: 'You already have an active loan. Wait for it to be paid before applying again.' });
    }
  } catch {}

  const loan = {
    id: generateId('LN'),
    borrower_id: data.borrower_id,
    borrower_name: data.borrower_name || '',
    amount: parseFloat(data.amount),
    days: 0,
    interest_rate: 0,
    interest_type: data.frequency,
    frequency: data.frequency,
    total_interest: 0,
    total_payable: 0,
    num_payments: 0,
    purpose: data.purpose || '',
    emi: 0,
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

  try {
    const r = await axios.post(
      `${supabaseConfig.supabaseUrl}/rest/v1/loans`,
      loan,
      { headers: { ...sbHeaders(), Prefer: 'return=representation' }, timeout: 5000 }
    );
    const borrowerName = data.borrower_name || req.user.email || 'A borrower';
    createNotification({
      title: 'New Loan Application',
      message: `${borrowerName} applied for a ₱${data.amount.toLocaleString()} loan (${data.frequency}).`,
      type: 'loan',
      from_user_id: data.borrower_id,
      link: '/admin/loans',
    });
    res.status(201).json(r.data?.[0] || loan);
  } catch (e) {
    const detail = e.response?.data || e.message;
    logSafe('Loan create', JSON.stringify(detail));
    logSafe('Loan create', e.message);
    res.status(500).json({ error: 'Failed to create loan' });
  }
});

app.put('/api/loans/:id', authenticate, requireAdmin, requireSupabase, validateRequest(loanUpdateSchema), async (req, res) => {
  const data = pick(req.body, ALLOWED_LOAN_UPDATE_FIELDS);
  try {
    const r = await axios.patch(
      `${supabaseConfig.supabaseUrl}/rest/v1/loans?id=eq.${encodeURIComponent(req.params.id)}`,
      data,
      { headers: { ...sbHeaders(), Prefer: 'return=representation' }, timeout: 5000 }
    );
    if (!r.data?.length) return res.status(404).json({ error: 'Loan not found' });
    res.json(r.data[0]);
  } catch {
    res.status(500).json({ error: 'Failed to update loan' });
  }
});

app.post('/api/loans/:id/approve', authenticate, requireAdmin, requireSupabase, validateRequest(loanApproveSchema), async (req, res) => {
  const data = pick(req.body, ALLOWED_APPROVE_FIELDS);
  try {
    const existing = await axios.get(
      `${supabaseConfig.supabaseUrl}/rest/v1/loans?id=eq.${encodeURIComponent(req.params.id)}&select=*`,
      { headers: sbHeaders(), timeout: 5000 }
    );
    if (!existing.data?.length) return res.status(404).json({ error: 'Loan not found' });

    const loan = existing.data[0];
    const termInput = parseInt(data.days, 10);
    const rate = parseFloat(data.interest_rate);
    const numPayments = parseInt(data.num_payments, 10);
    const freq = loan.frequency || loan.interest_type || 'daily';
    const days = freq === 'weekly' ? termInput * 7 : freq === 'monthly' ? termInput * 30 : termInput;

    let total_interest;
    if (freq === 'daily') total_interest = loan.amount * (rate / 100) * days;
    else if (freq === 'weekly') total_interest = loan.amount * (rate / 100) * Math.ceil(days / 7);
    else if (freq === 'monthly') total_interest = loan.amount * (rate / 100) * Math.ceil(days / 30);
    else total_interest = 0;

    const totalPayable = parseFloat((Number(loan.amount) + total_interest).toFixed(2));
    const emi = numPayments > 0 ? parseFloat((totalPayable / numPayments).toFixed(2)) : 0;

    const updateData = {
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: req.user.id,
      days,
      interest_rate: rate,
      interest_type: freq,
      frequency: freq,
      total_interest: parseFloat(total_interest.toFixed(2)),
      total_payable: totalPayable,
      num_payments: numPayments,
      emi,
    };

    const r = await axios.patch(
      `${supabaseConfig.supabaseUrl}/rest/v1/loans?id=eq.${encodeURIComponent(req.params.id)}`,
      updateData,
      { headers: { ...sbHeaders(), Prefer: 'return=representation' }, timeout: 5000 }
    );
    res.json(r.data?.[0] || { success: true });
  } catch (e) {
    const detail = e.response?.data || e.message;
    logSafe('Loan approve', JSON.stringify(detail));
    res.status(500).json({ error: 'Failed to approve loan' });
  }
});

app.post('/api/loans/:id/reject', authenticate, requireAdmin, requireSupabase, validateRequest(rejectSchema), async (req, res) => {
  try {
    const r = await axios.patch(
      `${supabaseConfig.supabaseUrl}/rest/v1/loans?id=eq.${encodeURIComponent(req.params.id)}`,
      { status: 'rejected', rejected_reason: req.body.reason || '' },
      { headers: { ...sbHeaders(), Prefer: 'return=representation' }, timeout: 5000 }
    );
    if (!r.data?.length) return res.status(404).json({ error: 'Loan not found' });
    res.json(r.data[0]);
  } catch {
    res.status(500).json({ error: 'Failed to reject loan' });
  }
});

app.post('/api/loans/:id/pay', authenticate, requireAdmin, requireSupabase, validateRequest(paymentSchema), async (req, res) => {
  const data = pick(req.body, ALLOWED_PAYMENT_FIELDS);
  try {
    const existing = await axios.get(
      `${supabaseConfig.supabaseUrl}/rest/v1/loans?id=eq.${encodeURIComponent(req.params.id)}&select=*`,
      { headers: sbHeaders(), timeout: 5000 }
    );
    if (!existing.data?.length) return res.status(404).json({ error: 'Loan not found' });

    const loan = existing.data[0];
    const paymentAmount = parseFloat(data.amount) || 0;
    const emi = Number(loan.emi) || 0;
    const remaining = Number(loan.total_payable) - (Number(loan.paid_amount) || 0);
    if (paymentAmount <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount' });
    }
    if (paymentAmount > remaining) {
      return res.status(400).json({ error: `Payment exceeds remaining balance of ₱${remaining}` });
    }
    const minPayment = Math.min(emi, remaining);
    if (emi > 0 && paymentAmount < minPayment) {
      return res.status(400).json({ error: `Payment must be at least ₱${minPayment}` });
    }
    const newPaidAmount = (Number(loan.paid_amount) || 0) + paymentAmount;
    const existingPayments = Array.isArray(loan.payments) ? loan.payments : [];
    const newPayment = { id: crypto.randomUUID(), date: new Date().toISOString(), amount: paymentAmount };
    const updateData = { paid_amount: newPaidAmount, payments: [...existingPayments, newPayment] };
    if (newPaidAmount >= Number(loan.total_payable)) {
      updateData.status = 'paid';
      updateData.paid_at = new Date().toISOString();
    }

    // Atomic update: only succeed if paid_amount hasn't changed since we read it (optimistic lock)
    const r = await axios.patch(
      `${supabaseConfig.supabaseUrl}/rest/v1/loans?id=eq.${encodeURIComponent(req.params.id)}&paid_amount=eq.${Number(loan.paid_amount) || 0}`,
      updateData,
      { headers: { ...sbHeaders(), Prefer: 'return=representation' }, timeout: 5000 }
    );
    if (!r.data?.length) return res.status(409).json({ error: 'Payment conflict — please try again' });
    res.json(r.data[0]);
  } catch {
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// === Registration ===

function validatePassword(pw) {
  if (pw.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(pw)) return 'Password must contain an uppercase letter';
  if (!/[a-z]/.test(pw)) return 'Password must contain a lowercase letter';
  if (!/[0-9]/.test(pw)) return 'Password must contain a number';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Password must contain a special character';
  return null;
}

app.post('/api/register', authLimiter, requireSupabase, validateRequest(registerSchema), async (req, res) => {
  const { name, email, password, phone } = req.body;
  const pwErr = validatePassword(password);
  if (pwErr) return res.status(400).json({ error: pwErr });

  // Pre-check: phone must not already exist in profiles OR payment methods
  if (phone) {
    try {
      const existing = await axios.get(
        `${supabaseConfig.supabaseUrl}/rest/v1/profiles?phone=eq.${encodeURIComponent(phone)}&select=id`,
        { headers: sbHeaders(), timeout: 3000 }
      );
      if (existing.data?.length > 0) {
        return res.status(400).json({ error: 'Phone number is already registered' });
      }
    } catch {}
  }

  let userId;
  try {
    const createRes = await axios.post(
      `${supabaseConfig.supabaseUrl}/auth/v1/admin/users`,
      {
        email,
        password,
        email_confirm: true,
        user_metadata: { name, phone, email_verified: true, phone_verified: false },
      },
      { headers: { ...sbHeaders(), Prefer: 'return=representation' }, timeout: 10000 }
    );
    if (!createRes.data?.id) throw new Error('No user ID returned');
    userId = createRes.data.id;

    if (!createRes.data.email_confirmed_at) {
      await axios.put(
        `${supabaseConfig.supabaseUrl}/auth/v1/admin/users/${userId}`,
        { email_confirm: true },
        { headers: sbHeaders(), timeout: 5000 }
      );
    }

    await axios.post(
      `${supabaseConfig.supabaseUrl}/rest/v1/profiles`,
      {
        id: userId,
        name,
        role: 'borrower',
        phone: phone || '',
        is_active: true,
        address: '',
        id_type: '',
        id_number: '',
        bank_name: '',
        bank_account: '',
        account_holder: '',
        account_number: '',
        qr_data: '',
        kyc_status: '',
        id_image: '',
        selfie_image: '',
      },
      { headers: { ...sbHeaders(), Prefer: 'return=representation,resolution=merge-duplicates' }, timeout: 5000 }
    );
  } catch (e) {
    if (e.response?.status === 409) {
      const msg = e.response?.data?.message || '';
      if (msg.includes('profiles_name_unique') || msg.includes('name'))
        return res.status(400).json({ error: 'This name is already registered' });
      if (msg.includes('profiles_phone_unique') || msg.includes('phone'))
        return res.status(400).json({ error: 'Phone number is already registered' });
      if (msg.includes('profiles_id_number_unique') || msg.includes('id_number'))
        return res.status(400).json({ error: 'This ID number is already registered' });
      return res.status(400).json({ error: 'Email already registered' });
    }
    logSafe('Registration', e.message);
    return res.status(500).json({ error: 'Registration failed. Contact support.' });
  }

  res.status(201).json({ user: { id: userId, name, email, phone, role: 'borrower' } });
});

// === Profile ===

app.get('/api/profile/:id', authenticate, requireSameUserOrAdmin, requireSupabase, async (req, res) => {
  try {
    const headers = req.user.role === 'admin' ? sbHeaders() : getUserHeaders(req.authToken);
    const r = await axios.get(
      `${supabaseConfig.supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(req.params.id)}&select=*`,
      { headers, timeout: 5000 }
    );
    if (!r.data?.length) return res.status(404).json({ error: 'Profile not found' });
    const { password: _, ...safeUser } = r.data[0];
    res.json(safeUser);
  } catch {
    res.status(404).json({ error: 'Profile not found' });
  }
});

app.put('/api/profile', authenticate, requireSupabase, validateRequest(profileUpdateSchema), async (req, res) => {
  const { id, name, phone } = req.body;
  if (id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Cannot update another user' });
  }
  try {
    const headers = req.user.role === 'admin' ? sbHeaders() : getUserHeaders(req.authToken);
    const r = await axios.patch(
      `${supabaseConfig.supabaseUrl}/rest/v1/profiles?id=eq.${id}`,
      { name, phone },
      { headers, timeout: 5000 }
    );
    if (r.data?.[0]) return res.json(r.data[0]);
  } catch {}
  return res.status(404).json({ error: 'Profile not found' });
});

app.put('/api/admin/profile', authenticate, requireAdmin, requireSupabase, validateRequest(profileUpdateSchema), async (req, res) => {
  const { id, name, phone } = req.body;
  try {
    const r = await axios.patch(
      `${supabaseConfig.supabaseUrl}/rest/v1/profiles?id=eq.${id}`,
      { name, phone },
      { headers: sbHeaders(), timeout: 5000 }
    );
    if (r.data?.[0]) return res.json(r.data[0]);
  } catch {}
  return res.status(404).json({ error: 'Profile not found' });
});

// === Borrowers ===

app.get('/api/borrowers', authenticate, requireAdmin, requireSupabase, async (req, res) => {
  try {
    const r = await axios.get(
      `${supabaseConfig.supabaseUrl}/rest/v1/profiles?role=eq.borrower&select=*`,
      { headers: sbHeaders(), timeout: 5000 }
    );
    const borrowers = r.data || [];
    try {
      const lr = await axios.get(
        `${supabaseConfig.supabaseUrl}/rest/v1/loans?select=borrower_id,status,amount`,
        { headers: sbHeaders(), timeout: 5000 }
      );
      const loans = lr.data || [];
      for (const b of borrowers) {
        const bLoans = loans.filter(l => l.borrower_id === b.id);
        b.total_loans = bLoans.length;
        b.active_loans = bLoans.filter(l => l.status === 'approved' || l.status === 'pending').length;
        b.total_borrowed = bLoans.reduce((s, l) => s + Number(l.amount), 0);
      }
    } catch {}
    res.json(borrowers);
  } catch {
    res.json([]);
  }
});

app.delete('/api/borrowers/:id', authenticate, requireAdmin, requireSupabase, async (req, res) => {
  if (req.user.id === req.params.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  try {
    const loans = await axios.get(
      `${supabaseConfig.supabaseUrl}/rest/v1/loans?borrower_id=eq.${encodeURIComponent(req.params.id)}&status=in.(pending,approved)&select=id`,
      { headers: sbHeaders(), timeout: 5000 }
    );
    if (loans.data?.length > 0) {
      return res.status(400).json({ error: 'Cannot delete borrower with active loans' });
    }
  } catch {}

  let profileDeleted = false;
  try {
    await axios.delete(`${supabaseConfig.supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(req.params.id)}`, { headers: sbHeaders(), timeout: 5000 });
    profileDeleted = true;
  } catch {}

  try {
    await axios.delete(`${supabaseConfig.supabaseUrl}/auth/v1/admin/users/${req.params.id}`, { headers: sbHeaders(), timeout: 5000 });
    res.json({ success: true });
  } catch (e) {
    if (profileDeleted) {
      logSafe('Borrower delete', `Profile deleted but auth user deletion failed: ${e.message}`);
      return res.status(207).json({ success: false, warning: 'Profile deleted but user account could not be removed. Contact support.' });
    }
    res.status(500).json({ error: 'Failed to delete borrower' });
  }
});

// === Payment Methods ===

app.get('/api/payment-methods', authenticate, requireSupabase, async (req, res) => {
  try {
    const r = await axios.get(
      `${supabaseConfig.supabaseUrl}/rest/v1/app_data?key=eq._payment_methods&select=value`,
      { headers: sbHeaders(), timeout: 5000 }
    );
    res.json(r.data?.[0]?.value || []);
  } catch {
    res.json([]);
  }
});

app.get('/api/admin/payment-methods', authenticate, requireAdmin, requireSupabase, async (req, res) => {
  try {
    const r = await axios.get(
      `${supabaseConfig.supabaseUrl}/rest/v1/app_data?key=eq._payment_methods&select=value`,
      { headers: sbHeaders(), timeout: 5000 }
    );
    res.json(r.data?.[0]?.value || []);
  } catch {
    res.json([]);
  }
});

app.put('/api/admin/payment-methods', authenticate, requireAdmin, requireSupabase, validateRequest(paymentMethodSchema), async (req, res) => {
  const data = pick(req.body, ALLOWED_PAYMENT_METHOD_FIELDS);
  const pm = { id: crypto.randomUUID(), ...data };
  try {
    const r = await axios.get(
      `${supabaseConfig.supabaseUrl}/rest/v1/app_data?key=eq._payment_methods&select=value`,
      { headers: sbHeaders(), timeout: 5000 }
    );
    const existing = r.data?.[0]?.value || [];
    
    // Check for duplicate account_number
    if (existing.some(p => p.account_number === data.account_number)) {
      return res.status(400).json({ error: 'This account number is already registered to another payment method' });
    }
    
    existing.push(pm);
    await axios.post(
      `${supabaseConfig.supabaseUrl}/rest/v1/app_data`,
      { key: '_payment_methods', value: existing },
      { headers: { ...sbHeaders(), Prefer: 'return=representation,resolution=merge-duplicates' }, timeout: 5000 }
    );
    res.status(201).json(pm);
  } catch {
    res.status(500).json({ error: 'Failed to save payment method' });
  }
});

app.delete('/api/admin/payment-methods/:id', authenticate, requireAdmin, requireSupabase, async (req, res) => {
  const pid = req.params.id;
  try {
    const r = await axios.get(
      `${supabaseConfig.supabaseUrl}/rest/v1/app_data?key=eq._payment_methods&select=value`,
      { headers: sbHeaders(), timeout: 5000 }
    );
    const existing = (r.data?.[0]?.value || []).filter(p => String(p.id) !== String(pid));
    await axios.post(
      `${supabaseConfig.supabaseUrl}/rest/v1/app_data`,
      { key: '_payment_methods', value: existing },
      { headers: { ...sbHeaders(), Prefer: 'return=representation,resolution=merge-duplicates' }, timeout: 5000 }
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete payment method' });
  }
});

// === Borrower KYC ===

const kycBodyLimit = express.json({ limit: '50mb' });

app.put('/api/borrowers/:id/kyc', kycBodyLimit, authenticate, requireSameUserOrAdmin, requireSupabase, validateRequest(kycSchema), async (req, res) => {
  const data = pick(req.body, ALLOWED_KYC_FIELDS);
  const isAdminAction = req.body.kyc_status !== undefined && req.user.role === 'admin';
  if (req.body.kyc_status !== undefined && !isAdminAction) {
    return res.status(403).json({ error: 'Only admin can set KYC status' });
  }
  if (data.kyc_status === undefined) data.kyc_status = 'pending';

  // Pre-check uniqueness for phone, name, id_number, qr_data, id_image
  const uniqueFields = ['phone', 'name', 'id_number', 'qr_data', 'id_image'];
  for (const field of uniqueFields) {
    if (data[field]) {
      try {
        const existing = await axios.get(
          `${supabaseConfig.supabaseUrl}/rest/v1/profiles?${field}=eq.${encodeURIComponent(data[field])}&select=id`,
          { headers: sbHeaders(), timeout: 3000 }
        );
        if (existing.data?.length > 0 && existing.data[0].id !== req.params.id) {
          const labels = { phone: 'Phone number', name: 'Name', id_number: 'ID number', qr_data: 'QR image', id_image: 'ID image' };
          return res.status(400).json({ error: `This ${labels[field]} is already registered to another borrower` });
        }
      } catch {}
    }
  }

  try {
    const supabaseFields = ['name', 'phone', 'address', 'id_type', 'id_number', 'id_image', 'selfie_image', 'bank_name', 'bank_account', 'account_holder', 'account_number', 'qr_data', 'kyc_status'];
    const supabaseData = {};
    for (const key of supabaseFields) {
      if (data[key] !== undefined) supabaseData[key] = data[key];
    }
    if (Object.keys(supabaseData).length > 0) {
      const r = await axios.patch(
        `${supabaseConfig.supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(req.params.id)}`,
        supabaseData,
        { headers: sbHeaders(), timeout: 10000 }
      );
      if (data.kyc_status === 'pending' && req.user.role !== 'admin') {
        const borrowerName = data.name || req.user.email || 'A borrower';
        createNotification({
          title: 'New KYC Submission',
          message: `${borrowerName} submitted their KYC for review.`,
          type: 'kyc',
          from_user_id: req.params.id,
          link: '/admin/kyc',
        });
      }
      return res.json({ success: true, profile: r.data?.[0] || supabaseData });
    }
    return res.json({ success: true });
  } catch (e) {
    if (e.response?.status === 409) {
      const msg = e.response?.data?.message || '';
      if (msg.includes('profiles_phone_unique') || msg.includes('phone'))
        return res.status(400).json({ error: 'This phone number is already registered to another borrower' });
      if (msg.includes('profiles_qr_data_unique') || msg.includes('qr_data'))
        return res.status(400).json({ error: 'This QR image is already registered to another borrower' });
      if (msg.includes('profiles_id_number_unique') || msg.includes('id_number'))
        return res.status(400).json({ error: 'This ID number is already registered to another borrower' });
      if (msg.includes('profiles_id_image_unique') || msg.includes('id_image'))
        return res.status(400).json({ error: 'This ID image is already registered to another borrower' });
      if (msg.includes('profiles_name_unique') || msg.includes('name'))
        return res.status(400).json({ error: 'This name is already registered to another borrower' });
    }
    logSafe('KYC update', e.message);
    return res.status(500).json({ error: 'Failed to update KYC' });
  }
});

// === Notifications ===

const READ_NOTIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function purgeOldReadNotifications() {
  try {
    const cutoff = new Date(Date.now() - READ_NOTIFICATION_TTL_MS).toISOString();
    const r = await axios.delete(
      `${supabaseConfig.supabaseUrl}/rest/v1/notifications?is_read=eq.true&created_at=lt.${cutoff}`,
      { headers: sbHeaders(), timeout: 5000 }
    );
    logSafe('Notification purge', `Removed ${r.data?.length ?? 0} old read notifications`);
    return r.data?.length ?? 0;
  } catch (e) {
    logSafe('Notification purge', e.message);
    return 0;
  }
}

app.get('/api/notifications', authenticate, requireAdmin, requireSupabase, async (req, res) => {
  purgeOldReadNotifications();
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const r = await axios.get(
      `${supabaseConfig.supabaseUrl}/rest/v1/notifications?order=created_at.desc&limit=${limit}`,
      { headers: sbHeaders(), timeout: 5000 }
    );
    res.json(r.data || []);
  } catch {
    res.json([]);
  }
});

app.get('/api/notifications/unread-count', authenticate, requireAdmin, requireSupabase, async (req, res) => {
  try {
    const r = await axios.get(
      `${supabaseConfig.supabaseUrl}/rest/v1/notifications?is_read=eq.false&select=id`,
      { headers: sbHeaders(), timeout: 5000 }
    );
    res.json({ count: r.data?.length || 0 });
  } catch {
    res.json({ count: 0 });
  }
});

app.put('/api/notifications/:id/read', authenticate, requireAdmin, requireSupabase, async (req, res) => {
  try {
    await axios.patch(
      `${supabaseConfig.supabaseUrl}/rest/v1/notifications?id=eq.${encodeURIComponent(req.params.id)}`,
      { is_read: true },
      { headers: sbHeaders(), timeout: 5000 }
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

app.put('/api/notifications/read-all', authenticate, requireAdmin, requireSupabase, async (req, res) => {
  try {
    await axios.patch(
      `${supabaseConfig.supabaseUrl}/rest/v1/notifications?is_read=eq.false`,
      { is_read: true },
      { headers: sbHeaders(), timeout: 5000 }
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// --- Start Server ---

const bindHost = IS_PRODUCTION ? '0.0.0.0' : '127.0.0.1';
app.listen(PORT, bindHost, () => {
  console.log(`Loan API running on http://${bindHost}:${PORT}`);
  console.log(`Environment: ${IS_PRODUCTION ? 'production' : 'development'}`);
  console.log(`CORS origins: ${ALLOWED_ORIGINS.join(', ')}`);
});

// Periodically purge read notifications older than 24 hours.
const PURGE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
setInterval(purgeOldReadNotifications, PURGE_INTERVAL_MS);
setTimeout(purgeOldReadNotifications, 30 * 1000); // shortly after boot
