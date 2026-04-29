import React from 'react';
import { render } from '@testing-library/react-native';
import OfflineBanner from '../OfflineBanner';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Module-level variable so each describe can flip isOnline without resetModules
// (resetModules breaks React hooks by producing a second React copy).
let mockIsOnline = true;

jest.mock('@/contexts/NetworkContext', () => ({
  useNetwork: () => ({ isOnline: mockIsOnline, pendingSync: false }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => <Text testID="icon">{name}</Text>,
  };
});

jest.mock('@/constants/fonts', () => ({
  Font: { bodySemiBold: 'KumbhSans_600SemiBold' },
}));

afterEach(() => {
  mockIsOnline = true; // restore default after each test
});

// ── Online state ──────────────────────────────────────────────────────────────

describe('OfflineBanner — online', () => {
  it('renders without crashing when online', () => {
    const { toJSON } = render(<OfflineBanner />);
    expect(toJSON()).toBeTruthy();
  });
});

// ── Offline state ─────────────────────────────────────────────────────────────

describe('OfflineBanner — offline', () => {
  beforeEach(() => { mockIsOnline = false; });

  it('renders without crashing when offline', () => {
    const { toJSON } = render(<OfflineBanner />);
    expect(toJSON()).toBeTruthy();
  });

  it('shows the offline message when offline', () => {
    const { getByText } = render(<OfflineBanner />);
    expect(getByText("You're offline — viewing cached data")).toBeTruthy();
  });
});

// ── Structure ─────────────────────────────────────────────────────────────────

describe('OfflineBanner — structure', () => {
  it('renders the cloud-offline-outline icon', () => {
    const { getByTestId } = render(<OfflineBanner />);
    expect(getByTestId('icon').props.children).toBe('cloud-offline-outline');
  });
});
