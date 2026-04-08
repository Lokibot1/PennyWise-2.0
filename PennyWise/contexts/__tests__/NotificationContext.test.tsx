import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { NotificationProvider, useNotifications } from '../NotificationContext';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetUser   = jest.fn();
let mockOnAuthCb: ((event: string) => void) | null = null;
const mockUnsubscribe = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: (...a: any[]) => mockGetUser(...a),
      onAuthStateChange: jest.fn((cb: any) => {
        mockOnAuthCb = cb;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }),
    },
  },
}));

const mockGenerateNotifications = jest.fn().mockResolvedValue([]);
jest.mock('@/lib/notifications', () => ({
  generateNotifications: (...a: any[]) => mockGenerateNotifications(...a),
}));

const mockLoadNotifPrefs  = jest.fn();
const mockSaveNotifPrefs  = jest.fn().mockResolvedValue(undefined);
const mockFilterByPrefs   = jest.fn((notifs: any[]) => notifs);
const DEFAULT_PREFS = {
  budget_50: true, budget_90: true, budget_exceeded: true,
  low_balance: true, goal_50: true, goal_75: true, goal_100: true,
  no_goals: true, new_month: true, recurring: true,
};

jest.mock('@/lib/notificationPrefs', () => ({
  loadNotifPrefs:  (...a: any[]) => mockLoadNotifPrefs(...a),
  saveNotifPrefs:  (...a: any[]) => mockSaveNotifPrefs(...a),
  filterByPrefs:   (...a: any[]) => mockFilterByPrefs(...a),
  DEFAULT_PREFS,
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const USER = { id: 'user-notif-1' };

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NotificationProvider>{children}</NotificationProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  mockOnAuthCb = null;
  mockGetUser.mockResolvedValue({ data: { user: USER } });
  mockLoadNotifPrefs.mockResolvedValue(DEFAULT_PREFS);
  mockGenerateNotifications.mockResolvedValue([]);
  mockFilterByPrefs.mockImplementation((notifs: any[]) => notifs);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('NotificationProvider — initial load', () => {
  it('calls getUser on mount', async () => {
    renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(mockGetUser).toHaveBeenCalled());
  });

  it('calls generateNotifications with user id', async () => {
    renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(mockGenerateNotifications).toHaveBeenCalledWith(USER.id));
  });

  it('calls loadNotifPrefs with user id', async () => {
    renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(mockLoadNotifPrefs).toHaveBeenCalledWith(USER.id));
  });

  it('does not load notifications when user is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(mockGetUser).toHaveBeenCalled());
    expect(mockGenerateNotifications).not.toHaveBeenCalled();
  });

  it('registers onAuthStateChange on mount', async () => {
    const { supabase } = require('@/lib/supabase');
    renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(supabase.auth.onAuthStateChange).toHaveBeenCalled());
  });

  it('unsubscribes from auth on unmount', async () => {
    const { unmount } = renderHook(() => useNotifications(), { wrapper });
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('restores read IDs from AsyncStorage on mount', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(['notif-1', 'notif-2']));
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith('pw_notif_read_v1'));
  });
});

describe('NotificationProvider — auth events', () => {
  it('calls refresh again on SIGNED_IN', async () => {
    renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(mockGetUser).toHaveBeenCalledTimes(1));

    act(() => { mockOnAuthCb?.('SIGNED_IN'); });
    await waitFor(() => expect(mockGetUser).toHaveBeenCalledTimes(2));
  });

  it('clears notifications on SIGNED_OUT', async () => {
    const notif = { id: 'n1', type: 'budget_50', title: 'Test', body: '', priority: 1 };
    mockGenerateNotifications.mockResolvedValue([notif]);
    mockFilterByPrefs.mockImplementation((notifs: any[]) => notifs);

    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.notifications).toHaveLength(1));

    act(() => { mockOnAuthCb?.('SIGNED_OUT'); });
    await waitFor(() => expect(result.current.notifications).toHaveLength(0));
  });

  it('resets prefs to DEFAULT_PREFS on SIGNED_OUT', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(mockGetUser).toHaveBeenCalled());

    act(() => { mockOnAuthCb?.('SIGNED_OUT'); });
    await waitFor(() => expect(result.current.prefs).toEqual(DEFAULT_PREFS));
  });
});

describe('NotificationProvider — actions', () => {
  it('markRead adds the id to readIds', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(mockGetUser).toHaveBeenCalled());

    act(() => { result.current.markRead('notif-42'); });
    expect(result.current.readIds.has('notif-42')).toBe(true);
  });

  it('markRead persists to AsyncStorage', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(mockGetUser).toHaveBeenCalled());

    act(() => { result.current.markRead('notif-42'); });
    await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'pw_notif_read_v1',
      expect.stringContaining('notif-42'),
    ));
  });

  it('markAllRead marks every notification as read', async () => {
    const notifs = [
      { id: 'n1', type: 'budget_50', title: 'A', body: '', priority: 1 },
      { id: 'n2', type: 'budget_90', title: 'B', body: '', priority: 2 },
    ];
    mockGenerateNotifications.mockResolvedValue(notifs);
    mockFilterByPrefs.mockImplementation((n: any[]) => n);

    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.notifications).toHaveLength(2));

    act(() => { result.current.markAllRead(); });
    expect(result.current.readIds.has('n1')).toBe(true);
    expect(result.current.readIds.has('n2')).toBe(true);
  });

  it('unreadCount reflects unmarked notifications', async () => {
    const notifs = [
      { id: 'n1', type: 'budget_50', title: 'A', body: '', priority: 1 },
      { id: 'n2', type: 'budget_90', title: 'B', body: '', priority: 2 },
    ];
    mockGenerateNotifications.mockResolvedValue(notifs);
    mockFilterByPrefs.mockImplementation((n: any[]) => n);

    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.unreadCount).toBe(2));

    act(() => { result.current.markRead('n1'); });
    expect(result.current.unreadCount).toBe(1);
  });

  it('openPanel sets panelVisible to true', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(mockGetUser).toHaveBeenCalled());

    const layout = { pageX: 0, pageY: 0, width: 40, height: 40 };
    act(() => { result.current.openPanel(layout); });
    expect(result.current.panelVisible).toBe(true);
  });

  it('closePanel sets panelVisible to false', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(mockGetUser).toHaveBeenCalled());

    const layout = { pageX: 0, pageY: 0, width: 40, height: 40 };
    act(() => { result.current.openPanel(layout); });
    act(() => { result.current.closePanel(); });
    expect(result.current.panelVisible).toBe(false);
  });

  it('updatePrefs calls saveNotifPrefs and regenerates notifications', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(mockGetUser).toHaveBeenCalled());

    const newPrefs = { ...DEFAULT_PREFS, budget_50: false };
    await act(async () => { await result.current.updatePrefs(newPrefs); });

    expect(mockSaveNotifPrefs).toHaveBeenCalledWith(USER.id, newPrefs);
    expect(result.current.prefs).toEqual(newPrefs);
  });

  it('updatePrefs re-filters notifications with new prefs', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(mockGetUser).toHaveBeenCalled());

    const newPrefs = { ...DEFAULT_PREFS, budget_50: false };
    await act(async () => { await result.current.updatePrefs(newPrefs); });

    expect(mockFilterByPrefs).toHaveBeenCalledWith(expect.any(Array), newPrefs);
  });

  it('updatePrefs does nothing when user is not signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(mockGetUser).toHaveBeenCalled());

    const newPrefs = { ...DEFAULT_PREFS, budget_50: false };
    await act(async () => { await result.current.updatePrefs(newPrefs); });

    expect(mockSaveNotifPrefs).not.toHaveBeenCalled();
  });
});
