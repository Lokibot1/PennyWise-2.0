import React from 'react';
import { render } from '@testing-library/react-native';
import TabLayout from '../(tabs)/_layout';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);

jest.mock('expo-router', () => {
  const { View } = require('react-native');
  const Tabs = ({ children }: any) => <View testID="tabs">{children}</View>;
  Tabs.Screen = () => null;
  return { Tabs };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => (
      <Text testID={`icon-${name}`}>{name}</Text>
    ),
  };
});

jest.mock('@/contexts/AppTheme', () => ({
  useAppTheme: () => ({
    theme: {
      tabBarBg:      '#FFFFFF',
      tabBarInactive: '#8FAF9A',
    },
  }),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TabLayout — render', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<TabLayout />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the Tabs container', () => {
    const { getByTestId } = render(<TabLayout />);
    expect(getByTestId('tabs')).toBeTruthy();
  });
});
