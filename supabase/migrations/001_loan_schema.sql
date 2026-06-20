-- Loan Management App Schema
-- Run this in Supabase SQL Editor after creating a project

-- Add KYC and bank fields to profiles
alter table profiles add column if not exists address text default '';
alter table profiles add column if not exists id_type text default '';
alter table profiles add column if not exists id_number text default '';
alter table profiles add column if not exists bank_name text default '';
alter table profiles add column if not exists bank_account text default '';
alter table profiles add column if not exists qr_data text default '';

-- Update role check constraint to include 'borrower'
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('admin', 'cook', 'user', 'borrower'));

-- Loan products table
create table if not exists loan_products (
  id bigserial primary key,
  name text not null,
  description text default '',
  interest_type text not null check (interest_type in ('daily', 'weekly', 'monthly')),
  interest_rate numeric(5,2) not null,
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

-- RLS for loan_products
alter table loan_products enable row level security;

create policy "Anyone can view active loan products"
  on loan_products for select
  using (is_active = true);

create policy "Admins can view all loan products"
  on loan_products for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can insert loan products"
  on loan_products for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can update loan products"
  on loan_products for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can delete loan products"
  on loan_products for delete
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- RLS for loans
alter table loans enable row level security;

create policy "Borrowers can view own loans"
  on loans for select
  using (borrower_id = auth.uid());

create policy "Admins can view all loans"
  on loans for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Borrowers can insert own loans"
  on loans for insert
  with check (borrower_id = auth.uid());

create policy "Admins can update loans"
  on loans for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- RLS for loan_payments
alter table loan_payments enable row level security;

create policy "Borrowers can view own loan payments"
  on loan_payments for select
  using (exists (select 1 from loans where id = loan_id and borrower_id = auth.uid()));

create policy "Admins can view all loan payments"
  on loan_payments for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can insert loan payments"
  on loan_payments for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can update loan payments"
  on loan_payments for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Seed initial admin user (run AFTER creating user in Auth UI)
-- insert into profiles (id, name, role, is_active)
-- values ('<admin-user-uuid>', 'Admin User', 'admin', true);
