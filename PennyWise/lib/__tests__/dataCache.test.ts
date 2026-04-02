import { DataCache } from '../dataCache';

// ── Mock Cache ────────────────────────────────────────────────────────────────

const mockCacheGet        = jest.fn();
const mockCacheSet        = jest.fn();
const mockCacheInvalidate = jest.fn();
const mockCacheInvalidatePrefix = jest.fn();

jest.mock('@/lib/cache', () => ({
  Cache: {
    get:              (...a: any[]) => mockCacheGet(...a),
    set:              (...a: any[]) => mockCacheSet(...a),
    invalidate:       (...a: any[]) => mockCacheInvalidate(...a),
    invalidatePrefix: (...a: any[]) => mockCacheInvalidatePrefix(...a),
  },
}));

// ── Mock Supabase ─────────────────────────────────────────────────────────────

type QueryResult = { data: any; error: any };

// Prefixed with "mock" so jest.mock factory can access it (hoisting rule)
const mockTableResults: Record<string, QueryResult> = {};
function setTable(table: string, result: QueryResult) {
  mockTableResults[table] = result;
}

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      // Inline chain builder — cannot reference outer-scope helpers in jest.mock factory
      function buildChain(t: string): any {
        const resolve = () =>
          Promise.resolve(mockTableResults[t] ?? { data: null, error: { message: 'no mock' } });
        const chain: any = new Promise((res, rej) => resolve().then(res, rej));
        ['select', 'eq', 'order', 'limit'].forEach(m => {
          chain[m] = jest.fn((..._: any[]) => buildChain(t));
        });
        chain.single = jest.fn(resolve);
        return chain;
      }
      return buildChain(table);
    }),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockCacheGet.mockResolvedValue(null); // default: cache miss
  mockCacheSet.mockResolvedValue(undefined);
});

const UID = 'user-1';

// ── fetchProfile ──────────────────────────────────────────────────────────────

describe('DataCache.fetchProfile', () => {
  it('returns cached value immediately on a hit', async () => {
    const cached = { full_name: 'Ana', budget_limit: 5000, email: 'a@b.com', phone: '', avatar_url: null };
    mockCacheGet.mockResolvedValue(cached);
    const result = await DataCache.fetchProfile(UID);
    expect(result).toEqual(cached);
    // Supabase should not be called
    const { supabase } = require('@/lib/supabase');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('fetches from Supabase on a cache miss and stores result', async () => {
    setTable('profiles', {
      data: { full_name: 'Ben', budget_limit: 8000, email: 'b@c.com', phone: '0912', avatar_url: null },
      error: null,
    });
    const result = await DataCache.fetchProfile(UID);
    expect(result?.full_name).toBe('Ben');
    expect(result?.budget_limit).toBe(8000);
    expect(mockCacheSet).toHaveBeenCalledWith(`profile:${UID}`, expect.objectContaining({ full_name: 'Ben' }), 300);
  });

  it('returns null when Supabase returns an error', async () => {
    setTable('profiles', { data: null, error: { message: 'not found' } });
    const result = await DataCache.fetchProfile(UID);
    expect(result).toBeNull();
  });

  it('fills null fields with safe defaults', async () => {
    setTable('profiles', {
      data: { full_name: null, budget_limit: null, email: null, phone: null, avatar_url: null },
      error: null,
    });
    const result = await DataCache.fetchProfile(UID);
    expect(result?.full_name).toBe('');
    expect(result?.budget_limit).toBe(20000);
    expect(result?.email).toBe('');
  });
});

// ── fetchIncomeCategories ─────────────────────────────────────────────────────

describe('DataCache.fetchIncomeCategories', () => {
  it('returns cached value on a hit', async () => {
    const cached = [{ id: 'c1', label: 'Salary', icon: 'cash', is_archived: false }];
    mockCacheGet.mockResolvedValue(cached);
    const result = await DataCache.fetchIncomeCategories(UID);
    expect(result).toEqual(cached);
  });

  it('returns [] when Supabase errors', async () => {
    setTable('income_categories', { data: null, error: { message: 'err' } });
    const result = await DataCache.fetchIncomeCategories(UID);
    expect(result).toEqual([]);
  });
});

// ── fetchExpenseCategories ────────────────────────────────────────────────────

describe('DataCache.fetchExpenseCategories', () => {
  it('returns [] when Supabase errors', async () => {
    setTable('expense_categories', { data: null, error: { message: 'err' } });
    expect(await DataCache.fetchExpenseCategories(UID)).toEqual([]);
  });
});

// ── fetchIncomeSources ────────────────────────────────────────────────────────

describe('DataCache.fetchIncomeSources', () => {
  it('uses a 2-minute TTL (120s)', async () => {
    setTable('income_sources', {
      data: [{ id: 's1', category_id: 'c1', title: 'Freelance', amount: 500,
               date: '2024-06-01', time: '08:00', description: '', is_recurring: false,
               frequency: null, is_archived: false }],
      error: null,
    });
    await DataCache.fetchIncomeSources(UID);
    expect(mockCacheSet).toHaveBeenCalledWith(
      expect.stringContaining('income_sources'),
      expect.any(Array),
      120
    );
  });
});

// ── fetchExpenses ─────────────────────────────────────────────────────────────

describe('DataCache.fetchExpenses', () => {
  it('returns [] on Supabase error', async () => {
    setTable('expenses', { data: null, error: { message: 'err' } });
    expect(await DataCache.fetchExpenses(UID)).toEqual([]);
  });
});

// ── fetchSavingsGoals ─────────────────────────────────────────────────────────

describe('DataCache.fetchSavingsGoals', () => {
  it('returns [] on Supabase error', async () => {
    setTable('savings_goals', { data: null, error: { message: 'err' } });
    expect(await DataCache.fetchSavingsGoals(UID)).toEqual([]);
  });
});

// ── Invalidation helpers ──────────────────────────────────────────────────────

describe('DataCache — invalidation', () => {
  it('invalidateProfile calls Cache.invalidate with the correct key', () => {
    DataCache.invalidateProfile(UID);
    expect(mockCacheInvalidate).toHaveBeenCalledWith(`profile:${UID}`);
  });

  it('invalidateIncomeCategories calls Cache.invalidate', () => {
    DataCache.invalidateIncomeCategories(UID);
    expect(mockCacheInvalidate).toHaveBeenCalledWith(`income_categories:${UID}`);
  });

  it('invalidateExpenseCategories calls Cache.invalidate', () => {
    DataCache.invalidateExpenseCategories(UID);
    expect(mockCacheInvalidate).toHaveBeenCalledWith(`expense_categories:${UID}`);
  });

  it('invalidateIncomeSources calls Cache.invalidate', () => {
    DataCache.invalidateIncomeSources(UID);
    expect(mockCacheInvalidate).toHaveBeenCalledWith(`income_sources:${UID}`);
  });

  it('invalidateExpenses calls Cache.invalidate', () => {
    DataCache.invalidateExpenses(UID);
    expect(mockCacheInvalidate).toHaveBeenCalledWith(`expenses:${UID}`);
  });

  it('invalidateSavingsGoals calls Cache.invalidate', () => {
    DataCache.invalidateSavingsGoals(UID);
    expect(mockCacheInvalidate).toHaveBeenCalledWith(`savings_goals:${UID}`);
  });

  it('invalidateDashboard calls Cache.invalidate with dashboard key', () => {
    DataCache.invalidateDashboard(UID);
    expect(mockCacheInvalidate).toHaveBeenCalledWith(`dashboard:${UID}`);
  });

  it('invalidateAll calls invalidatePrefix for all resource types', () => {
    DataCache.invalidateAll(UID);
    expect(mockCacheInvalidatePrefix).toHaveBeenCalledWith(`profile:${UID}`);
    expect(mockCacheInvalidatePrefix).toHaveBeenCalledWith(`income_categories:${UID}`);
    expect(mockCacheInvalidatePrefix).toHaveBeenCalledWith(`expense_categories:${UID}`);
    expect(mockCacheInvalidatePrefix).toHaveBeenCalledWith(`income_sources:${UID}`);
    expect(mockCacheInvalidatePrefix).toHaveBeenCalledWith(`expenses:${UID}`);
    expect(mockCacheInvalidatePrefix).toHaveBeenCalledWith(`savings_goals:${UID}`);
    expect(mockCacheInvalidate).toHaveBeenCalledWith(`dashboard:${UID}`);
  });
});
