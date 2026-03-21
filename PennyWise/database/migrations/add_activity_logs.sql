-- =============================================================================
-- Migration: Create activity_logs table for transaction history tracking
-- Run in Supabase Dashboard → SQL Editor → New Query
-- =============================================================================

create table public.activity_logs (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  action_type  text        not null,
  -- e.g. INCOME_CATEGORY_CREATED | INCOME_SOURCE_ADDED | INCOME_SOURCE_UPDATED
  --      INCOME_CATEGORY_ARCHIVED | EXPENSE_CATEGORY_CREATED | EXPENSE_ADDED
  --      EXPENSE_UPDATED | EXPENSE_CATEGORY_ARCHIVED
  --      SAVINGS_GOAL_CREATED | SAVINGS_GOAL_FUNDED | SAVINGS_GOAL_COMPLETED
  entity_type  text        not null,
  -- e.g. income_category | income_source | expense_category | expense | savings_goal
  title        text        not null,
  description  text        not null default '',
  icon         text        not null default 'receipt-outline',
  created_at   timestamptz not null default now()
);

alter table public.activity_logs enable row level security;

create policy "Users manage own activity logs"
  on public.activity_logs for all
  using (auth.uid() = user_id);
