/**
 * PennyWise — TTL Cache
 *
 * Two-layer caching:
 *   1. In-memory Map  — instant reads within a session (no I/O)
 *   2. AsyncStorage   — warm start on cold app launch (survives process kill)
 *
 * Usage:
 *   const data = await Cache.get<Profile>('profile:uid123');
 *   await Cache.set('profile:uid123', data, 5 * 60); // 5-min TTL
 *   Cache.invalidate('profile:uid123');              // on write
 *   Cache.invalidatePrefix('inc:uid123');            // invalidate all keys for a resource
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = 'pw_cache_v1:';

interface CacheEntry<T> {
  data:      T;
  expiresAt: number; // Unix ms
}

// ── In-memory store ────────────────────────────────────────────────────────────
const memStore = new Map<string, CacheEntry<unknown>>();

function isExpired(entry: CacheEntry<unknown>): boolean {
  return Date.now() > entry.expiresAt;
}

// ── Public API ─────────────────────────────────────────────────────────────────
export const Cache = {
  /**
   * Read from cache. Returns null if missing or expired.
   * Checks in-memory first, then AsyncStorage.
   */
  async get<T>(key: string): Promise<T | null> {
    // 1. In-memory
    const mem = memStore.get(key) as CacheEntry<T> | undefined;
    if (mem) {
      if (!isExpired(mem)) return mem.data;
      memStore.delete(key);
    }

    // 2. AsyncStorage
    try {
      const raw = await AsyncStorage.getItem(STORAGE_PREFIX + key);
      if (!raw) return null;
      const entry: CacheEntry<T> = JSON.parse(raw);
      if (isExpired(entry)) {
        AsyncStorage.removeItem(STORAGE_PREFIX + key).catch(() => {});
        return null;
      }
      // Promote back to memory for subsequent reads this session
      memStore.set(key, entry);
      return entry.data;
    } catch {
      return null;
    }
  },

  /**
   * Write to both layers.
   * @param ttlSeconds  How long the entry lives (default 120 s)
   */
  async set<T>(key: string, data: T, ttlSeconds = 120): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    };
    memStore.set(key, entry);
    try {
      await AsyncStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
    } catch {
      // Storage write failure is non-fatal; in-memory still works
    }
  },

  /** Remove a single cache entry from both layers. */
  invalidate(key: string): void {
    memStore.delete(key);
    AsyncStorage.removeItem(STORAGE_PREFIX + key).catch(() => {});
  },

  /**
   * Remove all cache entries whose key starts with `prefix`.
   * Use this to invalidate all cached data for one resource/user.
   * e.g. Cache.invalidatePrefix('income_sources:uid123')
   */
  invalidatePrefix(prefix: string): void {
    for (const key of memStore.keys()) {
      if (key.startsWith(prefix)) memStore.delete(key);
    }
    // Best-effort AsyncStorage sweep (keys are enumerated)
    AsyncStorage.getAllKeys()
      .then(keys => {
        const toRemove = keys.filter(k =>
          k.startsWith(STORAGE_PREFIX + prefix)
        );
        if (toRemove.length) AsyncStorage.multiRemove(toRemove).catch(() => {});
      })
      .catch(() => {});
  },

  /** Remove all PennyWise cache entries (call on sign-out). */
  clearAll(): void {
    memStore.clear();
    AsyncStorage.getAllKeys()
      .then(keys => {
        const toRemove = keys.filter(k => k.startsWith(STORAGE_PREFIX));
        if (toRemove.length) AsyncStorage.multiRemove(toRemove).catch(() => {});
      })
      .catch(() => {});
  },
};
