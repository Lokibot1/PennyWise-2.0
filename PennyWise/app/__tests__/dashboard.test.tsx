import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import DashboardScreen from '../(tabs)/index';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() }, useFocusEffect: jest.fn() }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

let mockOnAuthCb: ((event: string, session: any) => void) | null = null;
const mockUnsubscribe = jest.fn();
const mockUpdateEq    = jest.fn();
const mockFromUpdate  = jest.fn(() => ({ eq: mockUpdateEq }));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn((cb: any) => {
        mockOnAuthCb = cb;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }),
    },
    from: jest.fn(() => ({ update: mockFromUpdate })),
  },
}));

const DASHBOARD_DATA = {
  profile:       { full_name: 'Ana', budget_limit: 20000, email: 'a@b.com', phone: '', avatar_url: null },
  incomeSources: [],
  expenses:      [],
  savingsGoals:  [],
};

const mockFetchDashboard   = jest.fn().mockResolvedValue(DASHBOARD_DATA);
const mockInvalidateProfile  = jest.fn();
const mockInvalidateDashboard = jest.fn();

jest.mock('@/lib/dataCache', () => ({
  DataCache: {
    fetchDashboard:      (...a: any[]) => mockFetchDashboard(...a),
    invalidateProfile:   (...a: any[]) => mockInvalidateProfile(...a),
    invalidateDashboard: (...a: any[]) => mockInvalidateDashboard(...a),
  },
}));

jest.mock('@/contexts/AppTheme', () => ({
  useAppTheme: () => ({
    theme: {
      headerBg: '#1B3D2B', cardBg: '#FFFFFF', textPrimary: '#0F1F17',
      textSecondary: '#4A6355', textMuted: '#8FAF9A', surface: '#F2F8F4',
      inputBg: '#F2F8F4', inputBorder: '#C8DDD2', divider: '#E0EDE6',
      isDark: false, statusBar: 'light', accent: '#3ECBA8',
    },
  }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: ({ name }: any) => <Text>{name}</Text> };
});

jest.mock('@/constants/fonts', () => ({
  Font: { headerBlack: 'X', headerBold: 'X', bodyRegular: 'X', bodySemiBold: 'X', bodyMedium: 'X' },
}));

jest.mock('@/components/GlobalLoadingBar', () => ({
  loadingBar: { start: jest.fn(), finish: jest.fn() },
}));

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

// BudgetLimitModal: expose an onSave trigger via testID so we can call it directly
let mockBudgetOnSave: ((n: number) => void) | null = null;
jest.mock('@/components/BudgetLimitModal', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible, onSave }: any) => {
      mockBudgetOnSave = onSave;
      return visible ? (
        <TouchableOpacity testID="budget-save-btn" onPress={() => onSave(25000)}>
          <Text>Save Budget</Text>
        </TouchableOpacity>
      ) : null;
    },
  };
});

jest.mock('@/components/SkeletonLoader', () => {
  const { View } = require('react-native');
  return {
    HomeDashboardSkeleton: () => <View testID="dashboard-skeleton" />,
    TransactionRowSkeleton: () => <View />,
  };
});

jest.mock('@/components/SlideTabBar', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="slide-tab-bar" /> };
});

jest.mock('@/components/CircularRing', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="ring" /> };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const UID  = 'user-dash-1';
const SESS = { user: { id: UID } };

function signIn(session = SESS) {
  act(() => { mockOnAuthCb?.('SIGNED_IN', session); });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockOnAuthCb = null;
  mockUpdateEq.mockResolvedValue({ error: null });
  mockFetchDashboard.mockResolvedValue(DASHBOARD_DATA);
});

// ── Data loading ──────────────────────────────────────────────────────────────

describe('DashboardScreen — data loading', () => {
  it('calls DataCache.fetchDashboard when session fires', async () => {
    render(<DashboardScreen />);
    signIn();
    await waitFor(() => expect(mockFetchDashboard).toHaveBeenCalledWith(UID));
  });

  it('does not call fetchDashboard when there is no session', async () => {
    render(<DashboardScreen />);
    signIn(null as any);
    await waitFor(() => expect(mockFetchDashboard).not.toHaveBeenCalled());
  });

  it('unsubscribes from auth on unmount', () => {
    const { unmount } = render(<DashboardScreen />);
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('renders user name from dashboard profile', async () => {
    const { getByText } = render(<DashboardScreen />);
    signIn();
    await waitFor(() => expect(getByText(/Ana/)).toBeTruthy());
  });
});

// ── Budget update ─────────────────────────────────────────────────────────────

describe('DashboardScreen — budget update', () => {
  it('calls profiles.update with new budget_limit when BudgetLimitModal.onSave fires', async () => {
    const { getByText, getByTestId } = render(<DashboardScreen />);
    signIn();
    await waitFor(() => expect(getByText(/Ana/)).toBeTruthy());

    // Open the budget modal by pressing the pencil icon row
    await act(async () => { fireEvent.press(getByText('pencil-outline')); });

    // Trigger save via the mocked BudgetLimitModal button (value hardcoded to 25000)
    await act(async () => { fireEvent.press(getByTestId('budget-save-btn')); });

    await waitFor(() => {
      expect(mockFromUpdate).toHaveBeenCalledWith({ budget_limit: 25000 });
      expect(mockUpdateEq).toHaveBeenCalledWith('id', UID);
    });
  });

  it('invalidates profile and dashboard cache after budget update', async () => {
    const { getByText, getByTestId } = render(<DashboardScreen />);
    signIn();
    await waitFor(() => expect(getByText(/Ana/)).toBeTruthy());

    await act(async () => { fireEvent.press(getByText('pencil-outline')); });
    await act(async () => { fireEvent.press(getByTestId('budget-save-btn')); });

    await waitFor(() => {
      expect(mockInvalidateProfile).toHaveBeenCalledWith(UID);
      expect(mockInvalidateDashboard).toHaveBeenCalledWith(UID);
    });
  });

  it('can also call onSave directly via captured mock reference', async () => {
    render(<DashboardScreen />);
    signIn();
    await waitFor(() => expect(mockFetchDashboard).toHaveBeenCalled());

    // Use the captured onSave reference to fire the callback programmatically
    await act(async () => { mockBudgetOnSave?.(30000); });

    await waitFor(() => {
      expect(mockFromUpdate).toHaveBeenCalledWith({ budget_limit: 30000 });
    });
  });
});
