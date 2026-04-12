/**
 * PennyWise — Offline Sync Engine
 *
 * Processes the MutationQueue in insertion order when the device comes back
 * online. For each queued mutation:
 *   - insert  → call Supabase insert, get real ID back, replace tempId
 *               references in any later queued mutations so they point to
 *               the real row.
 *   - update  → call Supabase update with stored match + payload.
 *   - delete  → call Supabase delete with stored match.
 *
 * After all mutations succeed the relevant caches are invalidated so
 * screens re-fetch fresh data on next render.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { MutationQueue, QueuedMutation } from '@/lib/mutationQueue';
import { DataCache } from '@/lib/dataCache';

// Track whether a sync is already running to avoid concurrent runs.
let _syncing = false;

/**
 * Tables whose caches need to be invalidated after sync.
 * Maps table name → which DataCache.invalidate* helpers to call.
 */
const TABLE_INVALIDATORS: Record<string, (userId: string) => void> = {
  income_categories: (uid) => {
    DataCache.invalidateIncomeCategories(uid);
    DataCache.invalidateDashboard(uid);
  },
  expense_categories: (uid) => {
    DataCache.invalidateExpenseCategories(uid);
    DataCache.invalidateDashboard(uid);
  },
  income_sources: (uid) => {
    DataCache.invalidateIncomeSources(uid);
    DataCache.invalidateDashboard(uid);
  },
  expenses: (uid) => {
    DataCache.invalidateExpenses(uid);
    DataCache.invalidateDashboard(uid);
  },
  savings_goals: (uid) => {
    DataCache.invalidateSavingsGoals(uid);
    DataCache.invalidateDashboard(uid);
  },
  profiles: (uid) => {
    DataCache.invalidateProfile(uid);
    DataCache.invalidateDashboard(uid);
  },
};

/**
 * Replace every occurrence of `tempId` with `realId` in all pending
 * mutations' payload and match fields. Called after a successful insert
 * so that subsequent updates/deletes reference the real DB row.
 */
async function resolveTempId(tempId: string, realId: string): Promise<void> {
  const all = await MutationQueue.getAll();
  let changed = false;
  const updated = all.map((m) => {
    let mut = { ...m };
    if (mut.payload) {
      const raw = JSON.stringify(mut.payload).split(tempId).join(realId);
      mut.payload = JSON.parse(raw);
      if (raw !== JSON.stringify(m.payload)) changed = true;
    }
    if (mut.match) {
      const raw = JSON.stringify(mut.match).split(tempId).join(realId);
      mut.match = JSON.parse(raw);
      if (raw !== JSON.stringify(m.match)) changed = true;
    }
    if (mut.tempId === tempId) {
      mut = { ...mut, tempId: realId };
      changed = true;
    }
    return mut;
  });
  if (changed) {
    await AsyncStorage.setItem('pw_mutation_queue', JSON.stringify(updated));
  }
}

/**
 * Main sync function. Call this once when the device comes back online.
 * Returns the number of mutations that were successfully synced.
 */
export async function syncMutationQueue(userId: string): Promise<number> {
  if (_syncing) return 0;
  _syncing = true;

  let synced = 0;
  const invalidatedTables = new Set<string>();

  try {
    let queue = await MutationQueue.getAll();

    for (const mutation of queue) {
      const { id, op, table, payload, match, tempId } = mutation;

      try {
        if (op === 'insert' && payload) {
          const { data, error } = await supabase
            .from(table)
            .insert(payload)
            .select('id')
            .single();

          if (error) {
            // Skip non-retriable errors (e.g. unique violation) — remove from queue.
            if (isNonRetriable(error.code)) {
              await MutationQueue.remove(id);
            }
            // For retriable errors (network), stop processing and try again later.
            else {
              break;
            }
          } else {
            const realId: string = (data as any).id;
            // Resolve any later mutations that still reference the temp ID.
            if (tempId && realId && tempId !== realId) {
              await resolveTempId(tempId, realId);
            }
            await MutationQueue.remove(id);
            invalidatedTables.add(table);
            synced++;
          }
        } else if (op === 'update' && payload && match) {
          let query = supabase.from(table).update(payload);
          for (const [col, val] of Object.entries(match)) {
            query = (query as any).eq(col, val);
          }
          const { error } = await query;

          if (error) {
            if (isNonRetriable(error.code)) {
              await MutationQueue.remove(id);
            } else {
              break;
            }
          } else {
            await MutationQueue.remove(id);
            invalidatedTables.add(table);
            synced++;
          }
        } else if (op === 'delete' && match) {
          let query = supabase.from(table).delete();
          for (const [col, val] of Object.entries(match)) {
            query = (query as any).eq(col, val);
          }
          const { error } = await query;

          if (error) {
            if (isNonRetriable(error.code)) {
              await MutationQueue.remove(id);
            } else {
              break;
            }
          } else {
            await MutationQueue.remove(id);
            invalidatedTables.add(table);
            synced++;
          }
        } else {
          // Malformed entry — drop it.
          await MutationQueue.remove(id);
        }
      } catch {
        // Network error mid-mutation — stop processing, leave queue intact.
        break;
      }
    }
  } finally {
    _syncing = false;
  }

  // Invalidate caches for every table we successfully wrote to.
  for (const table of invalidatedTables) {
    TABLE_INVALIDATORS[table]?.(userId);
  }

  return synced;
}

/**
 * Supabase/PostgREST error codes that are permanent and should not be retried.
 * (e.g. unique violations, foreign-key violations, check constraint failures)
 */
function isNonRetriable(code?: string): boolean {
  if (!code) return false;
  const NON_RETRIABLE = new Set([
    '23505', // unique_violation
    '23503', // foreign_key_violation
    '23514', // check_violation
    '22P02', // invalid_text_representation
    'PGRST116', // 0 rows
  ]);
  return NON_RETRIABLE.has(code);
}
