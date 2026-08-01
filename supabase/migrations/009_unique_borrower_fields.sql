-- Enforce uniqueness on QR data, ID number, ID image, and name.
-- Run this in the Supabase SQL Editor.

-- 1) Unique QR data (one QR image per borrower)
create unique index idx_profiles_qr_data_unique on profiles (qr_data)
  where qr_data != '';

-- 2) Unique ID number (same ID can't be used by two borrowers)
create unique index idx_profiles_id_number_unique on profiles (id_number)
  where id_number != '';

-- 3) Unique ID image (same ID photo can't be reused)
create unique index idx_profiles_id_image_unique on profiles (id_image)
  where id_image != '';

-- 4) Unique name (one borrower per name)
create unique index idx_profiles_name_unique on profiles (name)
  where name != '';
