/**
 * contexts/NotificationContext.tsx
 * Global in-app notification state. Persists read-state via AsyncStorage; prefs via Supabase.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { generateNotifications, type AppNotification } from '@/lib/notifications';
import {
  loadNotifPrefs, saveNotifPrefs, filterByPrefs,
  DEFAULT_PREFS, type NotifPrefs,
} from '@/lib/notificationPrefs';
import { syncPushNotifications } from '@/lib/pushNotifications';

const READ_KEY = 'pw_notif_read_v1';
const SEEN_KEY = 'pw_notif_seen_v1';

export type BellLayout = { pageX: number; pageY: number; width: number; height: number };

type NotificationCtx = {
  notifications: AppNotification[];
  readIds: Set<string>;
  unreadCount: number;
  loading: boolean;
  panelVisible: boolean;
  bellLayout: BellLayout | null;
  prefs: NotifPrefs;
  openPanel: (layout: BellLayout) => void;
  closePanel: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  refresh: () => Promise<void>;
  updatePrefs: (prefs: NotifPrefs) => Promise<void>;
};

const NotificationContext = createContext<NotificationCtx>({
  notifications:  [],
  readIds:        new Set(),
  unreadCount:    0,
  loading:        false,
  panelVisible:   false,
  bellLayout:     null,
  prefs:          DEFAULT_PREFS,
  openPanel:      () => {},
  closePanel:     () => {},
  markRead:       () => {},
  markAllRead:    () => {},
  refresh:        async () => {},
  updatePrefs:    async () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds]             = useState<Set<string>>(new Set());
  const [seenIds, setSeenIds]             = useState<Set<string>>(new Set());
  const [loading, setLoading]             = useState(false);
  const [panelVisible, setPanelVisible]   = useState(false);
  const [bellLayout, setBellLayout]       = useState<BellLayout | null>(null);
  const [prefs, setPrefs]                 = useState<NotifPrefs>(DEFAULT_PREFS);
  const userIdRef = useRef<string | null>(null);

  // ── Restore persisted read + seen sets (local) ───────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(READ_KEY).then(raw => {
      if (raw) {
        try { setReadIds(new Set(JSON.parse(raw) as string[])); } catch {}
      }
    });
    AsyncStorage.getItem(SEEN_KEY).then(raw => {
      if (raw) {
        try { setSeenIds(new Set(JSON.parse(raw) as string[])); } catch {}
      }
    });
  }, []);

  const persistRead = useCallback((ids: Set<string>) => {
    AsyncStorage.setItem(READ_KEY, JSON.stringify([...ids]));
  }, []);

  const persistSeen = useCallback((ids: Set<string>) => {
    AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
  }, []);

  // ── Fetch notifications + prefs from Supabase ─────────────────────────────
  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    userIdRef.current = user.id;
    try {
      const [notifs, currentPrefs] = await Promise.all([
        generateNotifications(user.id),
        loadNotifPrefs(user.id),
      ]);
      setPrefs(currentPrefs);
      const filtered = filterByPrefs(notifs, currentPrefs);
      setNotifications(filtered);
      syncPushNotifications(filtered, currentPrefs.push_enabled).catch(() => {});
    } catch {}
    finally { setLoading(false); }
  }, []);

  // ── Initial load + auth changes ────────────────────────────────────────────
  useEffect(() => {
    refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN')  refresh();
      if (event === 'SIGNED_OUT') {
        setNotifications([]);
        setReadIds(new Set());
        setSeenIds(new Set());
        setPrefs(DEFAULT_PREFS);
        userIdRef.current = null;
      }
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  // ── Mark all as seen whenever the panel is open ───────────────────────────
  // Fires on open and again after any refresh that brings new notifications,
  // so the badge clears as soon as the user has seen the panel.
  useEffect(() => {
    if (!panelVisible || notifications.length === 0) return;
    setSeenIds(prev => {
      const next = new Set(prev);
      notifications.forEach(n => next.add(n.id));
      persistSeen(next);
      return next;
    });
  }, [panelVisible, notifications, persistSeen]);

  // ── Derived ────────────────────────────────────────────────────────────────
  // Badge count: notifications the user has never seen (panel not yet opened).
  const unreadCount = notifications.filter(n => !seenIds.has(n.id)).length;

  // ── Actions ────────────────────────────────────────────────────────────────
  const markRead = useCallback((id: string) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      persistRead(next);
      return next;
    });
  }, [persistRead]);

  const markAllRead = useCallback(() => {
    setReadIds(prev => {
      const next = new Set(prev);
      notifications.forEach(n => next.add(n.id));
      persistRead(next);
      return next;
    });
  }, [notifications, persistRead]);

  const openPanel = useCallback((layout: BellLayout) => {
    setBellLayout(layout);
    setPanelVisible(true);
    refresh();   // always fetch fresh data — triggers skeleton loading in the panel
  }, [refresh]);

  const closePanel = useCallback(() => setPanelVisible(false), []);

  const updatePrefs = useCallback(async (next: NotifPrefs) => {
    if (!userIdRef.current) return;
    await saveNotifPrefs(userIdRef.current, next);
    setPrefs(next);
    try {
      const notifs = await generateNotifications(userIdRef.current);
      const filtered = filterByPrefs(notifs, next);
      setNotifications(filtered);
      syncPushNotifications(filtered, next.push_enabled).catch(() => {});
    } catch {}
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      readIds,
      unreadCount,
      loading,
      panelVisible,
      bellLayout,
      prefs,
      openPanel,
      closePanel,
      markRead,
      markAllRead,
      refresh,
      updatePrefs,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
