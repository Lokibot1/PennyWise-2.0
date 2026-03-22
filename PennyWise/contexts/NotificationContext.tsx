/**
 * contexts/NotificationContext.tsx
 * Global in-app notification state. Persists read-state across sessions via AsyncStorage.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { generateNotifications, type AppNotification } from '@/lib/notifications';

const READ_KEY = 'pw_notif_read_v1';

export type BellLayout = { pageX: number; pageY: number; width: number; height: number };

type NotificationCtx = {
  notifications: AppNotification[];
  readIds: Set<string>;
  unreadCount: number;
  panelVisible: boolean;
  bellLayout: BellLayout | null;
  openPanel: (layout: BellLayout) => void;
  closePanel: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  refresh: () => Promise<void>;
};

const NotificationContext = createContext<NotificationCtx>({
  notifications:  [],
  readIds:        new Set(),
  unreadCount:    0,
  panelVisible:   false,
  bellLayout:     null,
  openPanel:      () => {},
  closePanel:     () => {},
  markRead:       () => {},
  markAllRead:    () => {},
  refresh:        async () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds]             = useState<Set<string>>(new Set());
  const [panelVisible, setPanelVisible]   = useState(false);
  const [bellLayout, setBellLayout]       = useState<BellLayout | null>(null);
  const userIdRef = useRef<string | null>(null);

  // ── Restore persisted read set ─────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(READ_KEY).then(raw => {
      if (raw) {
        try { setReadIds(new Set(JSON.parse(raw) as string[])); } catch {}
      }
    });
  }, []);

  const persistRead = useCallback((ids: Set<string>) => {
    AsyncStorage.setItem(READ_KEY, JSON.stringify([...ids]));
  }, []);

  // ── Fetch notifications ────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    userIdRef.current = user.id;
    try {
      const notifs = await generateNotifications(user.id);
      setNotifications(notifs);
    } catch {}
  }, []);

  // ── Initial load + auth changes ────────────────────────────────────────────
  useEffect(() => {
    refresh();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN')  refresh();
      if (event === 'SIGNED_OUT') {
        setNotifications([]);
        userIdRef.current = null;
      }
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

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
  }, []);

  const closePanel = useCallback(() => setPanelVisible(false), []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      readIds,
      unreadCount,
      panelVisible,
      bellLayout,
      openPanel,
      closePanel,
      markRead,
      markAllRead,
      refresh,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
