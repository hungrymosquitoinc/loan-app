-- Align notifications.read -> is_read (backend queries is_read).
-- Run this in the Supabase SQL Editor.

alter table notifications rename column read to is_read;
