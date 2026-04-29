import React from 'react';
import { render } from '@testing-library/react-native';
import { IconSymbol } from '../ui/icon-symbol.ios';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('expo-symbols', () => {
  const { View } = require('react-native');
  return {
    SymbolView: ({ name, tintColor, style }: any) => (
      <View testID="symbol-view" accessibilityLabel={name} style={style} />
    ),
  };
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('IconSymbol (iOS) — render', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(
      <IconSymbol name="chevron.right" color="#333" />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders the SymbolView with the given name', () => {
    const { getByTestId } = render(
      <IconSymbol name="house.fill" color="#1B3D2B" />
    );
    expect(getByTestId('symbol-view').props.accessibilityLabel).toBe('house.fill');
  });

  it('renders with a custom size', () => {
    const { toJSON } = render(
      <IconSymbol name="chevron.right" color="#333" size={32} />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders with a custom weight', () => {
    const { toJSON } = render(
      <IconSymbol name="chevron.right" color="#333" weight="bold" />
    );
    expect(toJSON()).toBeTruthy();
  });
});
