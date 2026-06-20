-- Add missing KYC fields to profiles table
alter table profiles add column if not exists kyc_status text default '';
alter table profiles add column if not exists id_image text default '';
alter table profiles add column if not exists selfie_image text default '';
alter table profiles add column if not exists account_holder text default '';
alter table profiles add column if not exists account_number text default '';
