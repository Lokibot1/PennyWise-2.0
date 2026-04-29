import { registerForPushNotifications, syncPushNotifications, clearPushedSet } from '../pushNotifications';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetPermissions    = jest.fn();
const mockRequestPermissions = jest.fn();
const mockSetChannel        = jest.fn();
const mockSchedule          = jest.fn();

jest.mock('expo-notifications', () => ({
  getPermissionsAsync:         (...a: any[]) => mockGetPermissions(...a),
  requestPermissionsAsync:     (...a: any[]) => mockRequestPermissions(...a),
  setNotificationChannelAsync: (...a: any[]) => mockSetChannel(...a),
  setNotificationHandler:      jest.fn(),
  scheduleNotificationAsync:   (...a: any[]) => mockSchedule(...a),
  AndroidImportance: { HIGH: 4 },
}));

jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-constants', () => ({ appOwnership: null }));
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

const mockAsyncGet    = jest.fn();
const mockAsyncSet    = jest.fn();
const mockAsyncRemove = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem:    (...a: any[]) => mockAsyncGet(...a),
  setItem:    (...a: any[]) => mockAsyncSet(...a),
  removeItem: (...a: any[]) => mockAsyncRemove(...a),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGetPermissions.mockResolvedValue({ status: 'granted' });
  mockRequestPermissions.mockResolvedValue({ status: 'granted' });
  mockAsyncGet.mockResolvedValue(null);
  mockAsyncSet.mockResolvedValue(undefined);
  mockAsyncRemove.mockResolvedValue(undefined);
  mockSchedule.mockResolvedValue(undefined);
  mockSetChannel.mockResolvedValue(undefined);
});

// ── registerForPushNotifications ──────────────────────────────────────────────

describe('registerForPushNotifications', () => {
  it('resolves without throwing', async () => {
    await expect(registerForPushNotifications()).resolves.toBeUndefined();
  });

  it('does not request permissions when already granted', async () => {
    await registerForPushNotifications();
    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });

  it('requests permissions when current status is not granted', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'denied' });
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    await registerForPushNotifications();
    expect(mockRequestPermissions).toHaveBeenCalled();
  });

  it('does nothing after permissions are denied', async () => {
    mockGetPermissions.mockResolvedValue({ status: 'denied' });
    mockRequestPermissions.mockResolvedValue({ status: 'denied' });
    await registerForPushNotifications();
    expect(mockSetChannel).not.toHaveBeenCalled();
  });
});

// ── syncPushNotifications ─────────────────────────────────────────────────────

const NOTIFS = [
  { id: 'n1', title: 'Budget Alert', body: 'You are at 90%', type: 'budget_90', priority: 1 },
  { id: 'n2', title: 'Goal Progress', body: 'You hit 50%!',  type: 'goal_50',  priority: 2 },
];

describe('syncPushNotifications — disabled', () => {
  it('does nothing when pushEnabled is false', async () => {
    await syncPushNotifications(NOTIFS, false);
    expect(mockSchedule).not.toHaveBeenCalled();
    expect(mockAsyncSet).not.toHaveBeenCalled();
  });
});

describe('syncPushNotifications — new notifications', () => {
  it('schedules every notification that has not been pushed yet', async () => {
    await syncPushNotifications(NOTIFS, true);
    expect(mockSchedule).toHaveBeenCalledTimes(2);
  });

  it('schedules with the correct title and body', async () => {
    await syncPushNotifications(NOTIFS, true);
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: 'Budget Alert', body: 'You are at 90%' }),
      })
    );
  });

  it('fires immediately (trigger: null)', async () => {
    await syncPushNotifications(NOTIFS, true);
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: null })
    );
  });

  it('persists pushed ids to AsyncStorage', async () => {
    await syncPushNotifications(NOTIFS, true);
    expect(mockAsyncSet).toHaveBeenCalledWith(
      'pw_pushed_notif_v1',
      expect.stringContaining('n1'),
    );
  });
});

describe('syncPushNotifications — already-pushed notifications', () => {
  it('does not schedule a notification whose id is already in the pushed set', async () => {
    mockAsyncGet.mockResolvedValue(JSON.stringify(['n1', 'n2']));
    await syncPushNotifications(NOTIFS, true);
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it('does not call setItem when there are no new notifications', async () => {
    mockAsyncGet.mockResolvedValue(JSON.stringify(['n1', 'n2']));
    await syncPushNotifications(NOTIFS, true);
    expect(mockAsyncSet).not.toHaveBeenCalled();
  });

  it('only schedules notifications not yet in the pushed set', async () => {
    mockAsyncGet.mockResolvedValue(JSON.stringify(['n1']));
    await syncPushNotifications(NOTIFS, true);
    expect(mockSchedule).toHaveBeenCalledTimes(1);
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: 'Goal Progress' }),
      })
    );
  });
});

describe('syncPushNotifications — pruning stale ids', () => {
  it('removes ids that are no longer in the active notification set', async () => {
    // 'n-stale' was pushed before but is no longer in NOTIFS
    mockAsyncGet.mockResolvedValue(JSON.stringify(['n-stale', 'n1']));
    await syncPushNotifications(NOTIFS, true);
    const savedArg = JSON.parse(mockAsyncSet.mock.calls[0][1]) as string[];
    expect(savedArg).not.toContain('n-stale');
  });
});

// ── clearPushedSet ────────────────────────────────────────────────────────────

describe('clearPushedSet', () => {
  it('removes the pushed-notif key from AsyncStorage', async () => {
    await clearPushedSet();
    expect(mockAsyncRemove).toHaveBeenCalledWith('pw_pushed_notif_v1');
  });

  it('resolves without throwing', async () => {
    await expect(clearPushedSet()).resolves.toBeUndefined();
  });
});
