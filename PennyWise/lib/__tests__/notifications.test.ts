import { generateNotifications } from '../notifications';

// ── Mock Supabase ─────────────────────────────────────────────────────────────

const mockSingleProfile = jest.fn();
const mockExpensesQuery = jest.fn();
const mockIncomeQuery   = jest.fn();
const mockGoalsQuery    = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({ single: mockSingleProfile })),
          })),
        };
      }
      if (table === 'expenses') {
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ eq: mockExpensesQuery })) })) };
      }
      if (table === 'income_sources') {
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ eq: mockIncomeQuery })) })) };
      }
      if (table === 'savings_goals') {
        return { select: jest.fn(() => ({ eq: jest.fn(() => ({ eq: mockGoalsQuery })) })) };
      }
    }),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const NOW_MID_MONTH = new Date('2024-06-15T12:00:00.000Z');
const NOW_FIRST_DAY = new Date('2024-06-01T12:00:00.000Z');
const NOW_DAY_5     = new Date('2024-06-05T12:00:00.000Z');

function expense(amount: number, date = '2024-06-10') {
  return { amount, date };
}

function income(amount: number) {
  return { amount };
}

function goal(overrides: Partial<{
  id: string; title: string; icon: string;
  target_amount: number; current_amount: number; is_completed: boolean;
}> = {}) {
  return {
    id: 'g1', title: 'Laptop', icon: 'laptop', is_completed: false,
    target_amount: 10000, current_amount: 0, ...overrides,
  };
}

function setupMocks({
  budgetLimit = 10000,
  expenses = [] as ReturnType<typeof expense>[],
  incomes  = [] as ReturnType<typeof income>[],
  goals    = [] as ReturnType<typeof goal>[],
} = {}) {
  mockSingleProfile.mockResolvedValue({
    data: { budget_limit: budgetLimit, full_name: 'Test' },
    error: null,
  });
  mockExpensesQuery.mockResolvedValue({ data: expenses, error: null });
  mockIncomeQuery.mockResolvedValue({ data: incomes, error: null });
  mockGoalsQuery.mockResolvedValue({ data: goals, error: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(NOW_MID_MONTH);
});

afterEach(() => jest.useRealTimers());

// ── Budget notifications ──────────────────────────────────────────────────────

describe('generateNotifications — budget', () => {
  it('emits budget_exceeded when spending ≥ 100% of budget', async () => {
    setupMocks({ budgetLimit: 1000, expenses: [expense(1000)] });
    const notifs = await generateNotifications('u1');
    expect(notifs.some(n => n.id.startsWith('budget_exceeded'))).toBe(true);
    expect(notifs.some(n => n.type === 'critical')).toBe(true);
  });

  it('emits budget_90 when spending is between 90% and 99%', async () => {
    setupMocks({ budgetLimit: 1000, expenses: [expense(950)] });
    const notifs = await generateNotifications('u1');
    expect(notifs.some(n => n.id.startsWith('budget_90'))).toBe(true);
  });

  it('emits budget_70 when spending is between 70% and 89%', async () => {
    setupMocks({ budgetLimit: 1000, expenses: [expense(750)] });
    const notifs = await generateNotifications('u1');
    expect(notifs.some(n => n.id.startsWith('budget_70'))).toBe(true);
    expect(notifs.some(n => n.type === 'warning')).toBe(true);
  });

  it('emits no budget notification when spending is under 70%', async () => {
    setupMocks({ budgetLimit: 1000, expenses: [expense(600)] });
    const notifs = await generateNotifications('u1');
    expect(notifs.some(n => n.id.startsWith('budget_'))).toBe(false);
  });

  it('budget_exceeded takes priority over budget_90', async () => {
    setupMocks({ budgetLimit: 1000, expenses: [expense(1100)] });
    const notifs = await generateNotifications('u1');
    expect(notifs.some(n => n.id.startsWith('budget_exceeded'))).toBe(true);
    expect(notifs.some(n => n.id.startsWith('budget_90'))).toBe(false);
  });
});

// ── Low balance ───────────────────────────────────────────────────────────────

describe('generateNotifications — low balance', () => {
  it('emits low_balance when total balance is below 10% of budget', async () => {
    // income 1000, expense 990 → balance 10 → 10 < 0.1 * 10000
    setupMocks({ budgetLimit: 10000, incomes: [income(1000)], expenses: [expense(990)] });
    const notifs = await generateNotifications('u1');
    expect(notifs.some(n => n.id.startsWith('low_balance'))).toBe(true);
  });

  it('does not emit low_balance when balance is comfortable', async () => {
    setupMocks({ budgetLimit: 10000, incomes: [income(8000)], expenses: [expense(1000)] });
    const notifs = await generateNotifications('u1');
    expect(notifs.some(n => n.id.startsWith('low_balance'))).toBe(false);
  });
});

// ── Savings goals ─────────────────────────────────────────────────────────────

describe('generateNotifications — savings goals', () => {
  it('emits no_goals when there are no goals', async () => {
    setupMocks({ goals: [] });
    const notifs = await generateNotifications('u1');
    expect(notifs.some(n => n.id.startsWith('no_goals'))).toBe(true);
  });

  it('emits goal_100 when a goal is completed', async () => {
    setupMocks({ goals: [goal({ is_completed: true, current_amount: 10000, target_amount: 10000 })] });
    const notifs = await generateNotifications('u1');
    expect(notifs.some(n => n.id.startsWith('goal_100'))).toBe(true);
    expect(notifs.some(n => n.type === 'success')).toBe(true);
  });

  it('emits goal_75 when a goal is 75–99% funded', async () => {
    setupMocks({ goals: [goal({ current_amount: 8000, target_amount: 10000 })] });
    const notifs = await generateNotifications('u1');
    expect(notifs.some(n => n.id.startsWith('goal_75'))).toBe(true);
  });

  it('emits goal_50 when a goal is 50–74% funded', async () => {
    setupMocks({ goals: [goal({ current_amount: 5000, target_amount: 10000 })] });
    const notifs = await generateNotifications('u1');
    expect(notifs.some(n => n.id.startsWith('goal_50'))).toBe(true);
  });

  it('emits no goal progress notification when goal is below 50%', async () => {
    setupMocks({ goals: [goal({ current_amount: 3000, target_amount: 10000 })] });
    const notifs = await generateNotifications('u1');
    expect(notifs.some(n => n.id.startsWith('goal_'))).toBe(false);
  });
});

// ── Date-based notifications ──────────────────────────────────────────────────

describe('generateNotifications — date-based', () => {
  it('emits new_month greeting on day 1', async () => {
    jest.setSystemTime(NOW_FIRST_DAY);
    setupMocks();
    const notifs = await generateNotifications('u1');
    expect(notifs.some(n => n.id.startsWith('new_month'))).toBe(true);
  });

  it('emits recurring_reminder on day 5', async () => {
    jest.setSystemTime(NOW_DAY_5);
    setupMocks();
    const notifs = await generateNotifications('u1');
    expect(notifs.some(n => n.id.startsWith('recurring_reminder'))).toBe(true);
  });

  it('does not emit new_month greeting on day 15', async () => {
    jest.setSystemTime(NOW_MID_MONTH);
    setupMocks();
    const notifs = await generateNotifications('u1');
    expect(notifs.some(n => n.id.startsWith('new_month'))).toBe(false);
  });

  it('does not emit recurring_reminder after day 7', async () => {
    jest.setSystemTime(NOW_MID_MONTH);
    setupMocks();
    const notifs = await generateNotifications('u1');
    expect(notifs.some(n => n.id.startsWith('recurring_reminder'))).toBe(false);
  });
});
