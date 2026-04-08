import React from 'react';
import { Text, View } from 'react-native';
import { render } from '@testing-library/react-native';
import ParallaxScrollView from '../parallax-scroll-view';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-reanimated', () => {
  const mock = require('react-native-reanimated/mock');
  mock.useScrollOffset = () => ({ value: 0 });
  return mock;
});

jest.mock('@/components/themed-view', () => {
  const { View } = require('react-native');
  return { ThemedView: ({ children, style }: any) => <View style={style}>{children}</View> };
});

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/hooks/use-theme-color', () => ({
  useThemeColor: () => '#FFFFFF',
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ParallaxScrollView', () => {
  const headerImage = <View testID="header-image" />;
  const headerBackgroundColor = { dark: '#1B3D2B', light: '#EDF7F1' };

  it('renders without crashing', () => {
    const { toJSON } = render(
      <ParallaxScrollView
        headerImage={headerImage}
        headerBackgroundColor={headerBackgroundColor}
      />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders the header image', () => {
    const { getByTestId } = render(
      <ParallaxScrollView
        headerImage={headerImage}
        headerBackgroundColor={headerBackgroundColor}
      />
    );
    expect(getByTestId('header-image')).toBeTruthy();
  });

  it('renders children inside the content area', () => {
    const { getByText } = render(
      <ParallaxScrollView
        headerImage={headerImage}
        headerBackgroundColor={headerBackgroundColor}
      >
        <Text>Page content</Text>
      </ParallaxScrollView>
    );
    expect(getByText('Page content')).toBeTruthy();
  });
});
