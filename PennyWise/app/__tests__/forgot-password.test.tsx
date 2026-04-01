import React from 'react';
import { ActivityIndicator } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import ForgotPasswordScreen from '../forgot-password';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('@/lib/callFunction', () => ({
  callFunction: jest.fn(),
}));

jest.mock('@/components/GlobalLoadingBar', () => ({
  loadingBar: { start: jest.fn(), finish: jest.fn() },
}));

jest.mock('@/contexts/AppTheme', () => ({
  useAppTheme: () => ({
    theme: {
      headerBg:      '#1B3D2B',
      cardBg:        '#FFFFFF',
      textPrimary:   '#0F1F17',
      textSecondary: '#4A6355',
      textMuted:     '#8FAF9A',
      surface:       '#F2F8F4',
      inputBg:       '#F2F8F4',
      inputBorder:   '#C8DDD2',
      divider:       '#E0EDE6',
      isDark:        false,
    },
  }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => <Text testID="icon">{name}</Text>,
  };
});

jest.mock('@/constants/fonts', () => ({
  Font: {
    headerBlack:  'LeagueSpartan_900Black',
    headerBold:   'LeagueSpartan_700Bold',
    bodyRegular:  'KumbhSans_400Regular',
    bodySemiBold: 'KumbhSans_600SemiBold',
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

import { callFunction } from '@/lib/callFunction';
import { router }       from 'expo-router';

const mockCallFunction = callFunction as jest.Mock;
const mockRouter       = router as jest.Mocked<typeof router>;

const EMAIL_PLACEHOLDER = 'example@example.com';

const SUCCESS_RESPONSE = { data: {}, ok: true, status: 200, rawError: null };

beforeEach(() => {
  jest.clearAllMocks();
  mockCallFunction.mockResolvedValue(SUCCESS_RESPONSE);
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('ForgotPasswordScreen — rendering', () => {
  it('renders the email input', () => {
    const { getByPlaceholderText } = render(<ForgotPasswordScreen />);
    expect(getByPlaceholderText(EMAIL_PLACEHOLDER)).toBeTruthy();
  });

  it('renders the Send Code button', () => {
    const { getByText } = render(<ForgotPasswordScreen />);
    expect(getByText('Send Code')).toBeTruthy();
  });

  it('renders the Sign Up button', () => {
    const { getAllByText } = render(<ForgotPasswordScreen />);
    expect(getAllByText('Sign Up').length).toBeGreaterThanOrEqual(1);
  });
});

// ── Validation ────────────────────────────────────────────────────────────────

describe('ForgotPasswordScreen — validation', () => {
  it('shows "Please enter your email address" when email is empty', async () => {
    const { getByText } = render(<ForgotPasswordScreen />);
    await act(async () => { fireEvent.press(getByText('Send Code')); });
    expect(getByText('Please enter your email address.')).toBeTruthy();
  });

  it('shows "Please enter a valid email address" for a malformed email', async () => {
    const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);
    fireEvent.changeText(getByPlaceholderText(EMAIL_PLACEHOLDER), 'notanemail');
    await act(async () => { fireEvent.press(getByText('Send Code')); });
    expect(getByText('Please enter a valid email address.')).toBeTruthy();
  });

  it('does not call the API when email is empty', async () => {
    const { getByText } = render(<ForgotPasswordScreen />);
    await act(async () => { fireEvent.press(getByText('Send Code')); });
    expect(mockCallFunction).not.toHaveBeenCalled();
  });

  it('does not call the API when email format is invalid', async () => {
    const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);
    fireEvent.changeText(getByPlaceholderText(EMAIL_PLACEHOLDER), 'bad@');
    await act(async () => { fireEvent.press(getByText('Send Code')); });
    expect(mockCallFunction).not.toHaveBeenCalled();
  });
});

// ── Success ───────────────────────────────────────────────────────────────────

describe('ForgotPasswordScreen — success', () => {
  it('calls send-reset-otp with the sanitized email', async () => {
    const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);
    fireEvent.changeText(getByPlaceholderText(EMAIL_PLACEHOLDER), '  USER@EXAMPLE.COM  ');
    await act(async () => { fireEvent.press(getByText('Send Code')); });
    expect(mockCallFunction).toHaveBeenCalledWith('send-reset-otp', {
      email: 'user@example.com',
    });
  });

  it('navigates to /verify-code with the email as a param on success', async () => {
    const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);
    fireEvent.changeText(getByPlaceholderText(EMAIL_PLACEHOLDER), 'user@example.com');
    await act(async () => { fireEvent.press(getByText('Send Code')); });
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/verify-code',
      params:   { email: 'user@example.com' },
    });
  });
});

// ── Error Paths ───────────────────────────────────────────────────────────────

describe('ForgotPasswordScreen — error paths', () => {
  it('shows "Network error" when rawError is set', async () => {
    mockCallFunction.mockResolvedValue({
      data: null, ok: false, status: 0, rawError: new Error('fetch failed'),
    });
    const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);
    fireEvent.changeText(getByPlaceholderText(EMAIL_PLACEHOLDER), 'user@example.com');
    await act(async () => { fireEvent.press(getByText('Send Code')); });
    await waitFor(() => {
      expect(getByText('Network error. Please check your connection.')).toBeTruthy();
    });
  });

  it('shows the rate-limit message when the API returns rateLimited', async () => {
    mockCallFunction.mockResolvedValue({
      data: { rateLimited: true }, ok: false, status: 429, rawError: null,
    });
    const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);
    fireEvent.changeText(getByPlaceholderText(EMAIL_PLACEHOLDER), 'user@example.com');
    await act(async () => { fireEvent.press(getByText('Send Code')); });
    await waitFor(() => {
      expect(
        getByText('Please wait a moment before requesting another code.')
      ).toBeTruthy();
    });
  });

  it('shows the API error message for other non-ok responses', async () => {
    mockCallFunction.mockResolvedValue({
      data: { error: 'Service unavailable' }, ok: false, status: 503, rawError: null,
    });
    const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);
    fireEvent.changeText(getByPlaceholderText(EMAIL_PLACEHOLDER), 'user@example.com');
    await act(async () => { fireEvent.press(getByText('Send Code')); });
    await waitFor(() => {
      expect(getByText('Service unavailable')).toBeTruthy();
    });
  });
});

// ── Loading State ─────────────────────────────────────────────────────────────

describe('ForgotPasswordScreen — loading state', () => {
  it('shows a loading indicator while the request is in progress', async () => {
    let resolveCall!: () => void;
    mockCallFunction.mockReturnValue(
      new Promise(resolve => { resolveCall = () => resolve(SUCCESS_RESPONSE); })
    );
    const { getByPlaceholderText, getByText, UNSAFE_getByType } =
      render(<ForgotPasswordScreen />);
    fireEvent.changeText(getByPlaceholderText(EMAIL_PLACEHOLDER), 'user@example.com');
    fireEvent.press(getByText('Send Code'));

    await waitFor(() => {
      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });

    await act(async () => { resolveCall(); });
  });
});

// ── Navigation & Error Clearing ───────────────────────────────────────────────

describe('ForgotPasswordScreen — navigation and error clearing', () => {
  it('navigates to /create-account when Sign Up is pressed', () => {
    const { getAllByText } = render(<ForgotPasswordScreen />);
    fireEvent.press(getAllByText('Sign Up')[0]);
    expect(mockRouter.push).toHaveBeenCalledWith('/create-account');
  });

  it('clears the error when the user starts typing', async () => {
    const { getByPlaceholderText, getByText, queryByText } =
      render(<ForgotPasswordScreen />);
    await act(async () => { fireEvent.press(getByText('Send Code')); });
    expect(getByText('Please enter your email address.')).toBeTruthy();

    fireEvent.changeText(getByPlaceholderText(EMAIL_PLACEHOLDER), 'u');
    expect(queryByText('Please enter your email address.')).toBeNull();
  });
});
