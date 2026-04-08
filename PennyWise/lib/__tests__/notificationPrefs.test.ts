import {
  loadNotifPrefs,
  saveNotifPrefs,
  filterByPrefs,
  DEFAULT_PREFS,
} from '../notificationPrefs';
import type { NotifPrefs } from '../notificationPrefs';
import type { AppNotification } from '../notifications';

// ── Mock Supabase ─────────────────────────────────────────────────────────────

const mockUpdate  = jest.fn();
const mockEqUpdate = jest.fn(() => ({ error: null }));
const mockSingle  = jest.fn();
const mockEqSelect = jest.fn(() => ({ single: mockSingle }));
const mockSelect  = jest.fn(() => ({ eq: mockEqSelect }));
const mockFrom    = jest.fn(() => ({
  select: mockSelect,
  update: mockUpdate,
}));

jest.mock('./supabase', () => ({ supabase: { from: (...a: any[]) => mockFrom(...a) } }), { virtual: true });
jest.mock('@/lib/supabase', () => ({ supabase: { from: (...a: any[]) => mockFrom(...a) } }));

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdate.mockReturnValue({ eq: mockEqUpdate });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNotif(id: string, type: AppNotification['type'] = 'info'): AppNotification {
  return { id, type, icon: 'info', iconColor: '#000', title: id, body: '', createdAt: '' };
}

// ── loadNotifPrefs ────────────────────────────────────────────────────────────

describe('loadNotifPrefs', () => {
  it('returns DEFAULT_PREFS when the query errors', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'err' } });
    const prefs = await loadNotifPrefs('user-1');
    expect(prefs).toEqual(DEFAULT_PREFS);
  });

  it('returns DEFAULT_PREFS when notification_prefs is null', async () => {
    mockSingle.mockResolvedValue({ data: { notification_prefs: null }, error: null });
    const prefs = await loadNotifPrefs('user-1');
    expect(prefs).toEqual(DEFAULT_PREFS);
  });

  it('merges stored prefs over the defaults', async () => {
    mockSingle.mockResolvedValue({
      data: { notification_prefs: { budget_70: false, new_month: false } },
      error: null,
    });
    const prefs = await loadNotifPrefs('user-1');
    expect(prefs.budget_70).toBe(false);
    expect(prefs.new_month).toBe(false);
    // Other fields retain their defaults
    expect(prefs.budget_90).toBe(true);
    expect(prefs.goal_100).toBe(true);
  });

  it('queries the profiles table for the correct user', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'err' } });
    await loadNotifPrefs('user-42');
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockEqSelect).toHaveBeenCalledWith('id', 'user-42');
  });
});

// ── saveNotifPrefs ────────────────────────────────────────────────────────────

describe('saveNotifPrefs', () => {
  it('calls supabase.update on profiles with the prefs', async () => {
    const prefs: NotifPrefs = { ...DEFAULT_PREFS, budget_70: false };
    await saveNotifPrefs('user-1', prefs);
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith({ notification_prefs: prefs });
    expect(mockEqUpdate).toHaveBeenCalledWith('id', 'user-1');
  });
});

// ── filterByPrefs ─────────────────────────────────────────────────────────────

describe('filterByPrefs', () => {
  const allOn: NotifPrefs = { ...DEFAULT_PREFS };
  const allOff: NotifPrefs = Object.fromEntries(
    Object.keys(DEFAULT_PREFS).map(k => [k, false])
  ) as NotifPrefs;

  it('keeps all notifications when all prefs are enabled', () => {
    const notifs = [
      makeNotif('budget_70_2024-01'),
      makeNotif('budget_90_2024-01'),
      makeNotif('budget_exceeded_2024-01'),
      makeNotif('low_balance_2024-01'),
      makeNotif('goal_50_abc_2024-01'),
      makeNotif('goal_75_abc_2024-01'),
      makeNotif('goal_100_abc'),
      makeNotif('no_goals_2024-01'),
      makeNotif('new_month_2024-01'),
      makeNotif('recurring_reminder_2024-01'),
    ];
    expect(filterByPrefs(notifs, allOn)).toHaveLength(10);
  });

  it('removes all notifications when all prefs are disabled', () => {
    const notifs = [
      makeNotif('budget_70_2024-01'),
      makeNotif('budget_90_2024-01'),
      makeNotif('low_balance_2024-01'),
    ];
    expect(filterByPrefs(notifs, allOff)).toHaveLength(0);
  });

  it('filters budget_70 notifications when pref is false', () => {
    const notifs = [makeNotif('budget_70_2024-01'), makeNotif('budget_90_2024-01')];
    const result = filterByPrefs(notifs, { ...allOn, budget_70: false });
    expect(result.map(n => n.id)).toEqual(['budget_90_2024-01']);
  });

  it('filters budget_exceeded notifications when pref is false', () => {
    const notifs = [makeNotif('budget_exceeded_2024-01'), makeNotif('budget_90_2024-01')];
    const result = filterByPrefs(notifs, { ...allOn, budget_exceeded: false });
    expect(result.map(n => n.id)).toEqual(['budget_90_2024-01']);
  });

  it('filters low_balance notifications when pref is false', () => {
    const notifs = [makeNotif('low_balance_2024-01'), makeNotif('new_month_2024-01')];
    const result = filterByPrefs(notifs, { ...allOn, low_balance: false });
    expect(result.map(n => n.id)).toEqual(['new_month_2024-01']);
  });

  it('filters goal_100 notifications when pref is false', () => {
    const notifs = [makeNotif('goal_100_abc'), makeNotif('goal_75_abc_2024-01')];
    const result = filterByPrefs(notifs, { ...allOn, goal_100: false });
    expect(result.map(n => n.id)).toEqual(['goal_75_abc_2024-01']);
  });

  it('passes through unrecognised notification ids', () => {
    const notifs = [makeNotif('custom_alert_xyz')];
    expect(filterByPrefs(notifs, allOff)).toHaveLength(1);
  });
});
