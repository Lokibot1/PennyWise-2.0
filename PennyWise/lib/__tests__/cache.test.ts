import AsyncStorage from '@react-native-async-storage/async-storage';
import { Cache } from '../cache';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem:     jest.fn(),
  setItem:     jest.fn(),
  removeItem:  jest.fn(),
  getAllKeys:   jest.fn(),
  multiRemove: jest.fn(),
}));

const mockStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

// Flush all pending promise microtasks (needed for fire-and-forget async ops)
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();

  // Safe defaults so no test unexpectedly throws
  mockStorage.getItem.mockResolvedValue(null);
  mockStorage.setItem.mockResolvedValue(undefined as any);
  mockStorage.removeItem.mockResolvedValue(undefined as any);
  mockStorage.getAllKeys.mockResolvedValue([]);
  mockStorage.multiRemove.mockResolvedValue(undefined as any);

  // Clear in-memory store before every test
  Cache.clearAll();
});

// ── Cache.get ─────────────────────────────────────────────────────────────────

describe('Cache.get', () => {
  it('returns null for a key that was never set', async () => {
    const result = await Cache.get('nonexistent');
    expect(result).toBeNull();
  });

  it('returns data from memory on a warm read', async () => {
    await Cache.set('user:1', { name: 'Alice' }, 60);
    mockStorage.getItem.mockClear();

    const result = await Cache.get<{ name: string }>('user:1');

    expect(result).toEqual({ name: 'Alice' });
    // Memory hit — AsyncStorage should not have been consulted
    expect(mockStorage.getItem).not.toHaveBeenCalled();
  });

  it('returns data from AsyncStorage on a cold read', async () => {
    const entry = { data: { name: 'Bob' }, expiresAt: Date.now() + 60_000 };
    mockStorage.getItem.mockResolvedValue(JSON.stringify(entry));

    const result = await Cache.get<{ name: string }>('user:2');

    expect(result).toEqual({ name: 'Bob' });
    expect(mockStorage.getItem).toHaveBeenCalledWith('pw_cache_v1:user:2');
  });

  it('promotes an AsyncStorage hit back into memory for subsequent reads', async () => {
    const entry = { data: 'cached-value', expiresAt: Date.now() + 60_000 };
    mockStorage.getItem.mockResolvedValue(JSON.stringify(entry));

    await Cache.get('promo:1');        // cold read — promotes to memory
    mockStorage.getItem.mockClear();
    await Cache.get('promo:1');        // should now hit memory

    expect(mockStorage.getItem).not.toHaveBeenCalled();
  });

  it('returns null and evicts an expired in-memory entry', async () => {
    const now = 1_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    await Cache.set('exp:mem', 'value', 60); // expiresAt = 1_060_000

    jest.spyOn(Date, 'now').mockReturnValue(now + 120_000); // past expiry
    const result = await Cache.get('exp:mem');

    expect(result).toBeNull();
  });

  it('returns null and removes an expired AsyncStorage entry', async () => {
    const now = 1_000_000;
    const entry = { data: 'stale', expiresAt: now - 1 }; // already expired
    mockStorage.getItem.mockResolvedValue(JSON.stringify(entry));
    jest.spyOn(Date, 'now').mockReturnValue(now);

    const result = await Cache.get('exp:storage');

    expect(result).toBeNull();
    expect(mockStorage.removeItem).toHaveBeenCalledWith('pw_cache_v1:exp:storage');
  });

  it('returns null when AsyncStorage throws', async () => {
    mockStorage.getItem.mockRejectedValue(new Error('storage error'));

    const result = await Cache.get('boom');

    expect(result).toBeNull();
  });
});

// ── Cache.set ─────────────────────────────────────────────────────────────────

describe('Cache.set', () => {
  it('stores data that is immediately readable via get', async () => {
    await Cache.set('profile:1', { score: 42 }, 60);
    const result = await Cache.get<{ score: number }>('profile:1');
    expect(result).toEqual({ score: 42 });
  });

  it('writes the entry to AsyncStorage with the correct prefixed key', async () => {
    await Cache.set('profile:1', { score: 42 }, 60);
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      'pw_cache_v1:profile:1',
      expect.any(String),
    );
  });

  it('uses a 120-second TTL by default when ttlSeconds is omitted', async () => {
    const now = 5_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);

    await Cache.set('ttl:default', 'x');

    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1] as string);
    expect(stored.expiresAt).toBe(now + 120_000);
  });

  it('respects a custom TTL', async () => {
    const now = 5_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(now);

    await Cache.set('ttl:custom', 'x', 300);

    const stored = JSON.parse(mockStorage.setItem.mock.calls[0][1] as string);
    expect(stored.expiresAt).toBe(now + 300_000);
  });
});

// ── Cache.invalidate ──────────────────────────────────────────────────────────

describe('Cache.invalidate', () => {
  it('removes the entry from memory so get returns null', async () => {
    await Cache.set('inv:1', 'data', 60);
    Cache.invalidate('inv:1');
    const result = await Cache.get('inv:1');
    expect(result).toBeNull();
  });

  it('calls AsyncStorage.removeItem with the correct prefixed key', () => {
    Cache.invalidate('inv:1');
    expect(mockStorage.removeItem).toHaveBeenCalledWith('pw_cache_v1:inv:1');
  });
});

// ── Cache.invalidatePrefix ────────────────────────────────────────────────────

describe('Cache.invalidatePrefix', () => {
  it('removes all in-memory keys that start with the prefix', async () => {
    await Cache.set('income:uid1', 'a', 60);
    await Cache.set('income:uid2', 'b', 60);
    await Cache.set('expenses:uid1', 'c', 60);

    Cache.invalidatePrefix('income:');

    expect(await Cache.get('income:uid1')).toBeNull();
    expect(await Cache.get('income:uid2')).toBeNull();
  });

  it('does not remove in-memory keys that do not match the prefix', async () => {
    await Cache.set('income:uid1', 'a', 60);
    await Cache.set('expenses:uid1', 'keep', 60);
    mockStorage.getItem.mockClear();

    Cache.invalidatePrefix('income:');

    // 'expenses:uid1' should still be in memory — no storage fallback needed
    const result = await Cache.get('expenses:uid1');
    expect(result).toBe('keep');
    expect(mockStorage.getItem).not.toHaveBeenCalled();
  });

  it('removes matching keys from AsyncStorage', async () => {
    mockStorage.getAllKeys.mockResolvedValue([
      'pw_cache_v1:income:uid1',
      'pw_cache_v1:income:uid2',
      'pw_cache_v1:expenses:uid1',
      'unrelated_key',
    ] as any);

    Cache.invalidatePrefix('income:');
    await flushPromises();

    expect(mockStorage.multiRemove).toHaveBeenCalledWith([
      'pw_cache_v1:income:uid1',
      'pw_cache_v1:income:uid2',
    ]);
  });
});

// ── Cache.clearAll ────────────────────────────────────────────────────────────

describe('Cache.clearAll', () => {
  it('evicts all in-memory entries', async () => {
    await Cache.set('a', 1, 60);
    await Cache.set('b', 2, 60);
    await Cache.set('c', 3, 60);

    Cache.clearAll();

    expect(await Cache.get('a')).toBeNull();
    expect(await Cache.get('b')).toBeNull();
    expect(await Cache.get('c')).toBeNull();
  });

  it('removes all pw_cache_v1: prefixed keys from AsyncStorage', async () => {
    mockStorage.getAllKeys.mockResolvedValue([
      'pw_cache_v1:profile:uid1',
      'pw_cache_v1:income:uid1',
      'some_other_app_key',
    ] as any);

    Cache.clearAll();
    await flushPromises();

    expect(mockStorage.multiRemove).toHaveBeenCalledWith([
      'pw_cache_v1:profile:uid1',
      'pw_cache_v1:income:uid1',
    ]);
  });
});
