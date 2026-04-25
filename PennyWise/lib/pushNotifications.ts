import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppNotification } from '@/lib/notifications';

const PUSHED_KEY = 'pw_pushed_notif_v1';

// Show banners even when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldPlaySound:  false,
    shouldSetBadge:   false,
    shouldShowBanner: true,
    shouldShowList:   true,
  }),
});

/**
 * Request OS permission and configure the Android notification channel.
 * Call once on sign-in — safe to call repeatedly (no-op if already granted).
 */
export async function registerForPushNotifications(): Promise<void> {
  if (!Device.isDevice) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('pennywise', {
      name:              'PennyWise',
      importance:        Notifications.AndroidImportance.HIGH,
      vibrationPattern:  [0, 200, 100, 200],
      lightColor:        '#1B7A4A',
      showBadge:         true,
    });
  }
}

/**
 * For every notification not yet pushed, fire an immediate local OS notification.
 * Pruning keeps only IDs present in the current set so stale entries don't accumulate.
 */
export async function syncPushNotifications(
  notifications: AppNotification[],
  pushEnabled: boolean,
): Promise<void> {
  if (!pushEnabled || !Device.isDevice) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const raw = await AsyncStorage.getItem(PUSHED_KEY);
  const pushedSet = new Set<string>(raw ? JSON.parse(raw) : []);

  // Prune IDs that are no longer in the active notification set.
  const currentIds = new Set(notifications.map(n => n.id));
  for (const id of [...pushedSet]) {
    if (!currentIds.has(id)) pushedSet.delete(id);
  }

  const newNotifs = notifications.filter(n => !pushedSet.has(n.id));
  for (const notif of newNotifs) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title:    notif.title,
        body:     notif.body,
        data:     { id: notif.id },
        sound:    false,
        ...(Platform.OS === 'android' ? { channelId: 'pennywise' } : {}),
      },
      trigger: null,  // fire immediately
    });
    pushedSet.add(notif.id);
  }

  if (newNotifs.length > 0) {
    await AsyncStorage.setItem(PUSHED_KEY, JSON.stringify([...pushedSet]));
  }
}

/** Call on sign-out so a new user starts with a clean push state. */
export async function clearPushedSet(): Promise<void> {
  await AsyncStorage.removeItem(PUSHED_KEY);
}
