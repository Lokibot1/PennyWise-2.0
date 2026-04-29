import { syncMutationQueue } from '../syncEngine';

// ── MutationQueue mock ────────────────────────────────────────────────────────

const mockQueueGetAll = jest.fn();
const mockQueueRemove = jest.fn();

jest.mock('@/lib/mutationQueue', () => ({
  MutationQueue: {
    getAll: (...a: any[]) => mockQueueGetAll(...a),
    remove: (...a: any[]) => mockQueueRemove(...a),
  },
}));

// ── DataCache mock ─────────────────────────────────────────────────────────────

const mockInvalidateIncomeCategories  = jest.fn();
const mockInvalidateExpenseCategories = jest.fn();
const mockInvalidateIncomeSources     = jest.fn();
const mockInvalidateExpenses          = jest.fn();
const mockInvalidateSavingsGoals      = jest.fn();
const mockInvalidateProfile           = jest.fn();
const mockInvalidateDashboard         = jest.fn();

jest.mock('@/lib/dataCache', () => ({
  DataCache: {
    invalidateIncomeCategories:  (...a: any[]) => mockInvalidateIncomeCategories(...a),
    invalidateExpenseCategories: (...a: any[]) => mockInvalidateExpenseCategories(...a),
    invalidateIncomeSources:     (...a: any[]) => mockInvalidateIncomeSources(...a),
    invalidateExpenses:          (...a: any[]) => mockInvalidateExpenses(...a),
    invalidateSavingsGoals:      (...a: any[]) => mockInvalidateSavingsGoals(...a),
    invalidateProfile:           (...a: any[]) => mockInvalidateProfile(...a),
    invalidateDashboard:         (...a: any[]) => mockInvalidateDashboard(...a),
  },
}));

// ── AsyncStorage mock (used by resolveTempId) ─────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem:    jest.fn().mockResolvedValue(null),
  setItem:    jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// ── Supabase mock ─────────────────────────────────────────────────────────────
// Builds a thenable chain so every pattern (insert/update/delete) resolves.

const supabaseResults: Record<string, any> = {};

jest.mock('@/lib/supabase', () => {
  function makeChain(table: string): any {
    const getRes = () =>
      Promise.resolve(
        supabaseResults[table] !== undefined
          ? supabaseResults[table]
          : { data: null, error: null }
      );
    const chain: any = {
      then:   (res: any, rej: any) => getRes().then(res, rej),
      catch:  (h: any) => getRes().catch(h),
      finally:(h: any) => getRes().finally(h),
      select: jest.fn(() => makeChain(table)),
      single: jest.fn(() => getRes()),
      eq:     jest.fn(() => makeChain(table)),
      insert: jest.fn(() => makeChain(table)),
      update: jest.fn(() => makeChain(table)),
      delete: jest.fn(() => makeChain(table)),
    };
    return chain;
  }
  return {
    supabase: {
      from: jest.fn((table: string) => makeChain(table)),
    },
  };
});

const UID = 'user-sync-1';

beforeEach(() => {
  jest.clearAllMocks();
  mockQueueGetAll.mockResolvedValue([]);
  mockQueueRemove.mockResolvedValue(undefined);
  // Clear supabaseResults between tests
  for (const key of Object.keys(supabaseResults)) delete supabaseResults[key];
});

// ── empty queue ───────────────────────────────────────────────────────────────

describe('syncMutationQueue — empty queue', () => {
  it('returns 0 when the queue is empty', async () => {
    expect(await syncMutationQueue(UID)).toBe(0);
  });

  it('does not call Supabase when the queue is empty', async () => {
    await syncMutationQueue(UID);
    const { supabase } = require('@/lib/supabase');
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

// ── insert ────────────────────────────────────────────────────────────────────

describe('syncMutationQueue — insert', () => {
  it('returns 1 after a successful insert', async () => {
    supabaseResults['expenses'] = { data: { id: 'real-1' }, error: null };
    mockQueueGetAll.mockResolvedValue([
      { id: 'mq_1', op: 'insert', table: 'expenses', payload: { title: 'Lunch' }, createdAt: 1 },
    ]);
    expect(await syncMutationQueue(UID)).toBe(1);
  });

  it('removes the mutation from the queue after a successful insert', async () => {
    supabaseResults['expenses'] = { data: { id: 'real-1' }, error: null };
    mockQueueGetAll.mockResolvedValue([
      { id: 'mq_1', op: 'insert', table: 'expenses', payload: { title: 'Lunch' }, createdAt: 1 },
    ]);
    await syncMutationQueue(UID);
    expect(mockQueueRemove).toHaveBeenCalledWith('mq_1');
  });

  it('invalidates expenses and dashboard caches after a successful insert', async () => {
    supabaseResults['expenses'] = { data: { id: 'real-1' }, error: null };
    mockQueueGetAll.mockResolvedValue([
      { id: 'mq_1', op: 'insert', table: 'expenses', payload: { title: 'Lunch' }, createdAt: 1 },
    ]);
    await syncMutationQueue(UID);
    expect(mockInvalidateExpenses).toHaveBeenCalledWith(UID);
    expect(mockInvalidateDashboard).toHaveBeenCalledWith(UID);
  });

  it('removes a non-retriable insert error (unique violation) from the queue', async () => {
    supabaseResults['expenses'] = { data: null, error: { code: '23505', message: 'unique violation' } };
    mockQueueGetAll.mockResolvedValue([
      { id: 'mq_dup', op: 'insert', table: 'expenses', payload: { title: 'Dup' }, createdAt: 1 },
    ]);
    await syncMutationQueue(UID);
    expect(mockQueueRemove).toHaveBeenCalledWith('mq_dup');
  });

  it('stops processing on a retriable network error', async () => {
    supabaseResults['expenses'] = { data: null, error: { code: '08006', message: 'connection failure' } };
    mockQueueGetAll.mockResolvedValue([
      { id: 'mq_1', op: 'insert', table: 'expenses', payload: { title: 'A' }, createdAt: 1 },
      { id: 'mq_2', op: 'insert', table: 'expenses', payload: { title: 'B' }, createdAt: 2 },
    ]);
    await syncMutationQueue(UID);
    expect(mockQueueRemove).not.toHaveBeenCalled();
  });

  it('drops a malformed insert entry (missing payload)', async () => {
    mockQueueGetAll.mockResolvedValue([
      { id: 'mq_bad', op: 'insert', table: 'expenses', payload: undefined, createdAt: 1 },
    ]);
    await syncMutationQueue(UID);
    expect(mockQueueRemove).toHaveBeenCalledWith('mq_bad');
  });
});

// ── update ────────────────────────────────────────────────────────────────────

describe('syncMutationQueue — update', () => {
  it('returns 1 after a successful update', async () => {
    supabaseResults['expenses'] = { error: null };
    mockQueueGetAll.mockResolvedValue([
      { id: 'mq_u', op: 'update', table: 'expenses', payload: { title: 'Updated' }, match: { id: 'row-1' }, createdAt: 1 },
    ]);
    expect(await syncMutationQueue(UID)).toBe(1);
  });

  it('removes the update mutation after success', async () => {
    supabaseResults['expenses'] = { error: null };
    mockQueueGetAll.mockResolvedValue([
      { id: 'mq_u', op: 'update', table: 'expenses', payload: { title: 'Updated' }, match: { id: 'row-1' }, createdAt: 1 },
    ]);
    await syncMutationQueue(UID);
    expect(mockQueueRemove).toHaveBeenCalledWith('mq_u');
  });

  it('drops malformed update (missing match)', async () => {
    mockQueueGetAll.mockResolvedValue([
      { id: 'mq_bad', op: 'update', table: 'expenses', payload: { title: 'X' }, match: undefined, createdAt: 1 },
    ]);
    await syncMutationQueue(UID);
    expect(mockQueueRemove).toHaveBeenCalledWith('mq_bad');
  });
});

// ── delete ────────────────────────────────────────────────────────────────────

describe('syncMutationQueue — delete', () => {
  it('returns 1 after a successful delete', async () => {
    supabaseResults['savings_goals'] = { error: null };
    mockQueueGetAll.mockResolvedValue([
      { id: 'mq_d', op: 'delete', table: 'savings_goals', match: { id: 'goal-1' }, createdAt: 1 },
    ]);
    expect(await syncMutationQueue(UID)).toBe(1);
  });

  it('invalidates savings goals cache after delete', async () => {
    supabaseResults['savings_goals'] = { error: null };
    mockQueueGetAll.mockResolvedValue([
      { id: 'mq_d', op: 'delete', table: 'savings_goals', match: { id: 'goal-1' }, createdAt: 1 },
    ]);
    await syncMutationQueue(UID);
    expect(mockInvalidateSavingsGoals).toHaveBeenCalledWith(UID);
    expect(mockInvalidateDashboard).toHaveBeenCalledWith(UID);
  });

  it('drops malformed delete (missing match)', async () => {
    mockQueueGetAll.mockResolvedValue([
      { id: 'mq_bad', op: 'delete', table: 'expenses', match: undefined, createdAt: 1 },
    ]);
    await syncMutationQueue(UID);
    expect(mockQueueRemove).toHaveBeenCalledWith('mq_bad');
  });
});

// ── multiple mutations ────────────────────────────────────────────────────────

describe('syncMutationQueue — multiple mutations', () => {
  it('syncs all mutations and returns the total count', async () => {
    supabaseResults['expenses'] = { data: { id: 'r1' }, error: null };
    mockQueueGetAll.mockResolvedValue([
      { id: 'mq_1', op: 'insert', table: 'expenses', payload: { title: 'A' }, createdAt: 1 },
      { id: 'mq_2', op: 'insert', table: 'expenses', payload: { title: 'B' }, createdAt: 2 },
      { id: 'mq_3', op: 'insert', table: 'expenses', payload: { title: 'C' }, createdAt: 3 },
    ]);
    expect(await syncMutationQueue(UID)).toBe(3);
  });

  it('invalidates each affected table exactly once', async () => {
    supabaseResults['expenses']      = { data: { id: 'r1' }, error: null };
    supabaseResults['savings_goals'] = { error: null };
    mockQueueGetAll.mockResolvedValue([
      { id: 'mq_1', op: 'insert', table: 'expenses',      payload: { title: 'Lunch' }, createdAt: 1 },
      { id: 'mq_2', op: 'delete', table: 'savings_goals', match: { id: 'g1' }, createdAt: 2 },
    ]);
    await syncMutationQueue(UID);
    expect(mockInvalidateExpenses).toHaveBeenCalledTimes(1);
    expect(mockInvalidateSavingsGoals).toHaveBeenCalledTimes(1);
  });
});

// ── table cache invalidation mapping ─────────────────────────────────────────

describe('syncMutationQueue — cache invalidation mapping', () => {
  const tables = [
    { table: 'income_categories', invalidate: () => mockInvalidateIncomeCategories },
    { table: 'expense_categories', invalidate: () => mockInvalidateExpenseCategories },
    { table: 'income_sources', invalidate: () => mockInvalidateIncomeSources },
    { table: 'profiles', invalidate: () => mockInvalidateProfile },
  ];

  tables.forEach(({ table, invalidate }) => {
    it(`invalidates ${table} cache on successful mutation`, async () => {
      supabaseResults[table] = { error: null };
      mockQueueGetAll.mockResolvedValue([
        { id: 'mq_1', op: 'delete', table, match: { id: 'row-1' }, createdAt: 1 },
      ]);
      await syncMutationQueue(UID);
      expect(invalidate()()).toBeUndefined(); // called and resolved
      expect(mockInvalidateDashboard).toHaveBeenCalledWith(UID);
    });
  });
});
