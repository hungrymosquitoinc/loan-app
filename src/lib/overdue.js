// Shared overdue calculations for loan schedules and dashboards.
// Mirrors the payment-schedule generation in LoanDetail / MyLoans / AdminLoans so
// the dashboard and the schedule always agree on when a loan went past its term.

export function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function daysBetween(from, to) {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * The final scheduled due date of a loan, derived from the same fields the
 * payment schedule uses: start date, frequency and number of payment slots.
 * Returns null when the loan has no schedule yet (e.g. still pending).
 */
export function getLastDueDate(loan) {
  if (!loan) return null
  const totalSlots = Number(loan.num_payments) || 0
  if (totalSlots < 1) return null

  const startDate = loan.approved_at ? new Date(loan.approved_at) : new Date(loan.applied_at)
  if (isNaN(startDate.getTime())) return null

  const freq = loan.frequency || 'daily'
  const d = new Date(startDate)
  const i = totalSlots - 1
  if (freq === 'weekly') d.setDate(d.getDate() + i * 7)
  else if (freq === 'monthly') d.setMonth(d.getMonth() + i)
  else d.setDate(d.getDate() + i)
  return d
}

/**
 * Overdue state for a loan as of `now`.
 *
 * overdue  – past the last due date and still owing money
 * days     – whole days elapsed since the last due date (0 when not past term)
 * balance  – amount still outstanding (total_payable - paid_amount)
 * lastDue  – final scheduled due date, or null when the loan has no schedule
 */
export function getOverdueInfo(loan, now = new Date()) {
  const totalPayable = Number(loan?.total_payable) || 0
  const paid = Number(loan?.paid_amount) || 0
  const balance = Math.max(0, totalPayable - paid)
  const lastDue = getLastDueDate(loan)

  if (!lastDue) return { overdue: false, days: 0, balance, lastDue: null }

  const days = Math.max(0, daysBetween(lastDue, now))
  return {
    overdue: balance > 0 && days > 0,
    days,
    balance,
    lastDue,
  }
}
