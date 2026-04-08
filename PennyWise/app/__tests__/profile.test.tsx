import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import ProfileScreen from '../(tabs)/profile';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: any) => <View {...props}>{children}</View>,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  launchCameraAsync:       jest.fn().mockResolvedValue({ canceled: true }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestCameraPermissionsAsync:       jest.fn().mockResolvedValue({ granted: true }),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue('base64data'),
  EncodingType: { Base64: 'base64' },
}));

jest.mock('base64-arraybuffer', () => ({
  decode: jest.fn(() => new ArrayBuffer(0)),
}));

const mockGetUser = jest.fn().mockResolvedValue({ data: { user: { id: 'user-prof-1', user_metadata: { full_name: 'Test User' }, email: 'test@example.com' } }, error: null });
const mockSignOut = jest.fn().mockResolvedValue({ error: null });
const mockSignInWithPassword = jest.fn().mockResolvedValue({ error: null });
const mockUpdateUser = jest.fn().mockResolvedValue({ data: {}, error: null });

const mockSelectEq     = jest.fn().mockResolvedValue({ data: null, error: null });
const mockSelectSingle = jest.fn(() => ({ then: (cb: any) => Promise.resolve({ data: null, error: null }).then(cb) }));
const mockSelectEqSingle = jest.fn(() => ({ single: mockSelectSingle }));
const mockSelect = jest.fn(() => ({ eq: mockSelectEqSingle }));
const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));
const mockRpc = jest.fn().mockResolvedValue({ error: null });

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser:             (...a: any[]) => mockGetUser(...a),
      signOut:             (...a: any[]) => mockSignOut(...a),
      signInWithPassword:  (...a: any[]) => mockSignInWithPassword(...a),
      updateUser:          (...a: any[]) => mockUpdateUser(...a),
    },
    from: jest.fn((table: string) => ({
      select: mockSelect,
      update: mockUpdate,
    })),
    rpc:     (...a: any[]) => mockRpc(...a),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/avatar.jpg' } })),
        remove: jest.fn().mockResolvedValue({ error: null }),
      })),
    },
    functions: {
      invoke: jest.fn().mockResolvedValue({ error: null }),
    },
  },
}));

const mockFetchProfile       = jest.fn().mockResolvedValue(null);
const mockInvalidateProfile  = jest.fn();
const mockInvalidateDashboard = jest.fn();

jest.mock('@/lib/dataCache', () => ({
  DataCache: {
    fetchProfile:         (...a: any[]) => mockFetchProfile(...a),
    invalidateProfile:    (...a: any[]) => mockInvalidateProfile(...a),
    invalidateDashboard:  (...a: any[]) => mockInvalidateDashboard(...a),
  },
}));

jest.mock('@/lib/cache', () => ({
  Cache: { clearAll: jest.fn() },
}));

jest.mock('@/lib/sfx', () => ({
  sfx: { coin: jest.fn(), success: jest.fn(), warning: jest.fn(), error: jest.fn(), toggle: jest.fn() },
}));

jest.mock('@/components/GlobalLoadingBar', () => ({
  loadingBar: { start: jest.fn(), finish: jest.fn() },
}));

jest.mock('@/contexts/AppTheme', () => ({
  useAppTheme: () => ({
    theme: {
      headerBg: '#1B3D2B', cardBg: '#FFFFFF', textPrimary: '#0F1F17',
      textSecondary: '#4A6355', textMuted: '#8FAF9A', surface: '#F2F8F4',
      inputBg: '#F2F8F4', inputBorder: '#C8DDD2', divider: '#E0EDE6',
      iconBtnBg: 'rgba(255,255,255,0.15)', iconBtnColor: '#FFFFFF',
      modalBg: '#FFFFFF', isDark: false, statusBar: 'light',
    },
    toggleDark: jest.fn(),
    darkMode: false,
  }),
}));

jest.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    panelVisible: false,
    bellLayout: null,
    prefs: {
      budget_50: true, budget_90: true, budget_exceeded: true,
      low_balance: true, goal_50: true, goal_75: true, goal_100: true,
      no_goals: true, new_month: true, recurring: true,
    },
    openPanel: jest.fn(),
    closePanel: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
    updatePrefs: jest.fn(),
  }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: ({ name }: any) => <Text>{name}</Text> };
});

jest.mock('@/constants/fonts', () => ({
  Font: { headerBlack: 'X', headerBold: 'X', bodyRegular: 'X', bodySemiBold: 'X', bodyMedium: 'X' },
}));

jest.mock('@/components/penny-wise-logo', () => {
  const { View } = require('react-native');
  return { PennyWiseLogo: () => <View testID="logo" /> };
});

jest.mock('@/components/SkeletonLoader', () => {
  const { View } = require('react-native');
  return {
    ProfileAvatarSkeleton: () => <View testID="avatar-skeleton" />,
    ProfileCardSkeleton:   () => <View testID="card-skeleton" />,
    ProfileInfoSkeleton:   () => <View testID="info-skeleton" />,
  };
});

jest.mock('@/components/NotificationBell', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="notif-bell" /> };
});

jest.mock('@/components/ErrorModal', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible }: any) => visible ? <View testID="error-modal" /> : null,
  };
});

jest.mock('@/components/ConfirmModal', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible, onYes, confirmLabel }: any) =>
      visible ? (
        <TouchableOpacity testID="confirm-yes" onPress={onYes}>
          <Text>{confirmLabel ?? 'Yes'}</Text>
        </TouchableOpacity>
      ) : null,
  };
});

jest.mock('@/components/BudgetLimitModal', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible }: any) => visible ? <View testID="budget-limit-modal" /> : null,
  };
});

jest.mock('@/lib/sanitize', () => ({
  sanitizeName:  (v: string) => v.trim(),
  sanitizeEmail: (v: string) => v.trim().toLowerCase(),
  sanitizePhone: (v: string) => v.trim(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-prof-1', user_metadata: { full_name: 'Test User' }, email: 'test@example.com' } },
    error: null,
  });
  mockFetchProfile.mockResolvedValue(null);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProfileScreen — initial load', () => {
  it('calls supabase.auth.getUser on mount', async () => {
    render(<ProfileScreen />);
    await waitFor(() => expect(mockGetUser).toHaveBeenCalled());
  });

  it('calls DataCache.fetchProfile with the user id', async () => {
    render(<ProfileScreen />);
    await waitFor(() => expect(mockFetchProfile).toHaveBeenCalledWith('user-prof-1'));
  });

  it('shows skeleton while loading', () => {
    // getUser hasn't resolved yet — loading state is true
    mockGetUser.mockReturnValue(new Promise(() => {})); // never resolves
    const { getByTestId } = render(<ProfileScreen />);
    expect(getByTestId('avatar-skeleton')).toBeTruthy();
  });

  it('does not crash when user is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(() => render(<ProfileScreen />)).not.toThrow();
    await waitFor(() => expect(mockGetUser).toHaveBeenCalled());
  });

  it('uses cached profile data when available', async () => {
    mockFetchProfile.mockResolvedValue({
      full_name: 'Cached User', email: 'cached@example.com', phone: '09171234567', avatar_url: null,
    });
    render(<ProfileScreen />);
    await waitFor(() => expect(mockFetchProfile).toHaveBeenCalled());
  });

  it('falls back to supabase profiles query when cache is empty', async () => {
    const { supabase } = require('@/lib/supabase');
    mockFetchProfile.mockResolvedValue(null);
    render(<ProfileScreen />);
    await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('profiles'));
  });
});
