import { supabase } from './supabase';
import type { AppNotification } from './notifications';

export type NotifPrefs = {
  budget_70:          boolean;
  budget_90:          boolean;
  budget_exceeded:    boolean;
  low_balance:        boolean;
  goal_50:            boolean;
  goal_75:            boolean;
  goal_100:           boolean;
  no_goals:           boolean;
  new_month:          boolean;
  recurring:          boolean;
  cat_budget_70:      boolean;
  cat_budget_90:      boolean;
  cat_budget_exceeded: boolean;
  push_enabled:       boolean;
};

export const DEFAULT_PREFS: NotifPrefs = {
  budget_70:           true,
  budget_90:           true,
  budget_exceeded:     true,
  low_balance:         true,
  goal_50:             true,
  goal_75:             true,
  goal_100:            true,
  no_goals:            true,
  new_month:           true,
  recurring:           true,
  cat_budget_70:       true,
  cat_budget_90:       true,
  cat_budget_exceeded: true,
  push_enabled:        true,
};

export async function loadNotifPrefs(userId: string): Promise<NotifPrefs> {
  const { data, error } = await supabase
    .from('profiles')
    .select('notification_prefs')
    .eq('id', userId)
    .single();
  if (error || !data?.notification_prefs) return { ...DEFAULT_PREFS };
  return { ...DEFAULT_PREFS, ...(data.notification_prefs as Partial<NotifPrefs>) };
}

export async function saveNotifPrefs(userId: string, prefs: NotifPrefs): Promise<void> {
  await supabase
    .from('profiles')
    .update({ notification_prefs: prefs })
    .eq('id', userId);
}

export function filterByPrefs(notifs: AppNotification[], prefs: NotifPrefs): AppNotification[] {
  return notifs.filter(n => {
    if (n.id.startsWith('budget_70'))           return prefs.budget_70;
    if (n.id.startsWith('budget_90'))           return prefs.budget_90;
    if (n.id.startsWith('budget_exceeded'))     return prefs.budget_exceeded;
    if (n.id.startsWith('low_balance_'))        return prefs.low_balance;
    if (n.id.startsWith('goal_50'))             return prefs.goal_50;
    if (n.id.startsWith('goal_75'))             return prefs.goal_75;
    if (n.id.startsWith('goal_100'))            return prefs.goal_100;
    if (n.id.startsWith('no_goals_'))           return prefs.no_goals;
    if (n.id.startsWith('new_month_'))          return prefs.new_month;
    if (n.id.startsWith('recurring_reminder_'))  return prefs.recurring;
    if (n.id.startsWith('cat_budget_70'))         return prefs.cat_budget_70;
    if (n.id.startsWith('cat_budget_90'))         return prefs.cat_budget_90;
    if (n.id.startsWith('cat_budget_exceeded'))   return prefs.cat_budget_exceeded;
    return true;
  });
}
