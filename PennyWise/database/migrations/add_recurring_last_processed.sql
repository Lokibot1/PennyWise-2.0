-- Tracks the last time recurring entries were auto-processed for each row.
-- Run in Supabase Dashboard → SQL Editor → New Query.

alter table public.expenses
  add column if not exists last_processed_at timestamptz;

alter table public.income_sources
  add column if not exists last_processed_at timestamptz;
