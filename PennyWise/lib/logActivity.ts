import { supabase } from './supabase';

// ── Action type constants ──────────────────────────────────────────────────────
export const ACTION = {
  INCOME_CATEGORY_CREATED:  'INCOME_CATEGORY_CREATED',
  INCOME_SOURCE_ADDED:      'INCOME_SOURCE_ADDED',
  INCOME_SOURCE_UPDATED:    'INCOME_SOURCE_UPDATED',
  INCOME_CATEGORY_ARCHIVED: 'INCOME_CATEGORY_ARCHIVED',

  EXPENSE_CATEGORY_CREATED:  'EXPENSE_CATEGORY_CREATED',
  EXPENSE_ADDED:             'EXPENSE_ADDED',
  EXPENSE_UPDATED:           'EXPENSE_UPDATED',
  EXPENSE_CATEGORY_ARCHIVED: 'EXPENSE_CATEGORY_ARCHIVED',

  SAVINGS_GOAL_CREATED:   'SAVINGS_GOAL_CREATED',
  SAVINGS_GOAL_UPDATED:   'SAVINGS_GOAL_UPDATED',
  SAVINGS_GOAL_FUNDED:    'SAVINGS_GOAL_FUNDED',
  SAVINGS_GOAL_COMPLETED: 'SAVINGS_GOAL_COMPLETED',
} as const;

// ── Entity type constants ─────────────────────────────────────────────────────
export const ENTITY = {
  INCOME_CATEGORY: 'income_category',
  INCOME_SOURCE:   'income_source',
  EXPENSE_CATEGORY: 'expense_category',
  EXPENSE:         'expense',
  SAVINGS_GOAL:    'savings_goal',
} as const;

type ActivityPayload = {
  user_id:     string;
  action_type: string;
  entity_type: string;
  title:       string;
  description?: string;
  icon:        string;
};

/**
 * Insert a single activity log entry. Fire-and-forget — does not throw.
 */
export async function logActivity(payload: ActivityPayload): Promise<void> {
  await supabase.from('activity_logs').insert({
    user_id:     payload.user_id,
    action_type: payload.action_type,
    entity_type: payload.entity_type,
    title:       payload.title,
    description: payload.description ?? '',
    icon:        payload.icon,
  });
}
