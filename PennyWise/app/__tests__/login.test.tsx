import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import WelcomeScreen from '../(tabs)/login';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('@/components/penny-wise-logo', () => {
  const { View } = require('react-native');
  return { PennyWiseLogo: () => <View testID="logo" /> };
});

jest.mock('@/constants/fonts', () => ({
  Font: { headerBlack: 'X', headerBold: 'X', bodyRegular: 'X', bodySemiBold: 'X', bodyMedium: 'X' },
}));

beforeEach(() => jest.clearAllMocks());

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WelcomeScreen', () => {
  it('renders the logo', () => {
    const { getByTestId } = render(<WelcomeScreen />);
    expect(getByTestId('logo')).toBeTruthy();
  });

  it('renders the tagline', () => {
    const { getByText } = render(<WelcomeScreen />);
    expect(getByText('Smart spending. Real savings.')).toBeTruthy();
  });

  it('renders Log In, Sign Up, and Forgot Password buttons', () => {
    const { getByText } = render(<WelcomeScreen />);
    expect(getByText('Log In')).toBeTruthy();
    expect(getByText('Sign Up')).toBeTruthy();
    expect(getByText('Forgot Password?')).toBeTruthy();
  });

  it('navigates to /login-form when Log In is pressed', () => {
    const { router } = require('expo-router');
    const { getByText } = render(<WelcomeScreen />);
    fireEvent.press(getByText('Log In'));
    expect(router.push).toHaveBeenCalledWith('/login-form');
  });

  it('navigates to /create-account when Sign Up is pressed', () => {
    const { router } = require('expo-router');
    const { getByText } = render(<WelcomeScreen />);
    fireEvent.press(getByText('Sign Up'));
    expect(router.push).toHaveBeenCalledWith('/create-account');
  });

  it('navigates to /forgot-password when Forgot Password is pressed', () => {
    const { router } = require('expo-router');
    const { getByText } = render(<WelcomeScreen />);
    fireEvent.press(getByText('Forgot Password?'));
    expect(router.push).toHaveBeenCalledWith('/forgot-password');
  });
});
