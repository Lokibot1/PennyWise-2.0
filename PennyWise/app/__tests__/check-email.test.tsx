import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CheckEmailScreen from '../check-email';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  router:               { replace: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ email: 'test@example.com' })),
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: any) => <View {...props}>{children}</View>,
  };
});

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => <Text testID={`icon-${name}`}>{name}</Text>,
  };
});

jest.mock('@/constants/fonts', () => ({
  Font: {
    headerBlack:  'LeagueSpartan_900Black',
    headerBold:   'LeagueSpartan_700Bold',
    bodySemiBold: 'KumbhSans_600SemiBold',
    bodyRegular:  'KumbhSans_400Regular',
  },
}));

jest.mock('@/contexts/AppTheme', () => ({
  useAppTheme: () => ({
    theme: {
      isDark:        false,
      textPrimary:   '#0F1F17',
      textSecondary: '#4A6355',
      textMuted:     '#8FAF9A',
      headerBg:      '#1B3D2B',
      cardBg:        '#FFFFFF',
      surface:       '#F2F8F4',
    },
  }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { resend: jest.fn() },
  },
}));

import { router }   from 'expo-router';
import { supabase } from '@/lib/supabase';

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Render ────────────────────────────────────────────────────────────────────

describe('CheckEmailScreen — render', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<CheckEmailScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('shows "Check Your Email" header', () => {
    const { getByText } = render(<CheckEmailScreen />);
    expect(getByText('Check Your Email')).toBeTruthy();
  });

  it('shows the email address from route params', () => {
    const { getByText } = render(<CheckEmailScreen />);
    expect(getByText('test@example.com')).toBeTruthy();
  });

  it('shows "Confirm your email address" title', () => {
    const { getByText } = render(<CheckEmailScreen />);
    expect(getByText('Confirm your email address')).toBeTruthy();
  });
});

// ── Buttons ───────────────────────────────────────────────────────────────────

describe('CheckEmailScreen — buttons', () => {
  it('renders "Go to Login" button', () => {
    const { getByText } = render(<CheckEmailScreen />);
    expect(getByText('Go to Login')).toBeTruthy();
  });

  it('renders "Resend Email" button', () => {
    const { getByText } = render(<CheckEmailScreen />);
    expect(getByText('Resend Email')).toBeTruthy();
  });

  it('navigates to login when "Go to Login" is pressed', () => {
    const { getByText } = render(<CheckEmailScreen />);
    fireEvent.press(getByText('Go to Login'));
    expect(router.replace).toHaveBeenCalledWith('/login-form');
  });
});

// ── Resend — success ──────────────────────────────────────────────────────────

describe('CheckEmailScreen — resend success', () => {
  beforeEach(() => {
    (supabase.auth.resend as jest.Mock).mockResolvedValue({ error: null });
  });

  it('shows success message after successful resend', async () => {
    const { getByText, findByText } = render(<CheckEmailScreen />);
    fireEvent.press(getByText('Resend Email'));
    await findByText('Confirmation email resent!');
  });

  it('calls supabase.auth.resend with correct args', async () => {
    const { getByText } = render(<CheckEmailScreen />);
    fireEvent.press(getByText('Resend Email'));
    await waitFor(() => {
      expect(supabase.auth.resend).toHaveBeenCalledWith({
        type:    'signup',
        email:   'test@example.com',
        options: { emailRedirectTo: 'pennywise://' },
      });
    });
  });
});

// ── Resend — error ────────────────────────────────────────────────────────────

describe('CheckEmailScreen — resend error', () => {
  beforeEach(() => {
    (supabase.auth.resend as jest.Mock).mockResolvedValue({ error: { message: 'Rate limit exceeded' } });
  });

  it('shows the error message when resend fails', async () => {
    const { getByText, findByText } = render(<CheckEmailScreen />);
    fireEvent.press(getByText('Resend Email'));
    await findByText('Rate limit exceeded');
  });
});

// ── Icons ─────────────────────────────────────────────────────────────────────

describe('CheckEmailScreen — icons', () => {
  it('shows the mail-open-outline icon', () => {
    const { getByTestId } = render(<CheckEmailScreen />);
    expect(getByTestId('icon-mail-open-outline')).toBeTruthy();
  });
});
