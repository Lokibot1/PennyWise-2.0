import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import OnboardingScreen from '../onboarding';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
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
      divider:       '#E0EDE6',
      headerBg:      '#1B3D2B',
      cardBg:        '#FFFFFF',
      surface:       '#F2F8F4',
      inputBorder:   '#C8DDD2',
    },
  }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser:    jest.fn(),
      updateUser: jest.fn(),
    },
    from: jest.fn(() => ({ upsert: jest.fn() })),
  },
}));

import { router }   from 'expo-router';
import { supabase } from '@/lib/supabase';

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  (supabase.auth.updateUser as jest.Mock).mockResolvedValue({ data: {}, error: null });
  (supabase.from('').upsert as jest.Mock).mockResolvedValue({ error: null });
  // Default: user with no name so welcome message doesn't depend on name
  (supabase.auth.getUser as jest.Mock).mockResolvedValue({
    data: { user: { id: 'u1', email: 'test@example.com', user_metadata: {} } },
  });
});

// ── Step 0 — Welcome ──────────────────────────────────────────────────────────

describe('OnboardingScreen — step 0 (Welcome)', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<OnboardingScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('shows "Welcome! 👋" when no user name is loaded', () => {
    const { getByText } = render(<OnboardingScreen />);
    expect(getByText('Welcome! 👋')).toBeTruthy();
  });

  it('shows "Hi, {name}! 👋" when user has a name', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: {
        user: {
          id:            'u1',
          email:         'test@example.com',
          user_metadata: { full_name: 'Alice Santos' },
        },
      },
    });
    const { findByText } = render(<OnboardingScreen />);
    await findByText('Hi, Alice! 👋');
  });

  it('shows "Get Started" button', () => {
    const { getByText } = render(<OnboardingScreen />);
    expect(getByText('Get Started')).toBeTruthy();
  });

  it('shows "Skip setup" button', () => {
    const { getByText } = render(<OnboardingScreen />);
    expect(getByText('Skip setup')).toBeTruthy();
  });

  it('shows the PennyWise wordmark', () => {
    const { getByText } = render(<OnboardingScreen />);
    expect(getByText('PennyWise')).toBeTruthy();
  });
});

// ── Step 0 → 1 ───────────────────────────────────────────────────────────────

describe('OnboardingScreen — advancing to step 1', () => {
  it('shows budget content after pressing "Get Started"', async () => {
    const { getByText, findByText } = render(<OnboardingScreen />);
    fireEvent.press(getByText('Get Started'));
    await findByText('Set Your Monthly Budget');
  });

  it('shows budget input on step 1', async () => {
    const { getByText, findByPlaceholderText } = render(<OnboardingScreen />);
    fireEvent.press(getByText('Get Started'));
    const input = await findByPlaceholderText('20000');
    expect(input).toBeTruthy();
  });
});

// ── Step 1 ────────────────────────────────────────────────────────────────────

describe('OnboardingScreen — step 1 (Budget)', () => {
  async function goToStep1() {
    const utils = render(<OnboardingScreen />);
    fireEvent.press(utils.getByText('Get Started'));
    await utils.findByText('Set Your Monthly Budget');
    return utils;
  }

  it('shows "Looks Good" button', async () => {
    const { getByText } = await goToStep1();
    expect(getByText('Looks Good')).toBeTruthy();
  });

  it('shows "Skip, use ₱20,000" link', async () => {
    const { getByText } = await goToStep1();
    expect(getByText('Skip, use ₱20,000')).toBeTruthy();
  });
});

// ── Step 1 → 2 ───────────────────────────────────────────────────────────────

describe('OnboardingScreen — advancing to step 2', () => {
  it('shows feature list after pressing "Looks Good"', async () => {
    const { getByText, findByText } = render(<OnboardingScreen />);
    fireEvent.press(getByText('Get Started'));
    await findByText('Set Your Monthly Budget');
    fireEvent.press(getByText('Looks Good'));
    await findByText("Here's what awaits you");
  });

  it('shows all four feature titles on step 2', async () => {
    const { getByText, findByText } = render(<OnboardingScreen />);
    fireEvent.press(getByText('Get Started'));
    await findByText('Set Your Monthly Budget');
    fireEvent.press(getByText('Looks Good'));
    await findByText("Here's what awaits you");

    expect(getByText('Income Tracking')).toBeTruthy();
    expect(getByText('Budget Control')).toBeTruthy();
    expect(getByText('Smart Analytics')).toBeTruthy();
    expect(getByText('Savings Goals')).toBeTruthy();
  });
});

// ── Step 2 → 3 ───────────────────────────────────────────────────────────────

describe('OnboardingScreen — advancing to step 3', () => {
  async function goToStep3() {
    const utils = render(<OnboardingScreen />);
    fireEvent.press(utils.getByText('Get Started'));
    await utils.findByText('Set Your Monthly Budget');
    fireEvent.press(utils.getByText('Looks Good'));
    await utils.findByText("Here's what awaits you");
    fireEvent.press(utils.getByText("I'm Ready"));
    await utils.findByText("You're all set!");
    return utils;
  }

  it('shows "You\'re all set!" on step 3', async () => {
    const { getByText } = await goToStep3();
    expect(getByText("You're all set!")).toBeTruthy();
  });

  it('shows "Start Using PennyWise" button on step 3', async () => {
    const { getByText } = await goToStep3();
    expect(getByText('Start Using PennyWise')).toBeTruthy();
  });
});

// ── Skip setup ────────────────────────────────────────────────────────────────

describe('OnboardingScreen — skip setup', () => {
  it('navigates to (tabs) when "Skip setup" is pressed', async () => {
    const { getByText } = render(<OnboardingScreen />);
    fireEvent.press(getByText('Skip setup'));
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(tabs)');
    });
  });
});

// ── Finish ────────────────────────────────────────────────────────────────────

describe('OnboardingScreen — finish', () => {
  it('navigates to (tabs) when "Start Using PennyWise" is pressed', async () => {
    const { getByText, findByText } = render(<OnboardingScreen />);

    // Advance through all steps
    fireEvent.press(getByText('Get Started'));
    await findByText('Set Your Monthly Budget');
    fireEvent.press(getByText('Looks Good'));
    await findByText("Here's what awaits you");
    fireEvent.press(getByText("I'm Ready"));
    await findByText("You're all set!");

    fireEvent.press(getByText('Start Using PennyWise'));
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(tabs)');
    });
  });
});
