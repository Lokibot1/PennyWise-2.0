import { supabase } from '@/lib/supabase';
import { DataCache } from '@/lib/dataCache';
import { logActivity, ACTION, ENTITY } from '@/lib/logActivity';

// Cap per-entry backfill so a long-dormant app doesn't flood the ledger.
const MAX_PERIODS_PER_ENTRY = 12;

function addPeriod(date: Date, frequency: string): Date {
  const d = new Date(date);
  switch (frequency?.toLowerCase()) {
    case 'daily':   d.setDate(d.getDate() + 1); break;
    case 'weekly':  d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'yearly':  d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

async function processTable(
  userId: string,
  table: 'expenses' | 'income_sources',
  today: Date,
): Promise<number> {
  const { data, error } = await supabase
    .from(table)
    .select('id, category_id, title, amount, date, time, description, frequency, last_processed_at')
    .eq('user_id', userId)
    .eq('is_recurring', true)
    .eq('is_archived', false);

  if (error || !data || data.length === 0) return 0;

  let totalInserted = 0;

  for (const entry of data) {
    // Anchor: last time we processed this entry, or its original date.
    const anchor = entry.last_processed_at
      ? new Date(entry.last_processed_at)
      : new Date(entry.date);

    let nextDue = addPeriod(anchor, entry.frequency);
    const newRows: Record<string, unknown>[] = [];

    while (nextDue <= today && newRows.length < MAX_PERIODS_PER_ENTRY) {
      newRows.push({
        user_id:      userId,
        category_id:  entry.category_id,
        title:        entry.title,
        amount:       entry.amount,
        date:         nextDue.toISOString().split('T')[0],
        time:         entry.time ?? '00:00:00',
        description:  entry.description ?? '',
        is_recurring: false,
        frequency:    null,
        is_archived:  false,
      });
      nextDue = addPeriod(nextDue, entry.frequency);
    }

    if (newRows.length > 0) {
      const { error: insertErr } = await supabase.from(table).insert(newRows);
      if (!insertErr) totalInserted += newRows.length;
    }

    // Always advance the watermark so we don't re-process on the next run.
    await supabase
      .from(table)
      .update({ last_processed_at: today.toISOString() })
      .eq('id', entry.id)
      .eq('user_id', userId);
  }

  return totalInserted;
}

/**
 * Auto-generate new ledger entries for every active recurring template.
 * Safe to call on every app open — idempotent within the same calendar day.
 */
export async function processRecurringTransactions(userId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [expenseCount, incomeCount] = await Promise.all([
    processTable(userId, 'expenses', today),
    processTable(userId, 'income_sources', today),
  ]);

  if (expenseCount === 0 && incomeCount === 0) return;

  // Bust caches so the next screen load fetches fresh data.
  DataCache.invalidateExpenses(userId);
  DataCache.invalidateIncomeSources(userId);
  DataCache.invalidateDashboard(userId);

  if (expenseCount > 0) {
    await logActivity({
      user_id:     userId,
      action_type: ACTION.EXPENSE_ADDED,
      entity_type: ENTITY.EXPENSE,
      title:       `${expenseCount} recurring expense${expenseCount > 1 ? 's' : ''} auto-added`,
      description: 'Generated from your recurring expense templates',
      icon:        'repeat-outline',
    });
  }
  if (incomeCount > 0) {
    await logActivity({
      user_id:     userId,
      action_type: ACTION.INCOME_SOURCE_ADDED,
      entity_type: ENTITY.INCOME_SOURCE,
      title:       `${incomeCount} recurring income${incomeCount > 1 ? 's' : ''} auto-added`,
      description: 'Generated from your recurring income templates',
      icon:        'repeat-outline',
    });
  }
}
