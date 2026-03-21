-- =============================================================================
-- Migration: Add completion/archive fields to savings_goals
-- Run in Supabase Dashboard → SQL Editor → New Query
-- =============================================================================

alter table public.savings_goals
  add column if not exists is_completed boolean not null default false,
  add column if not exists is_archived  boolean not null default false,
  add column if not exists completed_at timestamptz;
