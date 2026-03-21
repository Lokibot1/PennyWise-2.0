-- =============================================================================
-- PennyWise 2.0 — Supabase Database Schema
-- =============================================================================
-- Run this entire file in your Supabase project:
--   Dashboard → SQL Editor → New Query → paste & run
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES
-- Extends Supabase Auth (auth.users). Created automatically on sign-up.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.profiles (
  id              uuid        primary key references auth.users(id) on delete cascade,
  full_name       text        not null default '',
  email           text        not null default '',
  phone           text,
  date_of_birth   date,
  avatar_url      text,
  theme           text        not null default 'light' check (theme in ('light', 'dark')),
  budget_limit    numeric     not null default 20000,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-insert a profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ─────────────────────────────────────────────────────────────────────────────
-- TRANSACTIONS
-- Used by the Transactions tab — unified income/expense list with archive
-- and recurring support.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.transactions (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  icon          text        not null default 'receipt-outline',
  title         text        not null,
  description   text        not null default '',
  category      text        not null default 'Other',
  value         numeric     not null,   -- positive = income, negative = expense
  date          date        not null default current_date,
  time          text        not null default to_char(now(), 'HH24:MI'),
  is_archived   boolean     not null default false,
  is_recurring  boolean     not null default false,
  frequency     text        check (frequency in ('Daily', 'Weekly', 'Monthly', 'Yearly')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- EXPENSE CATEGORIES
-- Used by the Budget tab — user-defined expense categories with archive.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.expense_categories (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  label       text        not null,
  icon        text        not null default 'receipt-outline',
  is_archived boolean     not null default false,
  created_at  timestamptz not null default now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- EXPENSES
-- Individual expense entries linked to a category (Budget tab).
-- ─────────────────────────────────────────────────────────────────────────────
create table public.expenses (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  category_id   uuid        not null references public.expense_categories(id) on delete cascade,
  title         text        not null,
  amount        numeric     not null check (amount > 0),
  date          date        not null,
  time          text        not null,
  description   text        not null default '',
  is_recurring  boolean     not null default false,
  frequency     text        check (frequency in ('Daily', 'Weekly', 'Monthly', 'Yearly')),
  is_archived   boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- INCOME CATEGORIES
-- Used by the Analytics tab — user-defined income source categories.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.income_categories (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  label       text        not null,
  icon        text        not null default 'cash-outline',
  is_archived boolean     not null default false,
  created_at  timestamptz not null default now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- INCOME SOURCES
-- Individual income entries linked to a category (Analytics tab).
-- ─────────────────────────────────────────────────────────────────────────────
create table public.income_sources (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  category_id   uuid        not null references public.income_categories(id) on delete cascade,
  title         text        not null,
  amount        numeric     not null check (amount > 0),
  date          date        not null,
  time          text        not null,
  description   text        not null default '',
  is_recurring  boolean     not null default false,
  frequency     text        check (frequency in ('Daily', 'Weekly', 'Monthly', 'Yearly')),
  is_archived   boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- SAVINGS GOALS
-- Displayed on the Home dashboard savings card.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.savings_goals (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.profiles(id) on delete cascade,
  title          text        not null default 'Savings On Goals',
  icon           text        not null default 'car-outline',
  target_amount  numeric     not null default 0,
  current_amount numeric     not null default 0,
  is_completed   boolean     not null default false,
  is_archived    boolean     not null default false,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- ACTIVITY LOGS
-- Audit trail of user actions across Income, Expenses, and Savings Goals.
-- Written to by the app after successful Supabase mutations.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.activity_logs (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  action_type  text        not null,
  -- INCOME_CATEGORY_CREATED | INCOME_SOURCE_ADDED | INCOME_SOURCE_UPDATED
  -- INCOME_CATEGORY_ARCHIVED | EXPENSE_CATEGORY_CREATED | EXPENSE_ADDED
  -- EXPENSE_UPDATED | EXPENSE_CATEGORY_ARCHIVED
  -- SAVINGS_GOAL_CREATED | SAVINGS_GOAL_FUNDED | SAVINGS_GOAL_COMPLETED
  entity_type  text        not null,
  -- income_category | income_source | expense_category | expense | savings_goal
  title        text        not null,
  description  text        not null default '',
  icon         text        not null default 'receipt-outline',
  created_at   timestamptz not null default now()
);


-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Every user can only read/write their own data.
-- =============================================================================

alter table public.profiles           enable row level security;
alter table public.transactions       enable row level security;
alter table public.expense_categories enable row level security;
alter table public.expenses           enable row level security;
alter table public.income_categories  enable row level security;
alter table public.income_sources     enable row level security;
alter table public.savings_goals      enable row level security;
alter table public.activity_logs      enable row level security;

-- profiles
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- transactions
create policy "Users manage own transactions"
  on public.transactions for all
  using (auth.uid() = user_id);

-- expense_categories
create policy "Users manage own expense categories"
  on public.expense_categories for all
  using (auth.uid() = user_id);

-- expenses
create policy "Users manage own expenses"
  on public.expenses for all
  using (auth.uid() = user_id);

-- income_categories
create policy "Users manage own income categories"
  on public.income_categories for all
  using (auth.uid() = user_id);

-- income_sources
create policy "Users manage own income sources"
  on public.income_sources for all
  using (auth.uid() = user_id);

-- savings_goals
create policy "Users manage own savings goals"
  on public.savings_goals for all
  using (auth.uid() = user_id);

-- activity_logs
create policy "Users manage own activity logs"
  on public.activity_logs for all
  using (auth.uid() = user_id);


-- =============================================================================
-- AUTO-UPDATE updated_at TRIGGER
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

create trigger set_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

create trigger set_updated_at
  before update on public.income_sources
  for each row execute function public.set_updated_at();

create trigger set_updated_at
  before update on public.savings_goals
  for each row execute function public.set_updated_at();


-- =============================================================================
-- ENTITY RELATIONSHIP SUMMARY
-- ==============================================================================
--
--   auth.users
--       └── profiles (1:1, auto-created on sign-up)
--               ├── transactions       (1:many)
--               ├── expense_categories (1:many)
--               │       └── expenses   (1:many)
--               ├── income_categories  (1:many)
--               │       └── income_sources (1:many)
--               └── savings_goals      (1:many)
--
-- =============================================================================
