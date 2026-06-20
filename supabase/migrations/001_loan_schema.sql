-- Loan Management App Schema
-- Run this in Supabase SQL Editor after creating a project

-- Create profiles table
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  role text not null default 'borrower' check (role in ('admin', 'borrower')),
  phone text default '',
  is_active boolean default true,
  address text default '',
  id_type text default '',
  id_number text default '',
  bank_name text default '',
  bank_account text default '',
  qr_data text default '',
  created_at timestamptz default now()
);

-- Loan products table
create table if not exists loan_products (
  id bigserial primary key,
  name text not null,
  description text default '',
  daily_rate numeric(5,2) not null default 0,
  weekly_rate numeric(5,2) not null default 0,
  monthly_rate numeric(5,2) not null default 0,
  days integer not null,
  min_amount numeric(12,2) default 0,
  max_amount numeric(12,2) default 999999.99,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Loans table
create table if not exists loans (
  id bigserial primary key,
  borrower_id uuid references auth.users(id) on delete cascade,
  borrower_name text not null,
  product_id bigint references loan_products(id),
  amount numeric(12,2) not null,
  days integer not null,
  interest_rate numeric(5,2) not null,
  interest_type text not null,
  frequency text not null default 'daily',
  total_interest numeric(12,2) not null,
  total_payable numeric(12,2) not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'paid')),
  applied_at timestamptz default now(),
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  rejected_reason text default '',
  paid_at timestamptz,
  notes text default ''
);

-- Loan payments table
create table if not exists loan_payments (
  id bigserial primary key,
  loan_id bigint references loans(id) on delete cascade,
  amount numeric(12,2) not null,
  due_date date,
  paid_date date,
  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue')),
  note text default '',
  created_at timestamptz default now()
);

-- RLS for profiles
alter table profiles enable row level security;

drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile"
  on profiles for select
  using (id = auth.uid());

drop policy if exists "Admins can view all profiles" on profiles;
create policy "Admins can view all profiles"
  on profiles for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update
  using (id = auth.uid());

drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile"
  on profiles for insert
  with check (id = auth.uid());

-- RLS for loan_products
alter table loan_products enable row level security;

drop policy if exists "Anyone can view active loan products" on loan_products;
create policy "Anyone can view active loan products"
  on loan_products for select
  using (is_active = true);

drop policy if exists "Admins can view all loan products" on loan_products;
create policy "Admins can view all loan products"
  on loan_products for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Admins can insert loan products" on loan_products;
create policy "Admins can insert loan products"
  on loan_products for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Admins can update loan products" on loan_products;
create policy "Admins can update loan products"
  on loan_products for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Admins can delete loan products" on loan_products;
create policy "Admins can delete loan products"
  on loan_products for delete
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- RLS for loans
alter table loans enable row level security;

drop policy if exists "Borrowers can view own loans" on loans;
create policy "Borrowers can view own loans"
  on loans for select
  using (borrower_id = auth.uid());

drop policy if exists "Admins can view all loans" on loans;
create policy "Admins can view all loans"
  on loans for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Borrowers can insert own loans" on loans;
create policy "Borrowers can insert own loans"
  on loans for insert
  with check (borrower_id = auth.uid());

drop policy if exists "Admins can update loans" on loans;
create policy "Admins can update loans"
  on loans for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- RLS for loan_payments
alter table loan_payments enable row level security;

drop policy if exists "Borrowers can view own loan payments" on loan_payments;
create policy "Borrowers can view own loan payments"
  on loan_payments for select
  using (exists (select 1 from loans where id = loan_id and borrower_id = auth.uid()));

drop policy if exists "Admins can view all loan payments" on loan_payments;
create policy "Admins can view all loan payments"
  on loan_payments for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Admins can insert loan payments" on loan_payments;
create policy "Admins can insert loan payments"
  on loan_payments for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Admins can update loan payments" on loan_payments;
create policy "Admins can update loan payments"
  on loan_payments for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Seed initial admin user (run AFTER creating user in Auth UI)
-- insert into profiles (id, name, role, is_active)
-- values ('<admin-user-uuid>', 'Admin User', 'admin', true);
