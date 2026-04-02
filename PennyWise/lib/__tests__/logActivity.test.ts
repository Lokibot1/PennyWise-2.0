import { logActivity, ACTION, ENTITY } from '../logActivity';

// ── Mock Supabase ─────────────────────────────────────────────────────────────

const mockInsert = jest.fn().mockResolvedValue({ error: null });
const mockFrom   = jest.fn(() => ({ insert: mockInsert }));

jest.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: any[]) => mockFrom(...args) },
}));

beforeEach(() => jest.clearAllMocks());

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('logActivity', () => {
  const BASE = {
    user_id:     'user-1',
    action_type: ACTION.EXPENSE_ADDED,
    entity_type: ENTITY.EXPENSE,
    title:       'Added Grocery',
    icon:        'cart-outline',
  };

  it('inserts into activity_logs with the correct payload', async () => {
    await logActivity(BASE);
    expect(mockFrom).toHaveBeenCalledWith('activity_logs');
    expect(mockInsert).toHaveBeenCalledWith({
      user_id:     'user-1',
      action_type: ACTION.EXPENSE_ADDED,
      entity_type: ENTITY.EXPENSE,
      title:       'Added Grocery',
      description: '',
      icon:        'cart-outline',
    });
  });

  it('uses the provided description when given', async () => {
    await logActivity({ ...BASE, description: 'Weekly shop' });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Weekly shop' })
    );
  });

  it('falls back to empty string when description is omitted', async () => {
    await logActivity(BASE);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ description: '' })
    );
  });

  it('does not throw even when the insert returns an error', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'DB error' } });
    await expect(logActivity(BASE)).resolves.toBeUndefined();
  });
});

describe('ACTION constants', () => {
  it('exports expected income constants', () => {
    expect(ACTION.INCOME_SOURCE_ADDED).toBe('INCOME_SOURCE_ADDED');
    expect(ACTION.INCOME_CATEGORY_CREATED).toBe('INCOME_CATEGORY_CREATED');
  });

  it('exports expected expense constants', () => {
    expect(ACTION.EXPENSE_ADDED).toBe('EXPENSE_ADDED');
    expect(ACTION.EXPENSE_DELETED).toBe('EXPENSE_DELETED');
  });

  it('exports expected savings goal constants', () => {
    expect(ACTION.SAVINGS_GOAL_CREATED).toBe('SAVINGS_GOAL_CREATED');
    expect(ACTION.SAVINGS_GOAL_COMPLETED).toBe('SAVINGS_GOAL_COMPLETED');
  });
});

describe('ENTITY constants', () => {
  it('exports all five entity types', () => {
    expect(ENTITY.INCOME_CATEGORY).toBe('income_category');
    expect(ENTITY.INCOME_SOURCE).toBe('income_source');
    expect(ENTITY.EXPENSE_CATEGORY).toBe('expense_category');
    expect(ENTITY.EXPENSE).toBe('expense');
    expect(ENTITY.SAVINGS_GOAL).toBe('savings_goal');
  });
});
