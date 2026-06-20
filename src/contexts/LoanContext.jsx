import { createContext, useContext, useState, useCallback } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api'

const LoanContext = createContext(null)

export function LoanProvider({ children }) {
  const [loading, setLoading] = useState(false)

  const getLoanProducts = useCallback(async (all = false) => {
    return await apiGet(`/loan/products${all ? '?all=true' : ''}`)
  }, [])

  const createProduct = useCallback(async (product) => {
    return await apiPost('/loan/products', product)
  }, [])

  const updateProduct = useCallback(async (id, data) => {
    return await apiPut(`/loan/products/${id}`, data)
  }, [])

  const deleteProduct = useCallback(async (id) => {
    return await apiDelete(`/loan/products/${id}`)
  }, [])

  const getLoans = useCallback(async (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.borrowerId) params.set('borrowerId', filters.borrowerId)
    if (filters.status) params.set('status', filters.status)
    const qs = params.toString()
    return await apiGet(`/loans${qs ? '?' + qs : ''}`)
  }, [])

  const getLoanStats = useCallback(async () => {
    return await apiGet('/loans/stats')
  }, [])

  const getBorrowerStats = useCallback(async (borrowerId) => {
    return await apiGet(`/loans/borrower-stats/${borrowerId}`)
  }, [])

  const applyLoan = useCallback(async (loanData) => {
    return await apiPost('/loans', loanData)
  }, [])

  const approveLoan = useCallback(async (id, approvedBy) => {
    return await apiPost(`/loans/${id}/approve`, { approved_by: approvedBy })
  }, [])

  const rejectLoan = useCallback(async (id, reason) => {
    return await apiPost(`/loans/${id}/reject`, { reason })
  }, [])

  const recordPayment = useCallback(async (id, amount, note) => {
    return await apiPost(`/loans/${id}/pay`, { amount, note })
  }, [])

  const updateLoan = useCallback(async (id, data) => {
    return await apiPut(`/loans/${id}`, data)
  }, [])

  const getBorrowers = useCallback(async () => {
    return await apiGet('/borrowers')
  }, [])

  const updateKYC = useCallback(async (borrowerId, data) => {
    return await apiPut(`/borrowers/${borrowerId}/kyc`, data)
  }, [])

  return (
    <LoanContext.Provider value={{
      loading, setLoading,
      getLoanProducts, createProduct, updateProduct, deleteProduct,
      getLoans, getLoanStats, getBorrowerStats,
      applyLoan, approveLoan, rejectLoan, recordPayment, updateLoan,
      getBorrowers, updateKYC,
    }}>
      {children}
    </LoanContext.Provider>
  )
}

export const useLoan = () => useContext(LoanContext)
