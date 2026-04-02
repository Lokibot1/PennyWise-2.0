import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import TransactionScreen from '../(tabs)/transaction';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useFocusEffect: jest.fn((cb: any) => cb()),
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

let mockOnAuthCb: ((event: string, session: any) => void) | null = null;
const mockUnsubscribe = jest.fn();

// activity_logs chain mock
const mockActivityLogsData = jest.fn().mockResolvedValue({ data: [], error: null });
const mockIn   = jest.fn(() => ({ order: mockOrder }));
const mockOrder = jest.fn(() => ({ data: [], error: null, then: mockActivityLogsData }));
const mockEq    = jest.fn(() => ({ in: mockIn }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn((cb: any) => {
        mockOnAuthCb = cb;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }),
    },
    from: jest.fn((table: string) => {
      if (table === 'activity_logs') return { select: mockSelect };
      return {};
    }),
  },
}));

const mockFetchIncomeSources     = jest.fn().mockResolvedValue([]);
const mockFetchExpenses          = jest.fn().mockResolvedValue([]);
const mockFetchSavingsGoals      = jest.fn().mockResolvedValue([]);
const mockFetchIncomeCategories  = jest.fn().mockResolvedValue([]);
const mockFetchExpenseCategories = jest.fn().mockResolvedValue([]);

jest.mock('@/lib/dataCache', () => ({
  DataCache: {
    fetchIncomeSources:     (...a: any[]) => mockFetchIncomeSources(...a),
    fetchExpenses:          (...a: any[]) => mockFetchExpenses(...a),
    fetchSavingsGoals:      (...a: any[]) => mockFetchSavingsGoals(...a),
    fetchIncomeCategories:  (...a: any[]) => mockFetchIncomeCategories(...a),
    fetchExpenseCategories: (...a: any[]) => mockFetchExpenseCategories(...a),
  },
}));

jest.mock('@/lib/activityNavTarget', () => ({
  setNavTarget: jest.fn(),
}));

jest.mock('@/contexts/AppTheme', () => ({
  useAppTheme: () => ({
    theme: {
      headerBg: '#1B3D2B', cardBg: '#FFFFFF', textPrimary: '#0F1F17',
      textSecondary: '#4A6355', textMuted: '#8FAF9A', surface: '#F2F8F4',
      inputBg: '#F2F8F4', inputBorder: '#C8DDD2', divider: '#E0EDE6',
      isDark: false, statusBar: 'light',
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

jest.mock('@/components/penny-wise-logo', () => {
  const { View } = require('react-native');
  return { PennyWiseLogo: () => <View testID="logo" /> };
});

jest.mock('@/components/SkeletonLoader', () => {
  const { View } = require('react-native');
  return { ActivityHistorySkeleton: () => <View testID="skeleton" /> };
});

jest.mock('@/components/ErrorModal', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible }: any) => visible ? <View testID="error-modal" /> : null,
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const UID  = 'user-tx-1';
const SESS = { user: { id: UID } };

function signIn(session = SESS) {
  act(() => { mockOnAuthCb?.('SIGNED_IN', session); });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockOnAuthCb = null;
  mockFetchIncomeSources.mockResolvedValue([]);
  mockFetchExpenses.mockResolvedValue([]);
  mockFetchSavingsGoals.mockResolvedValue([]);
  mockFetchIncomeCategories.mockResolvedValue([]);
  mockFetchExpenseCategories.mockResolvedValue([]);
  // Reset activity_logs mock
  mockEq.mockReturnValue({ in: mockIn });
  mockIn.mockReturnValue({ order: mockOrder });
  mockOrder.mockResolvedValue({ data: [], error: null });
});

// ── Data loading ──────────────────────────────────────────────────────────────

describe('TransactionScreen — data loading', () => {
  it('calls all DataCache fetchers when session fires', async () => {
    render(<TransactionScreen />);
    signIn();

    await waitFor(() => {
      expect(mockFetchIncomeSources).toHaveBeenCalledWith(UID);
      expect(mockFetchExpenses).toHaveBeenCalledWith(UID);
      expect(mockFetchSavingsGoals).toHaveBeenCalledWith(UID);
    });
  });

  it('fetches income and expense categories for label lookups', async () => {
    render(<TransactionScreen />);
    signIn();

    await waitFor(() => {
      expect(mockFetchIncomeCategories).toHaveBeenCalledWith(UID);
      expect(mockFetchExpenseCategories).toHaveBeenCalledWith(UID);
    });
  });

  it('queries activity_logs table directly (not via cache)', async () => {
    const { supabase } = require('@/lib/supabase');
    render(<TransactionScreen />);
    signIn();

    await waitFor(() =>
      expect(supabase.from).toHaveBeenCalledWith('activity_logs'),
    );
  });

  it('filters activity_logs by user_id', async () => {
    render(<TransactionScreen />);
    signIn();

    await waitFor(() =>
      expect(mockEq).toHaveBeenCalledWith('user_id', UID),
    );
  });

  it('does not fetch when session is null', async () => {
    render(<TransactionScreen />);
    signIn(null as any);
    await waitFor(() => expect(mockFetchIncomeSources).not.toHaveBeenCalled());
  });

  it('unsubscribes from auth on unmount', () => {
    const { unmount } = render(<TransactionScreen />);
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});

// ── Activity_logs query ───────────────────────────────────────────────────────

describe('TransactionScreen — activity_logs query specifics', () => {
  it('selects the expected columns from activity_logs', async () => {
    render(<TransactionScreen />);
    signIn();

    await waitFor(() =>
      expect(mockSelect).toHaveBeenCalledWith(
        expect.stringContaining('action_type'),
      ),
    );
  });

  it('orders activity_logs by created_at descending', async () => {
    render(<TransactionScreen />);
    signIn();

    await waitFor(() =>
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false }),
    );
  });
});
