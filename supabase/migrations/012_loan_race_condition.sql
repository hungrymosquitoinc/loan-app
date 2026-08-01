-- Prevent race conditions on loan creation and payments.
-- Run this in the Supabase SQL Editor.

-- 1) Only one active loan per borrower (pending or approved)
create unique index if not exists idx_loans_one_active_per_borrower
  on loans (borrower_id)
  where status in ('pending', 'approved');
