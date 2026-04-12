/**
 * PennyWise — Data Cache Helpers
 *
 * Typed fetch-or-cache functions for every frequently-accessed resource.
 * Each function:
 *   - Returns cached data immediately if fresh
 *   - Falls back to Supabase and caches the result on miss / expiry
 *
 * TTLs:
 *   profile          — 5 min  (rarely changes)
 *   income_categories — 5 min (rarely changes)
 *   expense_categories — 5 min
 *   income_sources    — 2 min (changes often)
 *   expenses          — 2 min
 *   savings_goals     — 2 min
 *
 * Invalidation helpers (call after every write):
 *   DataCache.invalidateProfile(userId)
 *   DataCache.invalidateIncomeCategories(userId)
 *   DataCache.invalidateExpenseCategories(userId)
 *   DataCache.invalidateIncomeSources(userId)
 *   DataCache.invalidateExpenses(userId)
 *   DataCache.invalidateSavingsGoals(userId)
 *   DataCache.invalidateAll(userId)   — clears everything for this user
 */

import { supabase } from '@/lib/supabase';
import { Cache } from '@/lib/cache';
import { isOnline } from '@/lib/network';

// ── TTL constants (seconds) ────────────────────────────────────────────────────
const TTL_STATIC   = 5 * 60;   // 5 min — profile, categories
const TTL_DYNAMIC  = 2 * 60;   // 2 min — income, expenses, goals

// ── Key builders ───────────────────────────────────────────────────────────────
const keys = {
  profile:           (uid: string) => `profile:${uid}`,
  incomeCategories:  (uid: string) => `income_categories:${uid}`,
  expenseCategories: (uid: string) => `expense_categories:${uid}`,
  incomeSources:     (uid: string) => `income_sources:${uid}`,
  expenses:          (uid: string) => `expenses:${uid}`,
  savingsGoals:      (uid: string) => `savings_goals:${uid}`,
};

// ── Types (mirror what each screen uses) ──────────────────────────────────────
export type CachedProfile = {
  full_name:    string;
  budget_limit: number;
  email:        string;
  phone:        string;
  avatar_url:   string | null;
};

export type CachedCategory = {
  id:          string;
  label:       string;
  icon:        string;
  is_archived: boolean;
};

export type CachedIncomeSource = {
  id:           string;
  category_id:  string;
  title:        string;
  amount:       number;
  date:         string;
  time:         string;
  description:  string;
  is_recurring: boolean;
  frequency:    string | null;
  is_archived:  boolean;
  created_at?:  string;
};

export type CachedExpense = {
  id:           string;
  category_id:  string;
  title:        string;
  amount:       number;
  date:         string;
  time:         string;
  description:  string;
  is_recurring: boolean;
  frequency:    string | null;
  is_archived:  boolean;
  created_at?:  string;
};

export type CachedSavingsGoal = {
  id:             string;
  title:          string;
  icon:           string;
  target_amount:  number;
  current_amount: number;
  is_completed:   boolean;
  is_archived:    boolean;
  completed_at:   string | null;
  created_at:     string;
};

// ── Fetch helpers ──────────────────────────────────────────────────────────────
export const DataCache = {

  // ── Profile ────────────────────────────────────────────────────────────────
  async fetchProfile(userId: string): Promise<CachedProfile | null> {
    const key = keys.profile(userId);
    const hit = await Cache.get<CachedProfile>(key);
    if (hit) return hit;

    if (!isOnline()) return Cache.getStale<CachedProfile>(key);

    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, budget_limit, email, phone, avatar_url')
      .eq('id', userId)
      .single();

    if (error || !data) return null;
    const result: CachedProfile = {
      full_name:    data.full_name    ?? '',
      budget_limit: data.budget_limit ?? 20000,
      email:        data.email        ?? '',
      phone:        data.phone        ?? '',
      avatar_url:   data.avatar_url   ?? null,
    };
    await Cache.set(key, result, TTL_STATIC);
    return result;
  },

  invalidateProfile(userId: string) {
    Cache.invalidate(keys.profile(userId));
  },

  // ── Income categories ──────────────────────────────────────────────────────
  async fetchIncomeCategories(userId: string): Promise<CachedCategory[]> {
    const key = keys.incomeCategories(userId);
    const hit = await Cache.get<CachedCategory[]>(key);
    if (hit) return hit;

    if (!isOnline()) return (await Cache.getStale<CachedCategory[]>(key)) ?? [];

    const { data, error } = await supabase
      .from('income_categories')
      .select('id, label, icon, is_archived')
      .eq('user_id', userId);

    if (error || !data) return [];
    await Cache.set(key, data, TTL_STATIC);
    return data as CachedCategory[];
  },

  invalidateIncomeCategories(userId: string) {
    Cache.invalidate(keys.incomeCategories(userId));
  },

  // ── Expense categories ─────────────────────────────────────────────────────
  async fetchExpenseCategories(userId: string): Promise<CachedCategory[]> {
    const key = keys.expenseCategories(userId);
    const hit = await Cache.get<CachedCategory[]>(key);
    if (hit) return hit;

    if (!isOnline()) return (await Cache.getStale<CachedCategory[]>(key)) ?? [];

    const { data, error } = await supabase
      .from('expense_categories')
      .select('id, label, icon, is_archived')
      .eq('user_id', userId);

    if (error || !data) return [];
    await Cache.set(key, data, TTL_STATIC);
    return data as CachedCategory[];
  },

  invalidateExpenseCategories(userId: string) {
    Cache.invalidate(keys.expenseCategories(userId));
  },

  // ── Income sources ─────────────────────────────────────────────────────────
  async fetchIncomeSources(userId: string): Promise<CachedIncomeSource[]> {
    const key = keys.incomeSources(userId);
    const hit = await Cache.get<CachedIncomeSource[]>(key);
    if (hit) return hit;

    if (!isOnline()) return (await Cache.getStale<CachedIncomeSource[]>(key)) ?? [];

    const { data, error } = await supabase
      .from('income_sources')
      .select('id, category_id, title, amount, date, time, description, is_recurring, frequency, is_archived, created_at')
      .eq('user_id', userId);

    if (error || !data) return [];
    await Cache.set(key, data, TTL_DYNAMIC);
    return data as CachedIncomeSource[];
  },

  invalidateIncomeSources(userId: string) {
    Cache.invalidate(keys.incomeSources(userId));
  },

  // ── Expenses ───────────────────────────────────────────────────────────────
  async fetchExpenses(userId: string): Promise<CachedExpense[]> {
    const key = keys.expenses(userId);
    const hit = await Cache.get<CachedExpense[]>(key);
    if (hit) return hit;

    if (!isOnline()) return (await Cache.getStale<CachedExpense[]>(key)) ?? [];

    const { data, error } = await supabase
      .from('expenses')
      .select('id, category_id, title, amount, date, time, description, is_recurring, frequency, is_archived, created_at')
      .eq('user_id', userId);

    if (error || !data) return [];
    await Cache.set(key, data, TTL_DYNAMIC);
    return data as CachedExpense[];
  },

  invalidateExpenses(userId: string) {
    Cache.invalidate(keys.expenses(userId));
  },

  // ── Savings goals ──────────────────────────────────────────────────────────
  async fetchSavingsGoals(userId: string): Promise<CachedSavingsGoal[]> {
    const key = keys.savingsGoals(userId);
    const hit = await Cache.get<CachedSavingsGoal[]>(key);
    if (hit) return hit;

    if (!isOnline()) return (await Cache.getStale<CachedSavingsGoal[]>(key)) ?? [];

    const { data, error } = await supabase
      .from('savings_goals')
      .select('id, title, icon, target_amount, current_amount, is_completed, is_archived, completed_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    await Cache.set(key, data, TTL_DYNAMIC);
    return data as CachedSavingsGoal[];
  },

  invalidateSavingsGoals(userId: string) {
    Cache.invalidate(keys.savingsGoals(userId));
  },

  // ── Home dashboard (joined income + expenses + goals + profile) ───────────
  // Cached as a single entry so the home tab only does 1 cache lookup on focus.
  async fetchDashboard(userId: string): Promise<{
    profile:      CachedProfile;
    incomeSources: Array<{ id: string; title: string; amount: number; date: string; time: string; category_label: string; category_icon: string }>;
    expenses:      Array<{ id: string; title: string; amount: number; date: string; time: string; category_label: string; category_icon: string }>;
    savingsGoals:  Array<{ id: string; icon: string; title: string; target_amount: number; current_amount: number }>;
  } | null> {
    const key = `dashboard:${userId}`;
    const hit = await Cache.get<ReturnType<typeof this.fetchDashboard> extends Promise<infer T> ? T : never>(key);
    if (hit) return hit;

    if (!isOnline()) {
      return Cache.getStale<ReturnType<typeof this.fetchDashboard> extends Promise<infer T> ? T : never>(key);
    }

    const [profileRes, incomeRes, expenseRes, goalsRes] = await Promise.all([
      supabase.from('profiles').select('full_name, budget_limit').eq('id', userId).single(),
      supabase
        .from('income_sources')
        .select('id, title, amount, date, time, income_categories(label, icon)')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('date', { ascending: false })
        .order('time', { ascending: false }),
      supabase
        .from('expenses')
        .select('id, title, amount, date, time, expense_categories(label, icon)')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('date', { ascending: false })
        .order('time', { ascending: false }),
      supabase
        .from('savings_goals')
        .select('id, icon, title, target_amount, current_amount')
        .eq('user_id', userId)
        .eq('is_completed', false)
        .eq('is_archived', false)
        .order('created_at', { ascending: false }),
    ]);

    if (profileRes.error || !profileRes.data) return null;

    const result = {
      profile: {
        full_name:    profileRes.data.full_name    ?? '',
        budget_limit: profileRes.data.budget_limit ?? 20000,
        email:        (profileRes.data as any).email      ?? '',
        phone:        (profileRes.data as any).phone      ?? '',
        avatar_url:   (profileRes.data as any).avatar_url ?? null,
      },
      incomeSources: (incomeRes.data ?? []).map((r: any) => ({
        id:             r.id,
        title:          r.title,
        amount:         Number(r.amount),
        date:           r.date,
        time:           r.time,
        category_label: r.income_categories?.label ?? 'Income',
        category_icon:  r.income_categories?.icon  ?? 'cash-outline',
      })),
      expenses: (expenseRes.data ?? []).map((r: any) => ({
        id:             r.id,
        title:          r.title,
        amount:         Number(r.amount),
        date:           r.date,
        time:           r.time,
        category_label: r.expense_categories?.label ?? 'Expense',
        category_icon:  r.expense_categories?.icon  ?? 'receipt-outline',
      })),
      savingsGoals: (goalsRes.data ?? []) as Array<{ id: string; icon: string; title: string; target_amount: number; current_amount: number }>,
    };

    await Cache.set(key, result, TTL_DYNAMIC);
    return result;
  },

  invalidateDashboard(userId: string) {
    Cache.invalidate(`dashboard:${userId}`);
  },

  // ── Invalidate everything for a user (call on sign-out) ───────────────────
  invalidateAll(userId: string) {
    Cache.invalidatePrefix(`profile:${userId}`);
    Cache.invalidatePrefix(`income_categories:${userId}`);
    Cache.invalidatePrefix(`expense_categories:${userId}`);
    Cache.invalidatePrefix(`income_sources:${userId}`);
    Cache.invalidatePrefix(`expenses:${userId}`);
    Cache.invalidatePrefix(`savings_goals:${userId}`);
    Cache.invalidate(`dashboard:${userId}`);
  },
};
