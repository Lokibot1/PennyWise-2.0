import React from 'react';
import { render } from '@testing-library/react-native';
import { IconSymbol } from '../ui/icon-symbol';

// jest-expo resolves `icon-symbol` to `icon-symbol.ios.tsx` (SF Symbols via expo-symbols).
// Mock expo-symbols so we can assert against the name that is passed through.

jest.mock('expo-symbols', () => {
  const { Text } = require('react-native');
  return {
    SymbolView: ({ name, tintColor, style }: any) => (
      <Text testID="symbol-view" accessibilityLabel={name}>{name}</Text>
    ),
  };
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('IconSymbol — render', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(
      <IconSymbol name="chevron.right" color="#333" />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('passes the SF Symbol name through to the underlying view', () => {
    const { getByTestId } = render(
      <IconSymbol name="chevron.right" color="#333" />
    );
    expect(getByTestId('symbol-view').props.accessibilityLabel).toBe('chevron.right');
  });

  it('passes "house.fill" through unchanged', () => {
    const { getByTestId } = render(
      <IconSymbol name="house.fill" color="#333" />
    );
    expect(getByTestId('symbol-view').props.accessibilityLabel).toBe('house.fill');
  });

  it('passes "paperplane.fill" through unchanged', () => {
    const { getByTestId } = render(
      <IconSymbol name="paperplane.fill" color="#333" />
    );
    expect(getByTestId('symbol-view').props.accessibilityLabel).toBe('paperplane.fill');
  });

  it('renders with a custom size', () => {
    const { toJSON } = render(
      <IconSymbol name="chevron.right" color="#333" size={32} />
    );
    expect(toJSON()).toBeTruthy();
  });
});
