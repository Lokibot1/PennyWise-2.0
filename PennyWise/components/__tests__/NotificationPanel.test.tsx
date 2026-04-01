import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import NotificationPanel from '../NotificationPanel';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);

jest.mock('@/contexts/AppTheme', () => ({
  useAppTheme: () => ({
    theme: {
      cardBg:        '#FFFFFF',
      surface:       '#F2F8F4',
      textPrimary:   '#0F1F17',
      textSecondary: '#4A6355',
      textMuted:     '#8FAF9A',
      divider:       '#E0EDE6',
      isDark:        false,
    },
  }),
}));

const mockClosePanel   = jest.fn();
const mockMarkAllRead  = jest.fn();
const mockMarkRead     = jest.fn();

jest.mock('@/contexts/NotificationContext', () => ({
  useNotifications: jest.fn(),
}));

jest.mock('@/lib/sfx', () => ({
  sfx: { tap: jest.fn(), success: jest.fn() },
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: ({ name }: { name: string }) => <Text testID="icon">{name}</Text> };
});

jest.mock('@/constants/fonts', () => ({
  Font: {
    headerBold:   'LeagueSpartan_700Bold',
    bodyRegular:  'KumbhSans_400Regular',
    bodySemiBold: 'KumbhSans_600SemiBold',
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

import { useNotifications } from '@/contexts/NotificationContext';
import type { AppNotification } from '@/lib/notifications';

const mockUseNotifications = useNotifications as jest.Mock;

const BELL_LAYOUT = { pageX: 300, pageY: 60, width: 24, height: 24 };

const NOTIF_UNREAD: AppNotification = {
  id: '1', type: 'info', icon: 'information-circle-outline',
  title: 'Budget alert', body: 'You are close to your limit.',
  createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
};

const NOTIF_READ: AppNotification = {
  id: '2', type: 'success', icon: 'checkmark-circle-outline',
  title: 'Goal reached', body: 'You hit your savings goal!',
  createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
};

function baseContext(overrides = {}) {
  return {
    notifications:  [],
    readIds:        new Set<string>(),
    panelVisible:   true,
    bellLayout:     BELL_LAYOUT,
    closePanel:     mockClosePanel,
    markAllRead:    mockMarkAllRead,
    markRead:       mockMarkRead,
    unreadCount:    0,
    loading:        false,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseNotifications.mockReturnValue(baseContext());
});

// ── Visibility ────────────────────────────────────────────────────────────────

describe('NotificationPanel — visibility', () => {
  it('renders nothing meaningful when panelVisible is false', () => {
    mockUseNotifications.mockReturnValue(baseContext({ panelVisible: false }));
    const { queryByText } = render(<NotificationPanel />);
    expect(queryByText('Notifications')).toBeNull();
  });

  it('renders the panel header when panelVisible is true', () => {
    const { getByText } = render(<NotificationPanel />);
    expect(getByText('Notifications')).toBeTruthy();
  });
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe('NotificationPanel — loading state', () => {
  it('shows "Loading…" subtext while loading', () => {
    mockUseNotifications.mockReturnValue(baseContext({ loading: true }));
    const { getByText } = render(<NotificationPanel />);
    expect(getByText('Loading…')).toBeTruthy();
  });

  it('does not show notification content while loading', () => {
    mockUseNotifications.mockReturnValue(baseContext({
      loading:       true,
      notifications: [NOTIF_UNREAD],
    }));
    const { queryByText } = render(<NotificationPanel />);
    expect(queryByText('Budget alert')).toBeNull();
  });
});

// ── Empty state ───────────────────────────────────────────────────────────────

describe('NotificationPanel — empty state', () => {
  it('shows "All caught up!" when there are no notifications', () => {
    const { getByText } = render(<NotificationPanel />);
    expect(getByText('All caught up!')).toBeTruthy();
  });

  it('shows "All caught up" subtext when unread count is 0 and not loading', () => {
    const { getByText } = render(<NotificationPanel />);
    expect(getByText('All caught up')).toBeTruthy();
  });
});

// ── Notification list ─────────────────────────────────────────────────────────

describe('NotificationPanel — notification list', () => {
  it('renders notification titles', () => {
    mockUseNotifications.mockReturnValue(baseContext({
      notifications: [NOTIF_UNREAD, NOTIF_READ],
      readIds:       new Set(['2']),
      unreadCount:   1,
    }));
    const { getByText } = render(<NotificationPanel />);
    expect(getByText('Budget alert')).toBeTruthy();
    expect(getByText('Goal reached')).toBeTruthy();
  });

  it('renders notification bodies', () => {
    mockUseNotifications.mockReturnValue(baseContext({
      notifications: [NOTIF_UNREAD],
      unreadCount:   1,
    }));
    const { getByText } = render(<NotificationPanel />);
    expect(getByText('You are close to your limit.')).toBeTruthy();
  });

  it('shows "N unread" subtext when there are unread notifications', () => {
    mockUseNotifications.mockReturnValue(baseContext({
      notifications: [NOTIF_UNREAD],
      unreadCount:   1,
    }));
    const { getByText } = render(<NotificationPanel />);
    expect(getByText('1 unread')).toBeTruthy();
  });

  it('calls markRead with the notification id when a card is pressed', () => {
    mockUseNotifications.mockReturnValue(baseContext({
      notifications: [NOTIF_UNREAD],
      unreadCount:   1,
    }));
    const { getByText } = render(<NotificationPanel />);
    fireEvent.press(getByText('Budget alert'));
    expect(mockMarkRead).toHaveBeenCalledWith('1');
  });
});

// ── Header actions ────────────────────────────────────────────────────────────

describe('NotificationPanel — header actions', () => {
  it('shows "Mark all read" button when there are unread notifications', () => {
    mockUseNotifications.mockReturnValue(baseContext({
      notifications: [NOTIF_UNREAD],
      unreadCount:   1,
    }));
    const { getByText } = render(<NotificationPanel />);
    expect(getByText('Mark all read')).toBeTruthy();
  });

  it('does not show "Mark all read" when unreadCount is 0', () => {
    const { queryByText } = render(<NotificationPanel />);
    expect(queryByText('Mark all read')).toBeNull();
  });

  it('calls markAllRead when "Mark all read" is pressed', () => {
    mockUseNotifications.mockReturnValue(baseContext({
      notifications: [NOTIF_UNREAD],
      unreadCount:   1,
    }));
    const { getByText } = render(<NotificationPanel />);
    fireEvent.press(getByText('Mark all read'));
    expect(mockMarkAllRead).toHaveBeenCalledTimes(1);
  });

  it('calls closePanel when the close button is pressed', () => {
    const { getAllByTestId } = render(<NotificationPanel />);
    fireEvent.press(getAllByTestId('icon').find(i => i.props.children === 'close')!);
    expect(mockClosePanel).toHaveBeenCalledTimes(1);
  });

  it('calls closePanel when the backdrop is pressed', () => {
    const { getByTestId } = render(<NotificationPanel />);
    fireEvent.press(getByTestId('notification-panel-backdrop'));
    expect(mockClosePanel).toHaveBeenCalledTimes(1);
  });
});
