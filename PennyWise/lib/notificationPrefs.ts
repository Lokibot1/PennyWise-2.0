import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppNotification } from './notifications';

const PREFS_KEY = 'pw_notif_prefs_v1';

export type NotifPrefs = {
  budget_70:        boolean;
  budget_90:        boolean;
  budget_exceeded:  boolean;
  low_balance:      boolean;
  goal_50:          boolean;
  goal_75:          boolean;
  goal_100:         boolean;
  no_goals:         boolean;
  new_month:        boolean;
  recurring:        boolean;
};

export const DEFAULT_PREFS: NotifPrefs = {
  budget_70:       true,
  budget_90:       true,
  budget_exceeded: true,
  low_balance:     true,
  goal_50:         true,
  goal_75:         true,
  goal_100:        true,
  no_goals:        true,
  new_month:       true,
  recurring:       true,
};

export async function loadNotifPrefs(): Promise<NotifPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<NotifPrefs>) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function saveNotifPrefs(prefs: NotifPrefs): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
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
    if (n.id.startsWith('recurring_reminder_')) return prefs.recurring;
    return true;
  });
}
