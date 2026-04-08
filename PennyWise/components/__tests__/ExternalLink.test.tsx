import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ExternalLink } from '../external-link';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockOpenBrowserAsync = jest.fn();

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: (...args: any[]) => mockOpenBrowserAsync(...args),
  WebBrowserPresentationStyle: { AUTOMATIC: 'automatic' },
}));

jest.mock('expo-router', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    Link: ({ children, onPress, href, testID }: any) => (
      <TouchableOpacity
        testID={testID ?? 'external-link'}
        onPress={(e: any) => onPress?.(e)}
      >
        {typeof children === 'string' ? <Text>{children}</Text> : children}
      </TouchableOpacity>
    ),
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('ExternalLink — rendering', () => {
  it('renders its children', () => {
    const { getByText } = render(
      <ExternalLink href="https://example.com">Visit</ExternalLink>
    );
    expect(getByText('Visit')).toBeTruthy();
  });
});

// ── Native behaviour ──────────────────────────────────────────────────────────

describe('ExternalLink — native behaviour', () => {
  it('calls openBrowserAsync with the href on native press', async () => {
    (process.env as any).EXPO_OS = 'ios';
    const { getByTestId } = render(
      <ExternalLink href="https://example.com" testID="ext-link">Go</ExternalLink>
    );
    const preventDefaultMock = jest.fn();
    await fireEvent(getByTestId('ext-link'), 'press', { preventDefault: preventDefaultMock });
    expect(mockOpenBrowserAsync).toHaveBeenCalledWith(
      'https://example.com',
      { presentationStyle: 'automatic' }
    );
  });

  // Note: the web branch (process.env.EXPO_OS === 'web') is a compile-time
  // constant inlined by Babel — it cannot be toggled at runtime in Jest.
});
