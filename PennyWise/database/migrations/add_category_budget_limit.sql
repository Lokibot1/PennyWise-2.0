-- Adds a per-category monthly budget limit to expense_categories.
-- Run in Supabase Dashboard → SQL Editor → New Query.

alter table public.expense_categories
  add column if not exists budget_limit numeric;
