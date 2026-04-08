import React from 'react';
import { render } from '@testing-library/react-native';
import ModalScreen from '../modal';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('expo-router', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    Link: ({ children }: any) => <TouchableOpacity testID="link">{children}</TouchableOpacity>,
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ModalScreen', () => {
  it('renders the modal title', () => {
    const { getByText } = render(<ModalScreen />);
    expect(getByText('This is a modal')).toBeTruthy();
  });

  it('renders the go to home link', () => {
    const { getByText } = render(<ModalScreen />);
    expect(getByText('Go to home screen')).toBeTruthy();
  });

  it('renders the dismiss link element', () => {
    const { getByTestId } = render(<ModalScreen />);
    expect(getByTestId('link')).toBeTruthy();
  });
});
