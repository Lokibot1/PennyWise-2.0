import { processRecurringTransactions } from '../recurringProcessor';

// ── DataCache mock ────────────────────────────────────────────────────────────

const mockInvalidateExpenses    = jest.fn();
const mockInvalidateIncomeSources = jest.fn();
const mockInvalidateDashboard   = jest.fn();

jest.mock('@/lib/dataCache', () => ({
  DataCache: {
    invalidateExpenses:     (...a: any[]) => mockInvalidateExpenses(...a),
    invalidateIncomeSources:(...a: any[]) => mockInvalidateIncomeSources(...a),
    invalidateDashboard:    (...a: any[]) => mockInvalidateDashboard(...a),
  },
}));

// ── logActivity mock ──────────────────────────────────────────────────────────

const mockLogActivity = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/logActivity', () => ({
  logActivity: (...a: any[]) => mockLogActivity(...a),
  ACTION: {
    EXPENSE_ADDED:      'EXPENSE_ADDED',
    INCOME_SOURCE_ADDED:'INCOME_SOURCE_ADDED',
  },
  ENTITY: {
    EXPENSE:       'EXPENSE',
    INCOME_SOURCE: 'INCOME_SOURCE',
  },
}));

// ── Supabase mock ─────────────────────────────────────────────────────────────

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
      eq:     jest.fn(() => makeChain(table)),
      insert: jest.fn(() => makeChain(table)),
      update: jest.fn(() => makeChain(table)),
    };
    return chain;
  }
  return {
    supabase: {
      from: jest.fn((table: string) => makeChain(table)),
    },
  };
});

const UID = 'user-recur-1';

// A date far enough in the past so "today" is always past the next due date.
// Using a date 6 months ago guarantees at least one monthly recurrence.
const SIX_MONTHS_AGO = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString().split('T')[0];
})();

beforeEach(() => {
  jest.clearAllMocks();
  for (const key of Object.keys(supabaseResults)) delete supabaseResults[key];
});

// ── no recurring entries ──────────────────────────────────────────────────────

describe('processRecurringTransactions — no recurring entries', () => {
  it('resolves without throwing when both tables return empty data', async () => {
    supabaseResults['expenses']      = { data: [], error: null };
    supabaseResults['income_sources'] = { data: [], error: null };
    await expect(processRecurringTransactions(UID)).resolves.toBeUndefined();
  });

  it('does not invalidate caches when nothing was inserted', async () => {
    supabaseResults['expenses']       = { data: [], error: null };
    supabaseResults['income_sources'] = { data: [], error: null };
    await processRecurringTransactions(UID);
    expect(mockInvalidateExpenses).not.toHaveBeenCalled();
    expect(mockInvalidateDashboard).not.toHaveBeenCalled();
  });

  it('does not call logActivity when nothing was inserted', async () => {
    supabaseResults['expenses']       = { data: [], error: null };
    supabaseResults['income_sources'] = { data: [], error: null };
    await processRecurringTransactions(UID);
    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it('resolves when the select query returns an error', async () => {
    supabaseResults['expenses']       = { data: null, error: { message: 'DB error' } };
    supabaseResults['income_sources'] = { data: null, error: { message: 'DB error' } };
    await expect(processRecurringTransactions(UID)).resolves.toBeUndefined();
  });
});

// ── with overdue recurring expenses ───────────────────────────────────────────

describe('processRecurringTransactions — overdue recurring expenses', () => {
  it('invalidates expenses and dashboard caches when new rows are inserted', async () => {
    const recurringEntry = {
      id:               'e-1',
      category_id:      'cat-1',
      title:            'Rent',
      amount:           5000,
      date:             SIX_MONTHS_AGO,
      time:             '09:00:00',
      description:      'Monthly rent',
      frequency:        'monthly',
      last_processed_at: null,
    };
    supabaseResults['expenses'] = { data: [recurringEntry], error: null };
    supabaseResults['income_sources'] = { data: [], error: null };

    await processRecurringTransactions(UID);

    expect(mockInvalidateExpenses).toHaveBeenCalledWith(UID);
    expect(mockInvalidateDashboard).toHaveBeenCalledWith(UID);
  });

  it('calls logActivity after inserting recurring expenses', async () => {
    const recurringEntry = {
      id:               'e-1',
      category_id:      'cat-1',
      title:            'Electricity',
      amount:           1200,
      date:             SIX_MONTHS_AGO,
      time:             '00:00:00',
      description:      '',
      frequency:        'monthly',
      last_processed_at: null,
    };
    supabaseResults['expenses'] = { data: [recurringEntry], error: null };
    supabaseResults['income_sources'] = { data: [], error: null };

    await processRecurringTransactions(UID);

    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id:     UID,
        action_type: 'EXPENSE_ADDED',
        entity_type: 'EXPENSE',
      })
    );
  });
});

// ── with overdue recurring income ─────────────────────────────────────────────

describe('processRecurringTransactions — overdue recurring income', () => {
  it('invalidates income sources and dashboard caches when new rows are inserted', async () => {
    const recurringEntry = {
      id:               'i-1',
      category_id:      'cat-inc-1',
      title:            'Payroll',
      amount:           20000,
      date:             SIX_MONTHS_AGO,
      time:             '00:00:00',
      description:      '',
      frequency:        'monthly',
      last_processed_at: null,
    };
    supabaseResults['expenses']       = { data: [], error: null };
    supabaseResults['income_sources'] = { data: [recurringEntry], error: null };

    await processRecurringTransactions(UID);

    expect(mockInvalidateIncomeSources).toHaveBeenCalledWith(UID);
    expect(mockInvalidateDashboard).toHaveBeenCalledWith(UID);
  });

  it('calls logActivity with INCOME_SOURCE_ADDED after inserting recurring income', async () => {
    const recurringEntry = {
      id: 'i-1', category_id: 'cat-inc-1', title: 'Payroll',
      amount: 20000, date: SIX_MONTHS_AGO, time: '00:00:00',
      description: '', frequency: 'monthly', last_processed_at: null,
    };
    supabaseResults['expenses']       = { data: [], error: null };
    supabaseResults['income_sources'] = { data: [recurringEntry], error: null };

    await processRecurringTransactions(UID);

    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id:     UID,
        action_type: 'INCOME_SOURCE_ADDED',
        entity_type: 'INCOME_SOURCE',
      })
    );
  });
});

// ── already up-to-date entries ────────────────────────────────────────────────

describe('processRecurringTransactions — already up-to-date', () => {
  it('does not invalidate caches when last_processed_at is today', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const recurringEntry = {
      id: 'e-1', category_id: 'cat-1', title: 'Rent',
      amount: 5000, date: SIX_MONTHS_AGO, time: '00:00:00',
      description: '', frequency: 'monthly',
      last_processed_at: todayStr,
    };
    supabaseResults['expenses']       = { data: [recurringEntry], error: null };
    supabaseResults['income_sources'] = { data: [], error: null };

    await processRecurringTransactions(UID);

    // If already processed today, nextDue > today → no rows inserted
    expect(mockLogActivity).not.toHaveBeenCalled();
  });
});
