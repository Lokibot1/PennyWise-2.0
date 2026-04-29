import { processMessage, buildSnapshot } from '../pennyBrain';
import type { FinancialData } from '../pennyBrain';

// ── Test fixture ──────────────────────────────────────────────────────────────

function makeData(overrides: Partial<FinancialData> = {}): FinancialData {
  return {
    name:          'Ana',
    budgetLimit:   10000,
    monthIncome:   15000,
    monthExpenses: 6000,
    budgetPercent: 60,
    topExpenseCategories: [
      { label: 'Food',      icon: '🍱', amount: 3000, count: 10 },
      { label: 'Transport', icon: '🚌', amount: 2000, count: 5  },
    ],
    topIncomeCategories: [
      { label: 'Salary', icon: '💼', amount: 15000, count: 1 },
    ],
    lastMonthIncome:   12000,
    lastMonthExpenses: 5000,
    lastMonthExpenseCategories: [{ label: 'Food', icon: '🍱', amount: 5000, count: 20 }],
    lastMonthIncomeCategories:  [{ label: 'Salary', icon: '💼', amount: 12000, count: 1 }],
    lastMonthName: 'March',
    allTimeIncome:   50000,
    allTimeExpenses: 30000,
    allTimeExpenseCategories: [{ label: 'Food', icon: '🍱', amount: 15000, count: 50 }],
    allTimeIncomeCategories:  [{ label: 'Salary', icon: '💼', amount: 50000, count: 12 }],
    totalExpenseCount: 50,
    totalIncomeCount:  12,
    recurringExpenses: [{ title: 'Rent', amount: 3000, frequency: 'Monthly', categoryLabel: 'Housing' }],
    recurringIncome:   [{ title: 'Payroll', amount: 15000, frequency: 'Monthly', categoryLabel: 'Salary' }],
    activeGoals: [
      { title: 'Emergency Fund', icon: '🏦', target: 30000, current: 15000, pct: 50 },
    ],
    completedGoalsCount: 1,
    daysInMonth: 30,
    currentDay:  15,
    daysLeft:    15,
    ...overrides,
  };
}

// ── processMessage — greeting ─────────────────────────────────────────────────

describe('processMessage — greeting', () => {
  it('responds to "hello" with the user name', () => {
    expect(processMessage('hello', makeData())).toContain('Ana');
  });

  it('responds to "hi" with budget info', () => {
    expect(processMessage('hi', makeData())).toMatch(/budget/i);
  });

  it('falls back to "there" when name is empty', () => {
    expect(processMessage('hello', makeData({ name: '' }))).toContain('there');
  });

  it('responds to "good morning"', () => {
    expect(processMessage('good morning', makeData())).toBeTruthy();
  });
});

// ── processMessage — budget ───────────────────────────────────────────────────

describe('processMessage — budget', () => {
  it('shows budget limit in the response', () => {
    expect(processMessage('how is my budget', makeData())).toContain('10,000');
  });

  it('shows exceeded message when budgetPercent >= 100', () => {
    const reply = processMessage('budget', makeData({ budgetPercent: 110, monthExpenses: 11000 }));
    expect(reply).toContain('exceeded');
  });

  it('shows warning when budgetPercent is 85', () => {
    const reply = processMessage('budget', makeData({ budgetPercent: 85, monthExpenses: 8500 }));
    expect(reply).toMatch(/⚠️|close/i);
  });

  it('shows healthy message when budgetPercent < 50', () => {
    const reply = processMessage('budget', makeData({ budgetPercent: 30, monthExpenses: 3000 }));
    expect(reply).toContain('💚');
  });

  it('responds to "remaining budget"', () => {
    expect(processMessage('remaining budget', makeData())).toMatch(/remaining/i);
  });
});

// ── processMessage — expenses ─────────────────────────────────────────────────

describe('processMessage — expenses', () => {
  it('shows top expense category when expenses exist', () => {
    expect(processMessage('show my expenses', makeData())).toContain('Food');
  });

  it('shows no-expenses message when monthExpenses is 0', () => {
    const reply = processMessage('expenses', makeData({ monthExpenses: 0, topExpenseCategories: [] }));
    expect(reply).toMatch(/No expenses/i);
  });

  it('handles "all time" expense query', () => {
    expect(processMessage('show my expenses all time', makeData())).toMatch(/all.time/i);
  });

  it('handles "last month" expense query', () => {
    expect(processMessage('expenses last month', makeData())).toContain('March');
  });

  it('shows no-last-month message when lastMonthExpenses is 0', () => {
    const reply = processMessage('expenses last month', makeData({ lastMonthExpenses: 0, lastMonthExpenseCategories: [] }));
    expect(reply).toMatch(/No expenses.*March|March.*no expenses/i);
  });
});

// ── processMessage — income ───────────────────────────────────────────────────

describe('processMessage — income', () => {
  it('shows current-month income', () => {
    expect(processMessage('show my income', makeData())).toContain('15,000');
  });

  it('shows no-income message when monthIncome is 0', () => {
    const reply = processMessage('income', makeData({ monthIncome: 0, topIncomeCategories: [] }));
    expect(reply).toMatch(/No income/i);
  });

  it('handles "all time income" query', () => {
    expect(processMessage('show my income all time', makeData())).toMatch(/all.time income/i);
  });

  it('handles "last month income" query', () => {
    expect(processMessage('income last month', makeData())).toContain('March');
  });

  it('shows healthy ratio note when spending < 70% of income', () => {
    const data = makeData({ monthIncome: 15000, monthExpenses: 5000 }); // 33%
    expect(processMessage('show my income', data)).toContain('💚');
  });
});

// ── processMessage — savings ──────────────────────────────────────────────────

describe('processMessage — savings goals', () => {
  it('shows active goal name', () => {
    expect(processMessage('savings goals', makeData())).toContain('Emergency Fund');
  });

  it('shows create-goal prompt when no goals exist at all', () => {
    const reply = processMessage('savings', makeData({ activeGoals: [], completedGoalsCount: 0 }));
    expect(reply).toMatch(/don.t have any savings goals/i);
  });

  it('shows completed-all message when active goals are empty but completedGoalsCount > 0', () => {
    const reply = processMessage('goal', makeData({ activeGoals: [], completedGoalsCount: 2 }));
    expect(reply).toMatch(/completed all/i);
  });
});

// ── processMessage — help ─────────────────────────────────────────────────────

describe('processMessage — help', () => {
  it('responds to "help" with a list that includes budget', () => {
    expect(processMessage('help', makeData())).toMatch(/budget/i);
  });

  it('responds to "what can you do"', () => {
    expect(processMessage('what can you do', makeData())).toMatch(/budget/i);
  });

  it('responds to "commands"', () => {
    expect(processMessage('commands', makeData())).toMatch(/expenses/i);
  });
});

// ── processMessage — out-of-scope ─────────────────────────────────────────────

describe('processMessage — out-of-scope detection', () => {
  it('rejects weather questions', () => {
    expect(processMessage('what is the weather today', makeData())).toMatch(/outside my scope/i);
  });

  it('rejects recipe questions', () => {
    expect(processMessage('how to cook adobo recipe', makeData())).toMatch(/outside my scope/i);
  });

  it('rejects sports questions', () => {
    expect(processMessage('who won the basketball game', makeData())).toMatch(/outside my scope/i);
  });

  it('rejects horoscope questions', () => {
    expect(processMessage('what is my horoscope today', makeData())).toMatch(/outside my scope/i);
  });
});

// ── processMessage — fallback ─────────────────────────────────────────────────

describe('processMessage — fallback', () => {
  it('returns a fallback for fully unrecognised input', () => {
    expect(processMessage('xyzzy gibberish plorp', makeData())).toMatch(/didn.t quite catch|I.m not sure/i);
  });

  it('returns a question-specific fallback for unknown questions', () => {
    expect(processMessage('what is a pfizbo?', makeData())).toMatch(/I.m not sure/i);
  });
});

// ── processMessage — affordability ────────────────────────────────────────────

describe('processMessage — affordability', () => {
  it('confirms affordability for a small amount within budget', () => {
    const data = makeData({ budgetLimit: 10000, monthExpenses: 6000 }); // ₱4000 remaining
    const reply = processMessage('can I afford ₱200', data);
    expect(reply).toMatch(/Affordability check|affordable|comfortable/i);
  });

  it('shows shortfall when amount exceeds remaining budget', () => {
    const data = makeData({ budgetLimit: 10000, monthExpenses: 9800 }); // ₱200 remaining
    const reply = processMessage('can I afford ₱2000', data);
    expect(reply).toMatch(/can.t comfortably afford|Shortfall/i);
  });

  it('asks for amount when none is provided', () => {
    const reply = processMessage('can I afford this', makeData());
    expect(reply).toMatch(/include the amount/i);
  });
});

// ── processMessage — recurring ────────────────────────────────────────────────

describe('processMessage — recurring bills', () => {
  it('shows recurring expense title', () => {
    expect(processMessage('show recurring bills', makeData())).toContain('Rent');
  });

  it('shows empty message when no recurring expenses', () => {
    const reply = processMessage('recurring', makeData({ recurringExpenses: [] }));
    expect(reply).toMatch(/no recurring expenses/i);
  });
});

// ── processMessage — daily spending ───────────────────────────────────────────

describe('processMessage — daily spending', () => {
  it('responds to "spend per day"', () => {
    expect(processMessage('spend per day', makeData())).toMatch(/Daily spending/i);
  });

  it('responds to "how much a day"', () => {
    expect(processMessage('how much a day', makeData())).toMatch(/day/i);
  });
});

// ── processMessage — analysis ─────────────────────────────────────────────────

describe('processMessage — analysis', () => {
  it('responds to "give me an analysis"', () => {
    expect(processMessage('give me an analysis', makeData())).toMatch(/Financial Health/i);
  });

  it('responds to "financial health"', () => {
    expect(processMessage('financial health', makeData())).toMatch(/budget/i);
  });
});

// ── processMessage — tips ─────────────────────────────────────────────────────

describe('processMessage — tips', () => {
  it('responds to "give me tips"', () => {
    expect(processMessage('give me tips', makeData())).toMatch(/tip/i);
  });

  it('responds to "money saving tips"', () => {
    expect(processMessage('money saving tips', makeData())).toMatch(/save|saving/i);
  });
});

// ── processMessage — ratio ────────────────────────────────────────────────────

describe('processMessage — income vs expenses ratio', () => {
  it('responds to "income vs expenses"', () => {
    expect(processMessage('income vs expenses', makeData())).toMatch(/Income.*Expenses|Expenses.*Income/i);
  });

  it('responds to "net income surplus"', () => {
    expect(processMessage('net income surplus', makeData())).toMatch(/income|net|savings rate/i);
  });
});

// ── buildSnapshot — current-month totals ──────────────────────────────────────

const CATS = {
  incomeCategories:  [{ id: 'inc-1', label: 'Salary', icon: '💼' }],
  expenseCategories: [{ id: 'exp-1', label: 'Food',   icon: '🍱' }],
};

// These dates must align with the real current month/year when tests run.
// buildSnapshot uses new Date() internally to determine "this month".
const now          = new Date();
const YEAR         = now.getFullYear();
const MONTH        = String(now.getMonth() + 1).padStart(2, '0');
const LAST_MONTH   = String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, '0');
const LAST_YEAR    = now.getMonth() === 0 ? YEAR - 1 : YEAR;

const THIS_MONTH_DATE = `${YEAR}-${MONTH}-10`;
const LAST_MONTH_DATE = `${LAST_YEAR}-${LAST_MONTH}-10`;
const OLD_DATE        = `${YEAR - 2}-01-10`;

function makeEntry(overrides: Record<string, any>) {
  return {
    amount: 500, date: THIS_MONTH_DATE, is_recurring: false,
    frequency: null, title: 'Test', category_id: 'exp-1', is_archived: false,
    ...overrides,
  };
}

function makeIncEntry(overrides: Record<string, any>) {
  return {
    amount: 5000, date: THIS_MONTH_DATE, is_recurring: false,
    frequency: null, title: 'Payslip', category_id: 'inc-1', is_archived: false,
    ...overrides,
  };
}

describe('buildSnapshot — current-month income', () => {
  it('sums current-month income correctly', () => {
    const snap = buildSnapshot({
      name: 'Ana', budgetLimit: 10000,
      incomeSources: [makeIncEntry({ amount: 5000 }), makeIncEntry({ amount: 3000 })],
      expenses: [], savingsGoals: [], ...CATS,
    });
    expect(snap.monthIncome).toBe(8000);
  });

  it('excludes archived income', () => {
    const snap = buildSnapshot({
      name: 'Ana', budgetLimit: 10000,
      incomeSources: [makeIncEntry({ amount: 5000, is_archived: true })],
      expenses: [], savingsGoals: [], ...CATS,
    });
    expect(snap.monthIncome).toBe(0);
  });

  it('excludes income from other months', () => {
    const snap = buildSnapshot({
      name: 'Ana', budgetLimit: 10000,
      incomeSources: [makeIncEntry({ amount: 9000, date: OLD_DATE })],
      expenses: [], savingsGoals: [], ...CATS,
    });
    expect(snap.monthIncome).toBe(0);
  });
});

describe('buildSnapshot — current-month expenses', () => {
  it('sums current-month expenses correctly', () => {
    const snap = buildSnapshot({
      name: 'Ana', budgetLimit: 10000,
      incomeSources: [],
      expenses: [makeEntry({ amount: 200 }), makeEntry({ amount: 300 })],
      savingsGoals: [], ...CATS,
    });
    expect(snap.monthExpenses).toBe(500);
  });

  it('excludes archived expenses', () => {
    const snap = buildSnapshot({
      name: 'Ana', budgetLimit: 10000,
      incomeSources: [],
      expenses: [makeEntry({ amount: 500, is_archived: true })],
      savingsGoals: [], ...CATS,
    });
    expect(snap.monthExpenses).toBe(0);
  });

  it('computes budgetPercent as (expenses / budgetLimit) * 100', () => {
    const snap = buildSnapshot({
      name: 'Ana', budgetLimit: 10000,
      incomeSources: [],
      expenses: [makeEntry({ amount: 7500 })],
      savingsGoals: [], ...CATS,
    });
    expect(snap.budgetPercent).toBeCloseTo(75);
  });

  it('caps budgetPercent at 200', () => {
    const snap = buildSnapshot({
      name: 'Ana', budgetLimit: 1000,
      incomeSources: [],
      expenses: [makeEntry({ amount: 5000 })],
      savingsGoals: [], ...CATS,
    });
    expect(snap.budgetPercent).toBe(200);
  });

  it('returns budgetPercent of 0 when budgetLimit is 0', () => {
    const snap = buildSnapshot({
      name: 'Ana', budgetLimit: 0,
      incomeSources: [],
      expenses: [makeEntry({ amount: 500 })],
      savingsGoals: [], ...CATS,
    });
    expect(snap.budgetPercent).toBe(0);
  });
});

describe('buildSnapshot — last-month totals', () => {
  it('sums last-month expenses correctly', () => {
    const snap = buildSnapshot({
      name: 'Ana', budgetLimit: 10000,
      incomeSources: [],
      expenses: [makeEntry({ amount: 1000, date: LAST_MONTH_DATE })],
      savingsGoals: [], ...CATS,
    });
    expect(snap.lastMonthExpenses).toBe(1000);
  });

  it('does not include current-month expenses in lastMonthExpenses', () => {
    const snap = buildSnapshot({
      name: 'Ana', budgetLimit: 10000,
      incomeSources: [],
      expenses: [
        makeEntry({ amount: 500, date: THIS_MONTH_DATE }),
        makeEntry({ amount: 600, date: LAST_MONTH_DATE }),
      ],
      savingsGoals: [], ...CATS,
    });
    expect(snap.lastMonthExpenses).toBe(600);
  });
});

describe('buildSnapshot — all-time totals', () => {
  it('sums all non-archived expenses', () => {
    const snap = buildSnapshot({
      name: 'Ana', budgetLimit: 10000,
      incomeSources: [],
      expenses: [
        makeEntry({ amount: 100, date: THIS_MONTH_DATE }),
        makeEntry({ amount: 200, date: LAST_MONTH_DATE }),
        makeEntry({ amount: 300, date: OLD_DATE }),
        makeEntry({ amount: 999, date: THIS_MONTH_DATE, is_archived: true }),
      ],
      savingsGoals: [], ...CATS,
    });
    expect(snap.allTimeExpenses).toBe(600);
    expect(snap.totalExpenseCount).toBe(3);
  });

  it('sums all non-archived income', () => {
    const snap = buildSnapshot({
      name: 'Ana', budgetLimit: 10000,
      incomeSources: [
        makeIncEntry({ amount: 5000, date: THIS_MONTH_DATE }),
        makeIncEntry({ amount: 4000, date: OLD_DATE }),
        makeIncEntry({ amount: 1000, date: THIS_MONTH_DATE, is_archived: true }),
      ],
      expenses: [], savingsGoals: [], ...CATS,
    });
    expect(snap.allTimeIncome).toBe(9000);
  });
});

describe('buildSnapshot — top expense categories', () => {
  it('sorts categories by amount descending', () => {
    const snap = buildSnapshot({
      name: 'Ana', budgetLimit: 10000,
      incomeSources: [],
      expenses: [
        { ...makeEntry({ amount: 100, category_id: 'exp-1' }) },
        { ...makeEntry({ amount: 500, category_id: 'exp-2' }) },
      ],
      savingsGoals: [],
      incomeCategories: CATS.incomeCategories,
      expenseCategories: [
        { id: 'exp-1', label: 'Food',      icon: '🍱' },
        { id: 'exp-2', label: 'Transport', icon: '🚌' },
      ],
    });
    expect(snap.topExpenseCategories[0].label).toBe('Transport');
    expect(snap.topExpenseCategories[1].label).toBe('Food');
  });
});

describe('buildSnapshot — recurring', () => {
  it('deduplicates recurring expenses by title', () => {
    const snap = buildSnapshot({
      name: 'Ana', budgetLimit: 10000,
      incomeSources: [],
      expenses: [
        makeEntry({ amount: 500, is_recurring: true, frequency: 'Monthly', title: 'Netflix', date: THIS_MONTH_DATE }),
        makeEntry({ amount: 500, is_recurring: true, frequency: 'Monthly', title: 'Netflix', date: LAST_MONTH_DATE }),
      ],
      savingsGoals: [], ...CATS,
    });
    expect(snap.recurringExpenses).toHaveLength(1);
    expect(snap.recurringExpenses[0].title).toBe('Netflix');
  });

  it('excludes archived recurring entries', () => {
    const snap = buildSnapshot({
      name: 'Ana', budgetLimit: 10000,
      incomeSources: [],
      expenses: [
        makeEntry({ amount: 500, is_recurring: true, frequency: 'Monthly', title: 'Netflix', is_archived: true }),
      ],
      savingsGoals: [], ...CATS,
    });
    expect(snap.recurringExpenses).toHaveLength(0);
  });

  it('defaults frequency label to "Monthly" when frequency is null', () => {
    const snap = buildSnapshot({
      name: 'Ana', budgetLimit: 10000,
      incomeSources: [],
      expenses: [
        makeEntry({ amount: 500, is_recurring: true, frequency: null, title: 'Bill' }),
      ],
      savingsGoals: [], ...CATS,
    });
    expect(snap.recurringExpenses[0].frequency).toBe('Monthly');
  });
});

describe('buildSnapshot — savings goals', () => {
  it('computes goal percentage correctly', () => {
    const snap = buildSnapshot({
      name: 'Ana', budgetLimit: 10000,
      incomeSources: [], expenses: [],
      savingsGoals: [{
        target_amount: 10000, current_amount: 2500,
        title: 'Fund', icon: '💰', is_completed: false, is_archived: false,
      }],
      ...CATS,
    });
    expect(snap.activeGoals[0].pct).toBeCloseTo(25);
  });

  it('caps goal pct at 100 when overfunded', () => {
    const snap = buildSnapshot({
      name: 'Ana', budgetLimit: 10000,
      incomeSources: [], expenses: [],
      savingsGoals: [{
        target_amount: 1000, current_amount: 5000,
        title: 'Fund', icon: '💰', is_completed: false, is_archived: false,
      }],
      ...CATS,
    });
    expect(snap.activeGoals[0].pct).toBe(100);
  });

  it('excludes completed goals from activeGoals', () => {
    const snap = buildSnapshot({
      name: 'Ana', budgetLimit: 10000,
      incomeSources: [], expenses: [],
      savingsGoals: [{
        target_amount: 1000, current_amount: 1000,
        title: 'Done', icon: '💰', is_completed: true, is_archived: false,
      }],
      ...CATS,
    });
    expect(snap.activeGoals).toHaveLength(0);
    expect(snap.completedGoalsCount).toBe(1);
  });

  it('excludes archived goals from activeGoals', () => {
    const snap = buildSnapshot({
      name: 'Ana', budgetLimit: 10000,
      incomeSources: [], expenses: [],
      savingsGoals: [{
        target_amount: 5000, current_amount: 1000,
        title: 'Old', icon: '💰', is_completed: false, is_archived: true,
      }],
      ...CATS,
    });
    expect(snap.activeGoals).toHaveLength(0);
  });
});

describe('buildSnapshot — time fields', () => {
  it('exposes daysInMonth, currentDay, and daysLeft', () => {
    const snap = buildSnapshot({
      name: 'Ana', budgetLimit: 10000,
      incomeSources: [], expenses: [], savingsGoals: [], ...CATS,
    });
    expect(snap.daysInMonth).toBeGreaterThanOrEqual(28);
    expect(snap.currentDay).toBeGreaterThanOrEqual(1);
    expect(snap.daysLeft).toBeGreaterThanOrEqual(0);
    expect(snap.currentDay + snap.daysLeft).toBe(snap.daysInMonth);
  });
});
