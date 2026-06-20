import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LoanProvider } from './contexts/LoanContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import BorrowerDashboard from './pages/BorrowerDashboard'
import ApplyLoan from './pages/ApplyLoan'
import MyLoans from './pages/MyLoans'
import LoanDetail from './pages/LoanDetail'
import BorrowerKYC from './pages/BorrowerKYC'
import AdminLoanDashboard from './pages/AdminLoanDashboard'
import AdminLoanProducts from './pages/AdminLoanProducts'
import AdminLoanApplications from './pages/AdminLoanApplications'
import AdminBorrowers from './pages/AdminBorrowers'
import AdminProfile from './pages/AdminProfile'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <LoanProvider>
          <div className="app">
            <Navbar />
            <main className="main-content">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={<ProtectedRoute><BorrowerDashboard /></ProtectedRoute>} />
                <Route path="/apply-loan" element={<ProtectedRoute><ApplyLoan /></ProtectedRoute>} />
                <Route path="/my-loans" element={<ProtectedRoute><MyLoans /></ProtectedRoute>} />
                <Route path="/my-loans/:id" element={<ProtectedRoute><LoanDetail /></ProtectedRoute>} />
                <Route path="/kyc" element={<ProtectedRoute><BorrowerKYC /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute adminOnly><AdminLoanDashboard /></ProtectedRoute>} />
                <Route path="/admin/loan-products" element={<ProtectedRoute adminOnly><AdminLoanProducts /></ProtectedRoute>} />
                <Route path="/admin/loan-applications" element={<ProtectedRoute adminOnly><AdminLoanApplications /></ProtectedRoute>} />
                <Route path="/admin/borrowers" element={<ProtectedRoute adminOnly><AdminBorrowers /></ProtectedRoute>} />
                <Route path="/admin/profile" element={<ProtectedRoute adminOnly><AdminProfile /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </LoanProvider>
      </AuthProvider>
    </HashRouter>
  )
}
