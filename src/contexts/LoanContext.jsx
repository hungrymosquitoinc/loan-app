import { createContext, useContext, useState, useCallback } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api'

const LoanContext = createContext(null)

export function LoanProvider({ children }) {
  const [loading, setLoading] = useState(false)

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

  const approveLoan = useCallback(async (id, data) => {
    return await apiPost(`/loans/${id}/approve`, data)
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

  const deleteBorrower = useCallback(async (borrowerId) => {
    return await apiDelete(`/borrowers/${borrowerId}`)
  }, [])

  return (
    <LoanContext.Provider value={{
      loading, setLoading,
      getLoans, getLoanStats, getBorrowerStats,
      applyLoan, approveLoan, rejectLoan, recordPayment, updateLoan,
      getBorrowers, updateKYC, deleteBorrower,
    }}>
      {children}
    </LoanContext.Provider>
  )
}

export const useLoan = () => useContext(LoanContext)
