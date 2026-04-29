import { sfx } from '../sfx';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockImpactAsync       = jest.fn().mockResolvedValue(undefined);
const mockNotificationAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle:    { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy', Rigid: 'Rigid' },
  NotificationFeedbackType: { Success: 'Success' },
  impactAsync:       (...a: any[]) => mockImpactAsync(...a),
  notificationAsync: (...a: any[]) => mockNotificationAsync(...a),
}));

jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn().mockResolvedValue({
        sound: {
          setRateAsync:              jest.fn().mockResolvedValue(undefined),
          playAsync:                 jest.fn().mockResolvedValue(undefined),
          setOnPlaybackStatusUpdate: jest.fn(),
          unloadAsync:               jest.fn().mockResolvedValue(undefined),
        },
      }),
    },
  },
}));

beforeEach(() => jest.clearAllMocks());

// ── sfx.tap ───────────────────────────────────────────────────────────────────

describe('sfx.tap', () => {
  it('resolves without throwing', async () => {
    await expect(sfx.tap()).resolves.toBeUndefined();
  });

  it('calls impactAsync with Light', async () => {
    await sfx.tap();
    expect(mockImpactAsync).toHaveBeenCalledWith('Light');
  });

  it('calls impactAsync exactly once', async () => {
    await sfx.tap();
    expect(mockImpactAsync).toHaveBeenCalledTimes(1);
  });
});

// ── sfx.toggle ────────────────────────────────────────────────────────────────

describe('sfx.toggle', () => {
  it('resolves without throwing', async () => {
    await expect(sfx.toggle()).resolves.toBeUndefined();
  });

  it('calls impactAsync twice (Rigid then Light)', async () => {
    await sfx.toggle();
    expect(mockImpactAsync).toHaveBeenCalledTimes(2);
    expect(mockImpactAsync).toHaveBeenNthCalledWith(1, 'Rigid');
    expect(mockImpactAsync).toHaveBeenNthCalledWith(2, 'Light');
  });
});

// ── sfx.success ───────────────────────────────────────────────────────────────

describe('sfx.success', () => {
  it('resolves without throwing', async () => {
    await expect(sfx.success()).resolves.toBeUndefined();
  });

  it('calls impactAsync three times', async () => {
    await sfx.success();
    expect(mockImpactAsync).toHaveBeenCalledTimes(3);
  });
});

// ── sfx.error ─────────────────────────────────────────────────────────────────

describe('sfx.error', () => {
  it('resolves without throwing', async () => {
    await expect(sfx.error()).resolves.toBeUndefined();
  });

  it('calls impactAsync with Heavy twice', async () => {
    await sfx.error();
    expect(mockImpactAsync).toHaveBeenCalledTimes(2);
    expect(mockImpactAsync).toHaveBeenCalledWith('Heavy');
  });
});

// ── sfx.warning ───────────────────────────────────────────────────────────────

describe('sfx.warning', () => {
  it('resolves without throwing', async () => {
    await expect(sfx.warning()).resolves.toBeUndefined();
  });

  it('calls impactAsync with Medium twice', async () => {
    await sfx.warning();
    expect(mockImpactAsync).toHaveBeenCalledTimes(2);
    expect(mockImpactAsync).toHaveBeenCalledWith('Medium');
  });
});

// ── sfx.coin ──────────────────────────────────────────────────────────────────

describe('sfx.coin', () => {
  it('resolves without throwing', async () => {
    await expect(sfx.coin()).resolves.toBeUndefined();
  });

  it('calls impactAsync three times', async () => {
    await sfx.coin();
    expect(mockImpactAsync).toHaveBeenCalledTimes(3);
  });

  it('starts with Rigid impact', async () => {
    await sfx.coin();
    expect(mockImpactAsync).toHaveBeenNthCalledWith(1, 'Rigid');
  });
});

// ── sfx.complete ──────────────────────────────────────────────────────────────

describe('sfx.complete', () => {
  it('resolves without throwing', async () => {
    await expect(sfx.complete()).resolves.toBeUndefined();
  });

  it('calls notificationAsync with Success', async () => {
    await sfx.complete();
    expect(mockNotificationAsync).toHaveBeenCalledWith('Success');
    expect(mockNotificationAsync).toHaveBeenCalledTimes(1);
  });

  it('calls impactAsync three times after the notification burst', async () => {
    await sfx.complete();
    expect(mockImpactAsync).toHaveBeenCalledTimes(3);
  });
});
