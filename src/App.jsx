import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LoanProvider } from './contexts/LoanContext'
import { NotificationProvider } from './contexts/NotificationContext'
import Navbar from './components/Navbar'
import BottomNav from './components/BottomNav'
import PageTransition from './components/PageTransition'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import ConfirmEmail from './pages/ConfirmEmail'
import BorrowerDashboard from './pages/BorrowerDashboard'
import ApplyLoan from './pages/ApplyLoan'
import MyLoans from './pages/MyLoans'
import LoanDetail from './pages/LoanDetail'
import BorrowerKYC from './pages/BorrowerKYC'
import BorrowerProfile from './pages/BorrowerProfile'
import AdminLoanDashboard from './pages/AdminLoanDashboard'
import AdminLoans from './pages/AdminLoans'
import AdminBorrowers from './pages/AdminBorrowers'
import AdminKYC from './pages/AdminKYC'
import AdminProfile from './pages/AdminProfile'
import NotFound from './pages/NotFound'

const rawHash = window.location.hash.replace(/^#\/?/, '')
const hasTokens = rawHash.includes('access_token=')
const isRecoveryUrl = hasTokens && rawHash.includes('type=recovery')
const isConfirmUrl = hasTokens && rawHash.includes('type=signup')
const isResetPage = rawHash.startsWith('reset-password')
const isForgotPage = rawHash.startsWith('forgot-password')
const showCleanAuthPage = isRecoveryUrl || isConfirmUrl || isResetPage || isForgotPage

export default function App() {
  return (
    <HashRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <AuthProvider>
        <LoanProvider>
          <NotificationProvider>
            {showCleanAuthPage ? (
            <PageTransition>
            <Routes>
              {isRecoveryUrl && <Route path="*" element={<ResetPassword rawHash={rawHash} />} />}
              {isConfirmUrl && <Route path="*" element={<ConfirmEmail />} />}
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="*" element={isConfirmUrl ? <ConfirmEmail /> : <ResetPassword rawHash={rawHash} />} />
            </Routes>
            </PageTransition>
          ) : (
            <div className="app">
              <Navbar />
              <main className="main-content">
                <PageTransition>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/" element={<ProtectedRoute><BorrowerDashboard /></ProtectedRoute>} />
                  <Route path="/apply-loan" element={<ProtectedRoute allowedRoles={['borrower']}><ApplyLoan /></ProtectedRoute>} />
                  <Route path="/my-loans" element={<ProtectedRoute><MyLoans /></ProtectedRoute>} />
                  <Route path="/my-loans/:id" element={<ProtectedRoute><LoanDetail /></ProtectedRoute>} />
                  <Route path="/kyc" element={<ProtectedRoute allowedRoles={['borrower']}><BorrowerKYC /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute allowedRoles={['borrower']}><BorrowerProfile /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute adminOnly><AdminLoanDashboard /></ProtectedRoute>} />
                  <Route path="/admin/loans" element={<ProtectedRoute adminOnly><AdminLoans /></ProtectedRoute>} />
                  <Route path="/admin/kyc" element={<ProtectedRoute adminOnly><AdminKYC /></ProtectedRoute>} />
                  <Route path="/admin/borrowers" element={<ProtectedRoute adminOnly><AdminBorrowers /></ProtectedRoute>} />
                  <Route path="/admin/profile" element={<ProtectedRoute adminOnly><AdminProfile /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                </PageTransition>
              </main>
              <BottomNav />
              <footer className="app-footer">
                © {new Date().getFullYear()} JSR Lending Inc &nbsp;|&nbsp; Created by: J.S.Rionda a.k.a r00t©™ &nbsp;|&nbsp; v1.0.2
              </footer>
            </div>
          )}
          </NotificationProvider>
        </LoanProvider>
      </AuthProvider>
    </HashRouter>
  )
}
