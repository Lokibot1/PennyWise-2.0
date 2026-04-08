import React from 'react';
import { TextInput, ActivityIndicator } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import VerifyCodeScreen from '../verify-code';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ email: 'user@example.com' })),
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('@/lib/callFunction', () => ({ callFunction: jest.fn() }));

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
    headerBlack: 'LeagueSpartan_900Black', headerBold: 'LeagueSpartan_700Bold',
    bodyRegular: 'KumbhSans_400Regular',   bodySemiBold: 'KumbhSans_600SemiBold',
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

import { callFunction }        from '@/lib/callFunction';
import { router, useLocalSearchParams } from 'expo-router';

const mockCallFunction = callFunction as jest.Mock;
const mockRouter       = router as jest.Mocked<typeof router>;

const SUCCESS_VERIFY = { data: { success: true, hashedToken: 'tok_abc' }, ok: true, rawError: null };
const SUCCESS_SEND   = { data: {}, ok: true, rawError: null };

/** Type one digit into each of the 6 OTP cells. */
function fillOtp(cells: ReturnType<typeof TextInput[]>[number][], digits = '123456') {
  digits.split('').forEach((d, i) => fireEvent.changeText(cells[i] as any, d));
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockCallFunction.mockResolvedValue(SUCCESS_VERIFY);
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('VerifyCodeScreen — rendering', () => {
  it('renders 6 OTP digit inputs', () => {
    const { UNSAFE_getAllByType } = render(<VerifyCodeScreen />);
    expect(UNSAFE_getAllByType(TextInput)).toHaveLength(6);
  });

  it('renders the Verify Code button', () => {
    const { getByTestId } = render(<VerifyCodeScreen />);
    expect(getByTestId('verify-btn')).toBeTruthy();
  });

  it('renders the Back to Login link', () => {
    const { getByText } = render(<VerifyCodeScreen />);
    expect(getByText('Back to Login')).toBeTruthy();
  });

  it('shows the email address received from route params', () => {
    const { getByText } = render(<VerifyCodeScreen />);
    expect(getByText('user@example.com')).toBeTruthy();
  });

  it('shows the resend cooldown on initial render', () => {
    const { getByText } = render(<VerifyCodeScreen />);
    expect(getByText('Resend in 60s')).toBeTruthy();
  });
});

// ── OTP Input ─────────────────────────────────────────────────────────────────

describe('VerifyCodeScreen — OTP input', () => {
  it('typing a digit into a cell updates its value', () => {
    const { UNSAFE_getAllByType } = render(<VerifyCodeScreen />);
    const cells = UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(cells[0], '4');
    expect(cells[0].props.value).toBe('4');
  });

  it('accepts only the last digit when multiple characters are entered', () => {
    const { UNSAFE_getAllByType } = render(<VerifyCodeScreen />);
    const cells = UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(cells[0], '99');
    expect(cells[0].props.value).toBe('9');
  });

  it('ignores non-numeric characters', () => {
    const { UNSAFE_getAllByType } = render(<VerifyCodeScreen />);
    const cells = UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(cells[0], 'a');
    expect(cells[0].props.value).toBe('');
  });

  it('pasting a 6-digit code fills all cells', () => {
    const { UNSAFE_getAllByType } = render(<VerifyCodeScreen />);
    const cells = UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(cells[0], '123456');
    const values = cells.map((c: any) => c.props.value);
    expect(values).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  it('backspace on an empty cell clears the previous cell', () => {
    const { UNSAFE_getAllByType } = render(<VerifyCodeScreen />);
    const cells = UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(cells[0], '1');
    fireEvent(cells[1], 'keyPress', { nativeEvent: { key: 'Backspace' } });
    expect(cells[0].props.value).toBe('');
  });
});

// ── Verify — Validation ───────────────────────────────────────────────────────

describe('VerifyCodeScreen — verify validation', () => {
  it('shows error when Verify Code is pressed with an incomplete OTP', async () => {
    const { getByText, getByTestId, UNSAFE_getAllByType } = render(<VerifyCodeScreen />);
    const cells = UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(cells[0], '1');
    await act(async () => { fireEvent.press(getByTestId('verify-btn')); });
    expect(getByText('Please enter the 6-digit code.')).toBeTruthy();
  });
});

// ── Verify — Success ──────────────────────────────────────────────────────────

describe('VerifyCodeScreen — verify success', () => {
  it('calls verify-reset-otp with the email and joined OTP', async () => {
    const { getByTestId, UNSAFE_getAllByType } = render(<VerifyCodeScreen />);
    fillOtp(UNSAFE_getAllByType(TextInput));
    await act(async () => { fireEvent.press(getByTestId('verify-btn')); });
    expect(mockCallFunction).toHaveBeenCalledWith('verify-reset-otp', {
      email: 'user@example.com',
      otp:   '123456',
    });
  });

  it('navigates to /reset-password with email and hashedToken on success', async () => {
    const { getByTestId, UNSAFE_getAllByType } = render(<VerifyCodeScreen />);
    fillOtp(UNSAFE_getAllByType(TextInput));
    await act(async () => { fireEvent.press(getByTestId('verify-btn')); });
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/reset-password',
      params:   { email: 'user@example.com', hashedToken: 'tok_abc' },
    });
  });
});

// ── Verify — Error Paths ──────────────────────────────────────────────────────

describe('VerifyCodeScreen — verify error paths', () => {
  it('shows "Network error" when rawError is set', async () => {
    mockCallFunction.mockResolvedValue({ data: null, ok: false, rawError: new Error('net') });
    const { getByText, getByTestId, UNSAFE_getAllByType } = render(<VerifyCodeScreen />);
    fillOtp(UNSAFE_getAllByType(TextInput));
    await act(async () => { fireEvent.press(getByTestId('verify-btn')); });
    await waitFor(() => {
      expect(getByText('Network error. Please check your connection.')).toBeTruthy();
    });
  });

  it('shows the expired error when body.expired is true', async () => {
    mockCallFunction.mockResolvedValue({
      data: { expired: true, error: 'Code expired. Please request a new one.' },
      ok: false, rawError: null,
    });
    const { getByText, getByTestId, UNSAFE_getAllByType } = render(<VerifyCodeScreen />);
    fillOtp(UNSAFE_getAllByType(TextInput));
    await act(async () => { fireEvent.press(getByTestId('verify-btn')); });
    await waitFor(() => {
      expect(getByText('Code expired. Please request a new one.')).toBeTruthy();
    });
  });

  it('shows remaining attempts when body.remaining is provided', async () => {
    mockCallFunction.mockResolvedValue({
      data: { remaining: 2, error: 'Incorrect code.' },
      ok: false, rawError: null,
    });
    const { getByText, getByTestId, UNSAFE_getAllByType } = render(<VerifyCodeScreen />);
    fillOtp(UNSAFE_getAllByType(TextInput));
    await act(async () => { fireEvent.press(getByTestId('verify-btn')); });
    await waitFor(() => {
      expect(getByText('2 attempts remaining')).toBeTruthy();
    });
  });
});

// ── Resend ────────────────────────────────────────────────────────────────────

describe('VerifyCodeScreen — resend', () => {
  it('shows "Resend Code" link after the cooldown expires', async () => {
    const { getByText } = render(<VerifyCodeScreen />);
    await act(async () => { jest.advanceTimersByTime(60_000); });
    expect(getByText('Resend Code')).toBeTruthy();
  });

  it('calls send-reset-otp with the email on resend', async () => {
    mockCallFunction.mockResolvedValue(SUCCESS_SEND);
    const { getByText } = render(<VerifyCodeScreen />);
    await act(async () => { jest.advanceTimersByTime(60_000); });
    await act(async () => { fireEvent.press(getByText('Resend Code')); });
    expect(mockCallFunction).toHaveBeenCalledWith('send-reset-otp', {
      email: 'user@example.com',
    });
  });

  it('shows network error when resend fails', async () => {
    mockCallFunction.mockResolvedValue({ data: null, ok: false, rawError: new Error('net') });
    const { getByText } = render(<VerifyCodeScreen />);
    await act(async () => { jest.advanceTimersByTime(60_000); });
    await act(async () => { fireEvent.press(getByText('Resend Code')); });
    await waitFor(() => {
      expect(getByText('Network error. Could not resend code.')).toBeTruthy();
    });
  });
});

// ── Navigation ────────────────────────────────────────────────────────────────

describe('VerifyCodeScreen — navigation', () => {
  it('calls router.back when the back button is pressed', () => {
    const { getAllByTestId } = render(<VerifyCodeScreen />);
    // The back arrow icon button is the first touchable with the back icon
    fireEvent.press(getAllByTestId('icon').find(i => i.props.children === 'arrow-back')!);
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('navigates to /login-form when Back to Login is pressed', () => {
    const { getByText } = render(<VerifyCodeScreen />);
    fireEvent.press(getByText('Back to Login'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/login-form');
  });
});
