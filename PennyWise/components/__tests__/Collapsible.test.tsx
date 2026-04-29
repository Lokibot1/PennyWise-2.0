import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { Collapsible } from '../ui/collapsible';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/components/themed-text', () => {
  const { Text } = require('react-native');
  return {
    ThemedText: ({ children }: any) => <Text>{children}</Text>,
  };
});

jest.mock('@/components/themed-view', () => {
  const { View } = require('react-native');
  return {
    ThemedView: ({ children }: any) => <View>{children}</View>,
  };
});

jest.mock('@/components/ui/icon-symbol', () => {
  const { Text } = require('react-native');
  return {
    IconSymbol: ({ name }: { name: string }) => (
      <Text testID="icon-symbol">{name}</Text>
    ),
  };
});

jest.mock('@/constants/theme', () => ({
  Colors: {
    light: { icon: '#333' },
    dark:  { icon: '#ccc' },
  },
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Collapsible — closed by default', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(
      <Collapsible title="Settings">
        <Text>child</Text>
      </Collapsible>
    );
    expect(toJSON()).toBeTruthy();
  });

  it('shows the title', () => {
    const { getByText } = render(
      <Collapsible title="My Section">
        <Text>child</Text>
      </Collapsible>
    );
    expect(getByText('My Section')).toBeTruthy();
  });

  it('hides children by default', () => {
    const { queryByText } = render(
      <Collapsible title="Section">
        <Text>Hidden content</Text>
      </Collapsible>
    );
    expect(queryByText('Hidden content')).toBeNull();
  });

  it('renders the chevron icon', () => {
    const { getByTestId } = render(
      <Collapsible title="Section">
        <Text>child</Text>
      </Collapsible>
    );
    expect(getByTestId('icon-symbol')).toBeTruthy();
  });
});

describe('Collapsible — toggle open', () => {
  it('shows children after pressing the heading', () => {
    const { getByText, queryByText } = render(
      <Collapsible title="Section">
        <Text>Visible content</Text>
      </Collapsible>
    );
    expect(queryByText('Visible content')).toBeNull();
    fireEvent.press(getByText('Section'));
    expect(getByText('Visible content')).toBeTruthy();
  });

  it('hides children again after a second press', () => {
    const { getByText, queryByText } = render(
      <Collapsible title="Section">
        <Text>Toggled content</Text>
      </Collapsible>
    );
    fireEvent.press(getByText('Section'));
    expect(getByText('Toggled content')).toBeTruthy();
    fireEvent.press(getByText('Section'));
    expect(queryByText('Toggled content')).toBeNull();
  });
});
