/**
 * PennyWise — Network Context
 *
 * Monitors connectivity via @react-native-community/netinfo and:
 *   1. Exposes `isOnline` as a React state for components/hooks
 *   2. Keeps the module-level `setNetworkOnline` in sync for DataCache
 *   3. On offline→online transition, flushes the MutationQueue via syncEngine
 *      and exposes `pendingSync` so screens can show a syncing indicator
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { setNetworkOnline } from '@/lib/network';
import { syncMutationQueue } from '@/lib/syncEngine';
import { supabase } from '@/lib/supabase';

interface NetworkContextValue {
  isOnline: boolean;
  /** True while queued offline mutations are being synced to Supabase */
  pendingSync: boolean;
}

const NetworkContext = createContext<NetworkContextValue>({ isOnline: true, pendingSync: false });

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState(false);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    // Fetch initial state
    NetInfo.fetch().then(state => {
      const online = state.isConnected !== false;
      setIsOnline(online);
      setNetworkOnline(online);
      if (!online) wasOfflineRef.current = true;
    });

    // Subscribe to real-time changes
    const unsubscribe = NetInfo.addEventListener(async state => {
      const online = state.isConnected !== false;
      setIsOnline(online);
      setNetworkOnline(online);

      if (!online) {
        wasOfflineRef.current = true;
      } else if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        // Flush the mutation queue when we come back online
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            setPendingSync(true);
            await syncMutationQueue(user.id);
          }
        } catch {
          // Sync failure is non-fatal — queue stays intact for next reconnect
        } finally {
          setPendingSync(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <NetworkContext.Provider value={{ isOnline, pendingSync }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork(): NetworkContextValue {
  return useContext(NetworkContext);
}
