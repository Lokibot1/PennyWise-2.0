import React from 'react';
import { ActivityIndicator } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import LoginFormScreen from '../login-form';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
    },
  },
}));

jest.mock('@/components/GlobalLoadingBar', () => ({
  loadingBar: { start: jest.fn(), finish: jest.fn() },
}));

jest.mock('@/contexts/AppTheme', () => ({
  useAppTheme: () => ({
    theme: {
      headerBg:    '#1B3D2B',
      cardBg:      '#FFFFFF',
      textPrimary: '#0F1F17',
      textMuted:   '#8FAF9A',
      textSecondary: '#4A6355',
      surface:     '#F2F8F4',
      inputBg:     '#F2F8F4',
      inputBorder: '#C8DDD2',
      divider:     '#E0EDE6',
      isDark:      false,
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

import { supabase } from '@/lib/supabase';
import { router }   from 'expo-router';

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockRouter   = router   as jest.Mocked<typeof router>;

const EMAIL_PLACEHOLDER    = 'example@example.com';
const PASSWORD_PLACEHOLDER = '••••••••';

function fillForm(
  utils: ReturnType<typeof render>,
  email = 'user@example.com',
  password = 'Password1',
) {
  fireEvent.changeText(utils.getByPlaceholderText(EMAIL_PLACEHOLDER), email);
  fireEvent.changeText(utils.getByPlaceholderText(PASSWORD_PLACEHOLDER), password);
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: successful login
  (mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ error: null });
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('LoginFormScreen — rendering', () => {
  it('renders the email input', () => {
    const { getByPlaceholderText } = render(<LoginFormScreen />);
    expect(getByPlaceholderText(EMAIL_PLACEHOLDER)).toBeTruthy();
  });

  it('renders the password input', () => {
    const { getByPlaceholderText } = render(<LoginFormScreen />);
    expect(getByPlaceholderText(PASSWORD_PLACEHOLDER)).toBeTruthy();
  });

  it('renders the Log In button', () => {
    const { getByText } = render(<LoginFormScreen />);
    expect(getByText('Log In')).toBeTruthy();
  });

  it('renders the Forgot Password link', () => {
    const { getByText } = render(<LoginFormScreen />);
    expect(getByText('Forgot Password?')).toBeTruthy();
  });

  it('renders the Sign Up button', () => {
    const { getAllByText } = render(<LoginFormScreen />);
    expect(getAllByText('Sign Up').length).toBeGreaterThanOrEqual(1);
  });
});

// ── Input Behavior ────────────────────────────────────────────────────────────

describe('LoginFormScreen — input behavior', () => {
  it('updates the email field when the user types', () => {
    const { getByPlaceholderText, getByDisplayValue } = render(<LoginFormScreen />);
    fireEvent.changeText(getByPlaceholderText(EMAIL_PLACEHOLDER), 'hello@test.com');
    expect(getByDisplayValue('hello@test.com')).toBeTruthy();
  });

  it('updates the password field when the user types', () => {
    const { getByPlaceholderText, getByDisplayValue } = render(<LoginFormScreen />);
    fireEvent.changeText(getByPlaceholderText(PASSWORD_PLACEHOLDER), 'secret123');
    expect(getByDisplayValue('secret123')).toBeTruthy();
  });

  it('clears the error message when the user starts typing', async () => {
    (mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: { message: 'Invalid credentials' },
    });
    const utils = render(<LoginFormScreen />);
    fillForm(utils);

    await act(async () => { fireEvent.press(utils.getByText('Log In')); });
    await waitFor(() => expect(utils.getByText('Invalid credentials')).toBeTruthy());

    fireEvent.changeText(utils.getByPlaceholderText(EMAIL_PLACEHOLDER), 'new@test.com');
    expect(utils.queryByText('Invalid credentials')).toBeNull();
  });
});

// ── Login Validation ──────────────────────────────────────────────────────────

describe('LoginFormScreen — login validation', () => {
  it('does not call supabase when email is empty', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginFormScreen />);
    fireEvent.changeText(getByPlaceholderText(PASSWORD_PLACEHOLDER), 'Password1');
    await act(async () => { fireEvent.press(getByText('Log In')); });
    expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('does not call supabase when password is empty', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginFormScreen />);
    fireEvent.changeText(getByPlaceholderText(EMAIL_PLACEHOLDER), 'user@example.com');
    await act(async () => { fireEvent.press(getByText('Log In')); });
    expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });
});

// ── Login — Success ───────────────────────────────────────────────────────────

describe('LoginFormScreen — login success', () => {
  it('calls signInWithPassword with the sanitized email and password', async () => {
    const utils = render(<LoginFormScreen />);
    fillForm(utils, '  USER@EXAMPLE.COM  ', 'Password1');

    await act(async () => { fireEvent.press(utils.getByText('Log In')); });

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email:    'user@example.com',
      password: 'Password1',
    });
  });

  it('navigates to /(tabs) after a successful login', async () => {
    const utils = render(<LoginFormScreen />);
    fillForm(utils);

    await act(async () => { fireEvent.press(utils.getByText('Log In')); });

    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });
});

// ── Login — Failure ───────────────────────────────────────────────────────────

describe('LoginFormScreen — login failure', () => {
  it('displays the auth error message when login fails', async () => {
    (mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });
    const utils = render(<LoginFormScreen />);
    fillForm(utils);

    await act(async () => { fireEvent.press(utils.getByText('Log In')); });

    await waitFor(() => {
      expect(utils.getByText('Invalid login credentials')).toBeTruthy();
    });
  });

  it('does not navigate when login fails', async () => {
    (mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });
    const utils = render(<LoginFormScreen />);
    fillForm(utils);

    await act(async () => { fireEvent.press(utils.getByText('Log In')); });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});

// ── Loading State ─────────────────────────────────────────────────────────────

describe('LoginFormScreen — loading state', () => {
  it('shows a loading indicator while login is in progress', async () => {
    let resolveLogin!: () => void;
    (mockSupabase.auth.signInWithPassword as jest.Mock).mockReturnValue(
      new Promise(resolve => { resolveLogin = () => resolve({ error: null }); })
    );
    const utils = render(<LoginFormScreen />);
    fillForm(utils);

    fireEvent.press(utils.getByText('Log In'));

    await waitFor(() => {
      expect(utils.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });

    await act(async () => { resolveLogin(); });
  });

  it('hides the loading indicator after login completes', async () => {
    const utils = render(<LoginFormScreen />);
    fillForm(utils);

    await act(async () => { fireEvent.press(utils.getByText('Log In')); });

    await waitFor(() => {
      expect(utils.queryByText('Log In')).toBeTruthy();
    });
  });
});

// ── Navigation Links ──────────────────────────────────────────────────────────

describe('LoginFormScreen — navigation links', () => {
  it('navigates to /forgot-password when Forgot Password is pressed', () => {
    const { getByText } = render(<LoginFormScreen />);
    fireEvent.press(getByText('Forgot Password?'));
    expect(mockRouter.push).toHaveBeenCalledWith('/forgot-password');
  });

  it('navigates to /create-account when Sign Up is pressed', () => {
    const { getAllByText } = render(<LoginFormScreen />);
    fireEvent.press(getAllByText('Sign Up')[0]);
    expect(mockRouter.push).toHaveBeenCalledWith('/create-account');
  });
});
