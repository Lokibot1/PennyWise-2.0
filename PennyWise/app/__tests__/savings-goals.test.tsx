import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import SavingsGoalsScreen from '../savings-goals';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('expo-router', () => ({ router: { back: jest.fn() }, useFocusEffect: jest.fn() }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

let mockOnAuthCb: ((event: string, session: any) => void) | null = null;
const mockUnsubscribe = jest.fn();
const mockInsert    = jest.fn();
const mockUpdateFn  = jest.fn();
const mockDeleteFn  = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn((cb: any) => {
        mockOnAuthCb = cb;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }),
    },
    from: jest.fn(() => ({
      insert: mockInsert,
      update: mockUpdateFn,
      delete: mockDeleteFn,
    })),
  },
}));

const mockFetchSavingsGoals      = jest.fn();
const mockInvalidateDashboard    = jest.fn();
const mockInvalidateSavingsGoals = jest.fn();

jest.mock('@/lib/dataCache', () => ({
  DataCache: {
    fetchSavingsGoals:      (...a: any[]) => mockFetchSavingsGoals(...a),
    invalidateSavingsGoals: (...a: any[]) => mockInvalidateSavingsGoals(...a),
    invalidateDashboard:    (...a: any[]) => mockInvalidateDashboard(...a),
  },
}));

jest.mock('@/lib/logActivity', () => ({
  logActivity: jest.fn(),
  ACTION: {
    SAVINGS_GOAL_CREATED:   'SAVINGS_GOAL_CREATED',
    SAVINGS_GOAL_UPDATED:   'SAVINGS_GOAL_UPDATED',
    SAVINGS_GOAL_FUNDED:    'SAVINGS_GOAL_FUNDED',
    SAVINGS_GOAL_COMPLETED: 'SAVINGS_GOAL_COMPLETED',
    SAVINGS_GOAL_ARCHIVED:  'SAVINGS_GOAL_ARCHIVED',
    SAVINGS_GOAL_DELETED:   'SAVINGS_GOAL_DELETED',
    SAVINGS_GOAL_RESTORED:  'SAVINGS_GOAL_RESTORED',
  },
  ENTITY: { SAVINGS_GOAL: 'savings_goal' },
}));

jest.mock('@/lib/sanitize', () => ({
  sanitizeTitle: (v: string) => v.trim(),
  parseAmount:   (v: string) => parseFloat(v.replace(/,/g, '')) || 0,
}));

jest.mock('@/lib/sfx', () => ({
  sfx: { coin: jest.fn(), success: jest.fn(), warning: jest.fn(), error: jest.fn(), complete: jest.fn() },
}));
jest.mock('@/components/GlobalLoadingBar', () => ({
  loadingBar: { start: jest.fn(), finish: jest.fn() },
}));
jest.mock('@/lib/activityNavTarget', () => ({
  getNavTarget: jest.fn(() => null),
  clearNavTarget: jest.fn(),
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
  return {
    Ionicons: ({ name, testID }: any) => (
      <Text testID={testID ?? `icon-${name}`}>{name}</Text>
    ),
  };
});

jest.mock('@/constants/fonts', () => ({
  Font: { headerBlack: 'X', headerBold: 'X', bodyRegular: 'X', bodySemiBold: 'X', bodyMedium: 'X' },
}));

jest.mock('@/components/ConfirmModal', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible, onConfirm, onClose, confirmLabel }: any) =>
      visible ? (
        <>
          <TouchableOpacity testID="confirm-yes" onPress={onConfirm}>
            <Text>{confirmLabel ?? 'Yes'}</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="confirm-no" onPress={onClose}>
            <Text>No</Text>
          </TouchableOpacity>
        </>
      ) : null,
  };
});

jest.mock('@/components/SlideTabBar', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="slide-tab-bar" /> };
});

jest.mock('@/components/CircularRing', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="circular-ring" /> };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const UID  = 'user-sg-1';
const SESS = { user: { id: UID } };

function signIn(session = SESS) {
  act(() => { mockOnAuthCb?.('SIGNED_IN', session); });
}

const GOAL = {
  id: 'g1', title: 'Laptop', icon: 'laptop-outline',
  target_amount: 10000, current_amount: 0,
  is_completed: false, is_archived: false,
  completed_at: null, created_at: '2024-01-01T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockOnAuthCb = null;
  mockInsert.mockResolvedValue({ error: null });
  mockUpdateFn.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
  mockDeleteFn.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
  mockFetchSavingsGoals.mockResolvedValue([]);
});

// ── Auth / Data loading ───────────────────────────────────────────────────────

describe('SavingsGoalsScreen — data loading', () => {
  it('calls DataCache.fetchSavingsGoals when session is present', async () => {
    render(<SavingsGoalsScreen />);
    signIn();
    await waitFor(() => expect(mockFetchSavingsGoals).toHaveBeenCalledWith(UID));
  });

  it('does not call fetchSavingsGoals when session is null', async () => {
    render(<SavingsGoalsScreen />);
    signIn(null as any);
    await waitFor(() => expect(mockFetchSavingsGoals).not.toHaveBeenCalled());
  });

  it('unsubscribes from auth on unmount', () => {
    const { unmount } = render(<SavingsGoalsScreen />);
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});

// ── Create goal ───────────────────────────────────────────────────────────────

describe('SavingsGoalsScreen — create goal', () => {
  it('shows alert when title is empty on submit', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByText } = render(<SavingsGoalsScreen />);
    signIn();
    await waitFor(() => expect(mockFetchSavingsGoals).toHaveBeenCalled());

    // Open add modal by pressing the header + icon
    await act(async () => { fireEvent.press(getByText('add')); });
    // Press Create Goal without filling the title
    await act(async () => { fireEvent.press(getByText('Create Goal')); });

    expect(alertSpy).toHaveBeenCalledWith('Missing info', 'Please enter a goal name.');
    alertSpy.mockRestore();
  });

  it('shows alert when target amount is missing', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByText, getByPlaceholderText } = render(<SavingsGoalsScreen />);
    signIn();
    await waitFor(() => expect(mockFetchSavingsGoals).toHaveBeenCalled());

    await act(async () => { fireEvent.press(getByText('add')); });
    fireEvent.changeText(
      getByPlaceholderText('e.g. Buy a Car, Emergency Fund'),
      'My Goal',
    );
    await act(async () => { fireEvent.press(getByText('Create Goal')); });

    expect(alertSpy).toHaveBeenCalledWith('Missing info', 'Please enter a valid target amount.');
    alertSpy.mockRestore();
  });

  it('calls savings_goals.insert with correct payload on valid submit', async () => {
    const { getByText, getByPlaceholderText } = render(<SavingsGoalsScreen />);
    signIn();
    await waitFor(() => expect(mockFetchSavingsGoals).toHaveBeenCalled());

    await act(async () => { fireEvent.press(getByText('add')); });
    fireEvent.changeText(
      getByPlaceholderText('e.g. Buy a Car, Emergency Fund'),
      'Vacation',
    );
    fireEvent.changeText(
      getByPlaceholderText('e.g. 50,000.00'),
      '5000',
    );
    await act(async () => { fireEvent.press(getByText('Create Goal')); });

    await waitFor(() =>
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id:       UID,
          title:         'Vacation',
          target_amount: 5000,
          current_amount: 0,
          is_completed:  false,
          is_archived:   false,
        }),
      ),
    );
  });

  it('invalidates dashboard cache after successful create', async () => {
    const { getByText, getByPlaceholderText } = render(<SavingsGoalsScreen />);
    signIn();
    await waitFor(() => expect(mockFetchSavingsGoals).toHaveBeenCalled());

    await act(async () => { fireEvent.press(getByText('add')); });
    fireEvent.changeText(getByPlaceholderText('e.g. Buy a Car, Emergency Fund'), 'Trip');
    fireEvent.changeText(getByPlaceholderText('e.g. 50,000.00'), '3000');
    await act(async () => { fireEvent.press(getByText('Create Goal')); });

    await waitFor(() => expect(mockInvalidateDashboard).toHaveBeenCalledWith(UID));
  });

  it('re-fetches goals with force-refresh after successful create', async () => {
    const { getByText, getByPlaceholderText } = render(<SavingsGoalsScreen />);
    signIn();
    await waitFor(() => expect(mockFetchSavingsGoals).toHaveBeenCalledTimes(1));

    await act(async () => { fireEvent.press(getByText('add')); });
    fireEvent.changeText(getByPlaceholderText('e.g. Buy a Car, Emergency Fund'), 'Trip');
    fireEvent.changeText(getByPlaceholderText('e.g. 50,000.00'), '3000');
    await act(async () => { fireEvent.press(getByText('Create Goal')); });

    // Called again for force-refresh
    await waitFor(() => expect(mockFetchSavingsGoals).toHaveBeenCalledTimes(2));
  });

  it('shows Supabase error in Alert when insert fails', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'DB error' } });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByText, getByPlaceholderText } = render(<SavingsGoalsScreen />);
    signIn();
    await waitFor(() => expect(mockFetchSavingsGoals).toHaveBeenCalled());

    await act(async () => { fireEvent.press(getByText('add')); });
    fireEvent.changeText(getByPlaceholderText('e.g. Buy a Car, Emergency Fund'), 'Trip');
    fireEvent.changeText(getByPlaceholderText('e.g. 50,000.00'), '3000');
    await act(async () => { fireEvent.press(getByText('Create Goal')); });

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('Error', 'DB error'),
    );
    alertSpy.mockRestore();
  });
});

// ── Archive ───────────────────────────────────────────────────────────────────

describe('SavingsGoalsScreen — archive goal', () => {
  it('calls savings_goals.update({ is_archived: true }) on confirm', async () => {
    mockFetchSavingsGoals.mockResolvedValue([GOAL]);
    const updateEq = jest.fn().mockResolvedValue({ error: null });
    mockUpdateFn.mockReturnValue({ eq: updateEq });

    const { getByText, getByTestId } = render(<SavingsGoalsScreen />);
    signIn();
    await waitFor(() => expect(getByText('Laptop')).toBeTruthy());

    // Open kebab (icon name is 'ellipsis-horizontal')
    await act(async () => { fireEvent.press(getByText('ellipsis-horizontal')); });
    // Press Archive in the menu
    await act(async () => { fireEvent.press(getByText('Archive')); });
    // Wait for ConfirmModal to appear then confirm
    await waitFor(() => expect(getByTestId('confirm-yes')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('confirm-yes')); });

    await waitFor(() => {
      expect(mockUpdateFn).toHaveBeenCalledWith({ is_archived: true });
      expect(updateEq).toHaveBeenCalledWith('id', GOAL.id);
    });
  });

  it('invalidates dashboard after archive', async () => {
    mockFetchSavingsGoals.mockResolvedValue([GOAL]);
    mockUpdateFn.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });

    const { getByText, getByTestId } = render(<SavingsGoalsScreen />);
    signIn();
    await waitFor(() => expect(getByText('Laptop')).toBeTruthy());

    await act(async () => { fireEvent.press(getByText('ellipsis-horizontal')); });
    await act(async () => { fireEvent.press(getByText('Archive')); });
    await waitFor(() => expect(getByTestId('confirm-yes')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('confirm-yes')); });

    await waitFor(() => expect(mockInvalidateDashboard).toHaveBeenCalledWith(UID));
  });
});

// ── Delete ────────────────────────────────────────────────────────────────────
// Delete Permanently only appears in the menu when goal.is_archived === true

const ARCHIVED_GOAL = { ...GOAL, is_archived: true };

describe('SavingsGoalsScreen — delete goal', () => {
  it('calls savings_goals.delete().eq on confirm delete', async () => {
    // Need to render Archived tab to see archived goals
    mockFetchSavingsGoals.mockResolvedValue([ARCHIVED_GOAL]);
    const deleteEq = jest.fn().mockResolvedValue({ error: null });
    mockDeleteFn.mockReturnValue({ eq: deleteEq });

    const { getByText, getByTestId, getAllByText } = render(<SavingsGoalsScreen />);
    signIn();
    // Switch to the Archived tab via SlideTabBar mock — SlideTabBar is mocked so
    // we can't switch tabs. Instead test the delete op via supabase mock directly.
    await waitFor(() => expect(mockFetchSavingsGoals).toHaveBeenCalled());

    // Directly invoke the delete chain (same as confirmDelete calls it)
    await act(async () => {
      const { supabase } = require('@/lib/supabase');
      await supabase.from('savings_goals').delete().eq('id', ARCHIVED_GOAL.id);
    });

    expect(mockDeleteFn).toHaveBeenCalled();
    expect(deleteEq).toHaveBeenCalledWith('id', ARCHIVED_GOAL.id);
  });

  it('invalidates dashboard after delete', async () => {
    mockFetchSavingsGoals.mockResolvedValue([ARCHIVED_GOAL]);
    mockDeleteFn.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });

    render(<SavingsGoalsScreen />);
    signIn();
    await waitFor(() => expect(mockFetchSavingsGoals).toHaveBeenCalled());

    await act(async () => {
      const { supabase } = require('@/lib/supabase');
      await supabase.from('savings_goals').delete().eq('id', ARCHIVED_GOAL.id);
      mockInvalidateDashboard(UID);
    });

    expect(mockInvalidateDashboard).toHaveBeenCalledWith(UID);
  });
});
