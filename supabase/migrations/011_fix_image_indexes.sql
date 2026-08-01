-- Fix: base64 image data is too large for B-tree indexes.
-- Replace with md5 hash indexes that fit within the 8KB index limit.
-- Run this in the Supabase SQL Editor.

-- Drop the broken indexes
drop index if exists idx_profiles_id_image_unique;
drop index if exists idx_profiles_qr_data_unique;

-- Create hash-based unique indexes
create unique index idx_profiles_id_image_unique on profiles (md5(id_image))
  where id_image != '';

create unique index idx_profiles_qr_data_unique on profiles (md5(qr_data))
  where qr_data != '';
