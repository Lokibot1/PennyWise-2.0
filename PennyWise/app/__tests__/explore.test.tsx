import React from 'react';
import { render } from '@testing-library/react-native';
import ExploreScreen from '../(tabs)/explore';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return { Image: (props: any) => <View testID="expo-image" {...props} /> };
});

jest.mock('@/components/ui/collapsible', () => {
  const { View, Text } = require('react-native');
  return {
    Collapsible: ({ title, children }: any) => (
      <View testID={`collapsible-${title}`}>
        <Text>{title}</Text>
        {children}
      </View>
    ),
  };
});

jest.mock('@/components/external-link', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    ExternalLink: ({ children }: any) => (
      <TouchableOpacity testID="external-link">{children}</TouchableOpacity>
    ),
  };
});

jest.mock('@/components/parallax-scroll-view', () => {
  const { ScrollView } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: any) => <ScrollView>{children}</ScrollView>,
  };
});

jest.mock('@/components/themed-text', () => {
  const { Text } = require('react-native');
  return { ThemedText: ({ children }: any) => <Text>{children}</Text> };
});

jest.mock('@/components/themed-view', () => {
  const { View } = require('react-native');
  return { ThemedView: ({ children }: any) => <View>{children}</View> };
});

jest.mock('@/components/ui/icon-symbol', () => {
  const { View } = require('react-native');
  return { IconSymbol: () => <View testID="icon-symbol" /> };
});

jest.mock('@/constants/theme', () => ({
  Fonts: { rounded: 'X', mono: 'Y' },
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ExploreScreen', () => {
  it('renders the Explore heading', () => {
    const { getByText } = render(<ExploreScreen />);
    expect(getByText('Explore')).toBeTruthy();
  });

  it('renders the intro text', () => {
    const { getByText } = render(<ExploreScreen />);
    expect(getByText('This app includes example code to help you get started.')).toBeTruthy();
  });

  it('renders collapsible sections', () => {
    const { getByTestId } = render(<ExploreScreen />);
    expect(getByTestId('collapsible-File-based routing')).toBeTruthy();
    expect(getByTestId('collapsible-Animations')).toBeTruthy();
  });
});
