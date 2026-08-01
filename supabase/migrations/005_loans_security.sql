-- Close direct borrower loan insertion.
-- Run this in the Supabase SQL Editor.

-- Borrowers must NOT be able to insert loans directly via the anon key.
-- All loan creation goes through the backend (/api/loans) which uses the
-- service role and enforces KYC, active-loan, and amount validation.
drop policy if exists "Borrowers can insert own loans" on loans;

-- Optional hardening: borrowers also should not be able to delete loans.
drop policy if exists "Borrowers can delete own loans" on loans;
