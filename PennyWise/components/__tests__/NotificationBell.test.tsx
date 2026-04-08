import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import NotificationBell from '../NotificationBell';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockOpenPanel = jest.fn();

jest.mock('@/contexts/NotificationContext', () => ({
  useNotifications: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: ({ name }: { name: string }) => <Text testID="icon">{name}</Text> };
});

jest.mock('@/constants/fonts', () => ({
  Font: { bodySemiBold: 'KumbhSans_600SemiBold' },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

import { useNotifications } from '@/contexts/NotificationContext';

const mockUseNotifications = useNotifications as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseNotifications.mockReturnValue({ unreadCount: 0, openPanel: mockOpenPanel });
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('NotificationBell — rendering', () => {
  it('renders the bell icon', () => {
    const { getByTestId } = render(<NotificationBell />);
    expect(getByTestId('icon').props.children).toBe('notifications-outline');
  });

  it('does not render the badge when unreadCount is 0', () => {
    mockUseNotifications.mockReturnValue({ unreadCount: 0, openPanel: mockOpenPanel });
    const { queryByTestId } = render(<NotificationBell />);
    expect(queryByTestId('notification-badge')).toBeNull();
  });

  it('renders the badge when unreadCount is greater than 0', () => {
    mockUseNotifications.mockReturnValue({ unreadCount: 3, openPanel: mockOpenPanel });
    const { getByTestId } = render(<NotificationBell />);
    expect(getByTestId('notification-badge')).toBeTruthy();
  });

  it('displays the exact unread count when it is 9 or below', () => {
    mockUseNotifications.mockReturnValue({ unreadCount: 5, openPanel: mockOpenPanel });
    const { getByText } = render(<NotificationBell />);
    expect(getByText('5')).toBeTruthy();
  });

  it('displays "9+" when unreadCount exceeds 9', () => {
    mockUseNotifications.mockReturnValue({ unreadCount: 15, openPanel: mockOpenPanel });
    const { getByText } = render(<NotificationBell />);
    expect(getByText('9+')).toBeTruthy();
  });

  it('displays "9+" at exactly 10 unread', () => {
    mockUseNotifications.mockReturnValue({ unreadCount: 10, openPanel: mockOpenPanel });
    const { getByText } = render(<NotificationBell />);
    expect(getByText('9+')).toBeTruthy();
  });
});

// ── Interaction ───────────────────────────────────────────────────────────────

describe('NotificationBell — interaction', () => {
  it('calls openPanel when the bell is pressed', () => {
    mockUseNotifications.mockReturnValue({ unreadCount: 0, openPanel: mockOpenPanel });
    const { getByTestId } = render(<NotificationBell testID="bell-button" />);
    fireEvent.press(getByTestId('bell-button'));
    expect(mockOpenPanel).toHaveBeenCalledTimes(1);
  });

  it('passes layout measurements to openPanel', () => {
    mockUseNotifications.mockReturnValue({ unreadCount: 1, openPanel: mockOpenPanel });
    const { getByTestId } = render(<NotificationBell testID="bell-button" />);
    fireEvent.press(getByTestId('bell-button'));
    // measure is a no-op in the test renderer — openPanel is called with
    // whatever the mock measure provides (all zeros by default)
    expect(mockOpenPanel).toHaveBeenCalledWith(
      expect.objectContaining({ pageX: expect.any(Number), pageY: expect.any(Number) })
    );
  });
});
