import React from 'react';
import { render, act } from '@testing-library/react-native';
import RootLayout from '../_layout';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-url-polyfill/auto', () => {});
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('expo-router', () => {
  const { View } = require('react-native');
  const Stack = ({ children }: any) => <View>{children}</View>;
  Stack.Screen = () => null;
  return {
    Stack,
    router: { replace: jest.fn(), push: jest.fn() },
  };
});

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(undefined),
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true]),
  Font: { isLoaded: jest.fn(() => true), loadAsync: jest.fn() },
}));

jest.mock('expo-linking', () => ({
  getInitialURL: jest.fn().mockResolvedValue(null),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  parse: jest.fn(() => ({ queryParams: {} })),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: ({ name }: any) => <Text>{name}</Text> };
});

jest.mock('@/contexts/NetworkContext', () => ({
  NetworkProvider: ({ children }: any) => <>{children}</>,
  useNetwork: () => ({ isOnline: true, pendingSync: false }),
}));

jest.mock('@/components/OfflineBanner', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="offline-banner" /> };
});

jest.mock('@/lib/recurringProcessor', () => ({
  processRecurringTransactions: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/pushNotifications', () => ({
  registerForPushNotifications: jest.fn().mockResolvedValue(undefined),
  clearPushedSet: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/constants/terms', () => ({
  TERMS_SECTIONS: [{ title: 'Terms', body: 'Body.' }],
  TERMS_VERSION: '1.0',
}));

jest.mock('@react-navigation/native', () => ({
  ThemeProvider: ({ children }: any) => <>{children}</>,
  DarkTheme: { dark: true, colors: {} },
  DefaultTheme: { dark: false, colors: {} },
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

let mockOnAuthCb: ((event: string) => void) | null = null;
const mockUnsubscribe = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn((cb: any) => {
        mockOnAuthCb = cb;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }),
      exchangeCodeForSession: jest.fn().mockResolvedValue({ error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
      updateUser: jest.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}));

jest.mock('@/contexts/AppTheme', () => ({
  AppThemeProvider: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/contexts/NotificationContext', () => ({
  NotificationProvider: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/components/NotificationPanel', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="notification-panel" /> };
});

jest.mock('@/components/GlobalLoadingBar', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => <View testID="global-loading-bar" />,
    loadingBar: { start: jest.fn(), finish: jest.fn() },
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockOnAuthCb = null;
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RootLayout — auth listener', () => {
  it('registers onAuthStateChange on mount', () => {
    const { supabase } = require('@/lib/supabase');
    render(<RootLayout />);
    expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
  });

  it('redirects to /login-form when SIGNED_OUT fires', () => {
    const { router } = require('expo-router');
    render(<RootLayout />);
    act(() => { mockOnAuthCb?.('SIGNED_OUT'); });
    expect(router.replace).toHaveBeenCalledWith('/login-form');
  });

  it('does not redirect for other auth events', () => {
    const { router } = require('expo-router');
    render(<RootLayout />);
    act(() => { mockOnAuthCb?.('SIGNED_IN'); });
    act(() => { mockOnAuthCb?.('TOKEN_REFRESHED'); });
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('unsubscribes from auth on unmount', () => {
    const { unmount } = render(<RootLayout />);
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});

describe('RootLayout — font loading', () => {
  it('renders null when fonts are not yet loaded', () => {
    const { useFonts } = require('expo-font');
    useFonts.mockReturnValueOnce([false]);
    const { toJSON } = render(<RootLayout />);
    expect(toJSON()).toBeNull();
  });

  it('hides splash screen once fonts are loaded', () => {
    const SplashScreen = require('expo-splash-screen');
    render(<RootLayout />);
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });

  it('renders the NotificationPanel when fonts are loaded', () => {
    const { getByTestId } = render(<RootLayout />);
    expect(getByTestId('notification-panel')).toBeTruthy();
  });

  it('renders the GlobalLoadingBar when fonts are loaded', () => {
    const { getByTestId } = render(<RootLayout />);
    expect(getByTestId('global-loading-bar')).toBeTruthy();
  });
});
