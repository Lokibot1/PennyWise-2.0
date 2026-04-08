import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Mocks shared by all four auth screens ─────────────────────────────────────

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({
    email: 'user@example.com',
    hashedToken: 'token_abc',
  })),
}));

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp:             jest.fn(),
      verifyOtp:          jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      updateUser:         jest.fn(),
      getUser:            jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signOut:            jest.fn(),
    },
    functions: {
      invoke: jest.fn().mockResolvedValue({}),
    },
  },
}));

jest.mock('@/lib/callFunction', () => ({
  callFunction: jest.fn().mockResolvedValue({ data: {}, ok: true, rawError: null }),
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
  return { Ionicons: ({ name }: { name: string }) => <Text>{name}</Text> };
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

jest.mock('@/components/password-strength', () => ({
  PasswordStrength: () => null,
}));

// ── Screen imports (after all mocks) ─────────────────────────────────────────

import LoginFormScreen     from '../login-form';
import CreateAccountScreen from '../create-account';
import ForgotPasswordScreen from '../forgot-password';
import VerifyCodeScreen    from '../verify-code';
import ResetPasswordScreen from '../reset-password';

// ── Helper ────────────────────────────────────────────────────────────────────

/** Returns the props of the first SafeAreaView in the rendered tree. */
function getRootSafeAreaProps(ui: React.ReactElement) {
  const { UNSAFE_getAllByType } = render(ui);
  return UNSAFE_getAllByType(SafeAreaView)[0].props;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Clickjacking prevention — filterTouchesWhenObscured', () => {

  describe('login-form', () => {
    it('root SafeAreaView has filterTouchesWhenObscured set to true', () => {
      const props = getRootSafeAreaProps(<LoginFormScreen />);
      expect(props.filterTouchesWhenObscured).toBe(true);
    });

    it('filterTouchesWhenObscured is the only clickjacking guard (no extra wrapper)', () => {
      const { UNSAFE_getAllByType } = render(<LoginFormScreen />);
      const views = UNSAFE_getAllByType(SafeAreaView);
      // All SafeAreaViews in the screen should carry the guard
      views.forEach(v => {
        expect(v.props.filterTouchesWhenObscured).toBe(true);
      });
    });
  });

  describe('create-account', () => {
    it('root SafeAreaView has filterTouchesWhenObscured set to true', () => {
      const props = getRootSafeAreaProps(<CreateAccountScreen />);
      expect(props.filterTouchesWhenObscured).toBe(true);
    });
  });

  describe('forgot-password', () => {
    it('root SafeAreaView has filterTouchesWhenObscured set to true', () => {
      const props = getRootSafeAreaProps(<ForgotPasswordScreen />);
      expect(props.filterTouchesWhenObscured).toBe(true);
    });
  });

  describe('verify-code', () => {
    it('root SafeAreaView has filterTouchesWhenObscured set to true', () => {
      const props = getRootSafeAreaProps(<VerifyCodeScreen />);
      expect(props.filterTouchesWhenObscured).toBe(true);
    });
  });

  describe('reset-password', () => {
    it('root SafeAreaView has filterTouchesWhenObscured set to true', () => {
      const props = getRootSafeAreaProps(<ResetPasswordScreen />);
      expect(props.filterTouchesWhenObscured).toBe(true);
    });
  });

  describe('coverage across all auth screens', () => {
    const screens: [string, React.ReactElement][] = [
      ['login-form',      <LoginFormScreen />],
      ['create-account',  <CreateAccountScreen />],
      ['forgot-password', <ForgotPasswordScreen />],
      ['verify-code',     <VerifyCodeScreen />],
      ['reset-password',  <ResetPasswordScreen />],
    ];

    it.each(screens)(
      '%s applies filterTouchesWhenObscured=true on every SafeAreaView',
      (_, ui) => {
        const { UNSAFE_getAllByType } = render(ui);
        const views = UNSAFE_getAllByType(SafeAreaView);
        expect(views.length).toBeGreaterThan(0);
        views.forEach(v => {
          expect(v.props.filterTouchesWhenObscured).toBe(true);
        });
      }
    );
  });
});
