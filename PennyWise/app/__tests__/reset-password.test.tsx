import React from 'react';
import { ActivityIndicator } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import ResetPasswordScreen from '../reset-password';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({
    email: 'user@example.com',
    hashedToken: 'token_abc',
  })),
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      verifyOtp:  jest.fn(),
      updateUser: jest.fn(),
      getUser:    jest.fn(),
      signOut:    jest.fn(),
    },
    functions: {
      invoke: jest.fn(() => Promise.resolve({})),
    },
  },
}));

jest.mock('@/components/GlobalLoadingBar', () => ({
  loadingBar: { start: jest.fn(), finish: jest.fn() },
}));

jest.mock('@/contexts/AppTheme', () => ({
  useAppTheme: () => ({
    theme: {
      headerBg: '#1B3D2B', cardBg: '#FFFFFF', textPrimary: '#0F1F17',
      textMuted: '#8FAF9A', surface: '#F2F8F4', isDark: false, divider: '#E0EDE6',
    },
  }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: ({ name }: { name: string }) => <Text testID="icon">{name}</Text> };
});

jest.mock('@/constants/fonts', () => ({
  Font: {
    headerBlack:  'LeagueSpartan_900Black',
    headerBold:   'LeagueSpartan_700Bold',
    bodyRegular:  'KumbhSans_400Regular',
    bodySemiBold: 'KumbhSans_600SemiBold',
    bodyMedium:   'KumbhSans_500Medium',
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

import { supabase }                     from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';

const mockAuth   = supabase.auth as jest.Mocked<typeof supabase.auth>;
const mockRouter = router as jest.Mocked<typeof router>;

/** Meets all 4 rules: ≥9 chars, uppercase, number, special char */
const STRONG_PW = 'Abcdefg1!';

const VERIFY_OK   = { error: null };
const VERIFY_FAIL = { error: { message: 'Token expired' } };
const UPDATE_OK   = { error: null };
const UPDATE_FAIL = { error: { message: 'New password should be different.' } };

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  // Reset params — clearAllMocks() clears call history but NOT mockReturnValue
  // implementations, so we must reset explicitly to prevent test bleeding.
  (useLocalSearchParams as jest.Mock).mockReturnValue({
    email: 'user@example.com',
    hashedToken: 'token_abc',
  });
  mockAuth.verifyOtp.mockResolvedValue(VERIFY_OK as any);
  mockAuth.updateUser.mockResolvedValue(UPDATE_OK as any);
  mockAuth.getUser.mockResolvedValue({
    data: { user: { email: 'user@example.com', user_metadata: { full_name: 'User' } } },
    error: null,
  } as any);
  mockAuth.signOut.mockResolvedValue({ error: null } as any);
  (supabase.functions.invoke as jest.Mock).mockResolvedValue({});
});

afterEach(() => {
  jest.useRealTimers();
});

/**
 * Wait until the mount-time verifyOtp promise resolves and sessionReady flips
 * to true (button changes from "Verifying…" to "Set New Password").
 * Uses waitFor so it retries across microtask ticks without a hardcoded delay.
 */
async function waitForSession(getByText: ReturnType<typeof render>['getByText']) {
  await waitFor(() => expect(getByText('Set New Password')).toBeTruthy());
}

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('ResetPasswordScreen — rendering', () => {
  it('renders the new password and confirm password fields', async () => {
    const { getByPlaceholderText, getByText } = render(<ResetPasswordScreen />);
    await waitForSession(getByText);
    expect(getByPlaceholderText('Enter new password')).toBeTruthy();
    expect(getByPlaceholderText('Confirm new password')).toBeTruthy();
  });

  it('shows "Verifying…" on the button before the session is ready', () => {
    mockAuth.verifyOtp.mockReturnValue(new Promise(() => {})); // never resolves
    const { getByText } = render(<ResetPasswordScreen />);
    expect(getByText('Verifying…')).toBeTruthy();
  });

  it('shows "Set New Password" after the session is verified', async () => {
    const { getByText } = render(<ResetPasswordScreen />);
    await waitForSession(getByText);
    expect(getByText('Set New Password')).toBeTruthy();
  });
});

// ── Session error ─────────────────────────────────────────────────────────────

describe('ResetPasswordScreen — session error', () => {
  it('shows "Invalid reset link" error when hashedToken is missing', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      email: 'user@example.com',
      hashedToken: '',
    });
    const { getByText } = render(<ResetPasswordScreen />);
    await act(async () => {}); // flush mount effect
    expect(getByText('Invalid reset link. Please start over.')).toBeTruthy();
  });

  it('shows "reset link has expired" error when verifyOtp fails', async () => {
    mockAuth.verifyOtp.mockResolvedValue(VERIFY_FAIL as any);
    const { getByText } = render(<ResetPasswordScreen />);
    await waitFor(() =>
      expect(getByText('This reset link has expired. Please request a new code.')).toBeTruthy()
    );
  });

  it('navigates to /forgot-password when "Request New Code" is pressed', async () => {
    mockAuth.verifyOtp.mockResolvedValue(VERIFY_FAIL as any);
    const { getByText } = render(<ResetPasswordScreen />);
    await waitFor(() => expect(getByText('Request New Code')).toBeTruthy());
    fireEvent.press(getByText('Request New Code'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/forgot-password');
  });
});

// ── Validation ────────────────────────────────────────────────────────────────

describe('ResetPasswordScreen — validation', () => {
  it('shows "Please fill in all fields." when both fields are empty', async () => {
    const { getByText } = render(<ResetPasswordScreen />);
    await waitForSession(getByText);
    await act(async () => { fireEvent.press(getByText('Set New Password')); });
    expect(getByText('Please fill in all fields.')).toBeTruthy();
  });

  it('shows "Please fill in all fields." when confirm password is missing', async () => {
    const { getByText, getByPlaceholderText } = render(<ResetPasswordScreen />);
    await waitForSession(getByText);
    fireEvent.changeText(getByPlaceholderText('Enter new password'), STRONG_PW);
    await act(async () => { fireEvent.press(getByText('Set New Password')); });
    expect(getByText('Please fill in all fields.')).toBeTruthy();
  });

  it('shows "Please meet all password requirements." when rules are not satisfied', async () => {
    const { getByText, getByPlaceholderText } = render(<ResetPasswordScreen />);
    await waitForSession(getByText);
    fireEvent.changeText(getByPlaceholderText('Enter new password'), 'short');
    fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'short');
    await act(async () => { fireEvent.press(getByText('Set New Password')); });
    expect(getByText('Please meet all password requirements.')).toBeTruthy();
  });

  it('shows "Passwords do not match." when the two fields differ', async () => {
    const { getByText, getByPlaceholderText } = render(<ResetPasswordScreen />);
    await waitForSession(getByText);
    fireEvent.changeText(getByPlaceholderText('Enter new password'), STRONG_PW);
    fireEvent.changeText(getByPlaceholderText('Confirm new password'), STRONG_PW + 'X');
    await act(async () => { fireEvent.press(getByText('Set New Password')); });
    expect(getByText('Passwords do not match.')).toBeTruthy();
  });

  it('clears the error when the user starts typing in the new password field', async () => {
    const { getByText, queryByText, getByPlaceholderText } = render(<ResetPasswordScreen />);
    await waitForSession(getByText);
    await act(async () => { fireEvent.press(getByText('Set New Password')); });
    expect(getByText('Please fill in all fields.')).toBeTruthy();
    fireEvent.changeText(getByPlaceholderText('Enter new password'), 'x');
    expect(queryByText('Please fill in all fields.')).toBeNull();
  });
});

// ── Password rules UI ─────────────────────────────────────────────────────────

describe('ResetPasswordScreen — password rules UI', () => {
  it('shows the four rule labels when new password has content', async () => {
    const { getByText, getByPlaceholderText } = render(<ResetPasswordScreen />);
    await waitForSession(getByText);
    fireEvent.changeText(getByPlaceholderText('Enter new password'), 'A');
    expect(getByText('At least 9 characters')).toBeTruthy();
    expect(getByText('One uppercase letter')).toBeTruthy();
    expect(getByText('One number')).toBeTruthy();
    expect(getByText('One special character')).toBeTruthy();
  });

  it('shows "Passwords match" in the confirm hint when passwords are equal', async () => {
    const { getByText, getByPlaceholderText } = render(<ResetPasswordScreen />);
    await waitForSession(getByText);
    fireEvent.changeText(getByPlaceholderText('Enter new password'), STRONG_PW);
    fireEvent.changeText(getByPlaceholderText('Confirm new password'), STRONG_PW);
    expect(getByText('Passwords match')).toBeTruthy();
  });

  it('shows "Passwords do not match" in the confirm hint when passwords differ', async () => {
    const { getByText, getAllByText, getByPlaceholderText } = render(<ResetPasswordScreen />);
    await waitForSession(getByText);
    fireEvent.changeText(getByPlaceholderText('Enter new password'), STRONG_PW);
    fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'different');
    expect(getAllByText('Passwords do not match').length).toBeGreaterThanOrEqual(1);
  });
});

// ── Submit ────────────────────────────────────────────────────────────────────

describe('ResetPasswordScreen — submit', () => {
  async function fillAndSubmit(
    getByText: ReturnType<typeof render>['getByText'],
    getByPlaceholderText: ReturnType<typeof render>['getByPlaceholderText'],
  ) {
    await waitForSession(getByText);
    fireEvent.changeText(getByPlaceholderText('Enter new password'), STRONG_PW);
    fireEvent.changeText(getByPlaceholderText('Confirm new password'), STRONG_PW);
    await act(async () => { fireEvent.press(getByText('Set New Password')); });
  }

  it('calls supabase.auth.updateUser with the new password', async () => {
    const { getByText, getByPlaceholderText } = render(<ResetPasswordScreen />);
    await fillAndSubmit(getByText, getByPlaceholderText);
    expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: STRONG_PW });
  });

  it('shows the success modal after a successful password update', async () => {
    const { getByText, getByPlaceholderText } = render(<ResetPasswordScreen />);
    await fillAndSubmit(getByText, getByPlaceholderText);
    await waitFor(() => expect(getByText('Password Reset!')).toBeTruthy());
  });

  it('shows an ActivityIndicator while saving', async () => {
    let resolve!: (v: any) => void;
    mockAuth.updateUser.mockReturnValue(new Promise(r => { resolve = r; }));
    const { getByText, getByPlaceholderText, UNSAFE_getByType } = render(<ResetPasswordScreen />);
    await waitForSession(getByText);
    fireEvent.changeText(getByPlaceholderText('Enter new password'), STRONG_PW);
    fireEvent.changeText(getByPlaceholderText('Confirm new password'), STRONG_PW);
    fireEvent.press(getByText('Set New Password'));
    await waitFor(() => expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy());
    await act(async () => { resolve(UPDATE_OK); });
  });

  it('shows the error message returned by updateUser on failure', async () => {
    mockAuth.updateUser.mockResolvedValue(UPDATE_FAIL as any);
    const { getByText, getByPlaceholderText } = render(<ResetPasswordScreen />);
    await fillAndSubmit(getByText, getByPlaceholderText);
    await waitFor(() =>
      expect(getByText('New password should be different.')).toBeTruthy()
    );
  });
});

// ── Success modal countdown ───────────────────────────────────────────────────

describe('ResetPasswordScreen — success modal countdown', () => {
  it('calls supabase.auth.signOut after the 5-second countdown', async () => {
    const { getByText, getByPlaceholderText } = render(<ResetPasswordScreen />);
    await waitForSession(getByText);
    fireEvent.changeText(getByPlaceholderText('Enter new password'), STRONG_PW);
    fireEvent.changeText(getByPlaceholderText('Confirm new password'), STRONG_PW);
    await act(async () => { fireEvent.press(getByText('Set New Password')); });

    // Wait for success modal
    await waitFor(() => expect(getByText('Password Reset!')).toBeTruthy());

    // Advance through the 5-second countdown
    await act(async () => { jest.advanceTimersByTime(5000); });

    expect(mockAuth.signOut).toHaveBeenCalled();
  });
});
