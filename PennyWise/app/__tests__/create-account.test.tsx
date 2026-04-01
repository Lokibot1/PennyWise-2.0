import React from 'react';
import { ActivityIndicator } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import CreateAccountScreen from '../create-account';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { signUp: jest.fn() },
  },
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
      inputBg:       '#F2F8F4',
      inputBorder:   '#C8DDD2',
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

// PasswordStrength is already unit-tested separately — stub it out here
jest.mock('@/components/password-strength', () => ({
  PasswordStrength: () => null,
}));

// DatePickerModal: expose a Confirm button that calls onConfirm(Jan 1 2000)
jest.mock('@/components/DatePickerModal', () => {
  const { TouchableOpacity, Text, View } = require('react-native');
  return ({ visible, onConfirm }: any) =>
    visible ? (
      <View testID="date-picker-modal">
        <TouchableOpacity
          testID="date-picker-confirm"
          onPress={() => onConfirm(new Date(2000, 0, 1))}
        >
          <Text>Confirm Date</Text>
        </TouchableOpacity>
      </View>
    ) : null;
});

// ── Helpers ───────────────────────────────────────────────────────────────────

import { supabase } from '@/lib/supabase';
import { router }   from 'expo-router';

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockRouter   = router   as jest.Mocked<typeof router>;

const PH = {
  name:     'John Doe',
  email:    'example@example.com',
  phone:    '+63 912 345 6789',
  password: '••••••••',
  dob:      'Select your date of birth',
};

/** Fill every required field with valid values. */
async function fillAllFields(utils: ReturnType<typeof render>) {
  fireEvent.changeText(utils.getByPlaceholderText(PH.name),  'Jane Doe');
  fireEvent.changeText(utils.getByPlaceholderText(PH.email), 'jane@example.com');
  fireEvent.changeText(utils.getByPlaceholderText(PH.phone), '+63912345678');

  // Open and confirm DOB picker
  fireEvent.press(utils.getByText(PH.dob));
  fireEvent.press(utils.getByTestId('date-picker-confirm'));

  // Two password fields share the same placeholder — [0]=password, [1]=confirm
  const pwInputs = utils.getAllByPlaceholderText(PH.password);
  fireEvent.changeText(pwInputs[0], 'Password1');
  fireEvent.changeText(pwInputs[1], 'Password1');
}

beforeEach(() => {
  jest.clearAllMocks();
  (mockSupabase.auth.signUp as jest.Mock).mockResolvedValue({ error: null });
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('CreateAccountScreen — rendering', () => {
  it('renders the Full Name input', () => {
    const { getByPlaceholderText } = render(<CreateAccountScreen />);
    expect(getByPlaceholderText(PH.name)).toBeTruthy();
  });

  it('renders the Email input', () => {
    const { getByPlaceholderText } = render(<CreateAccountScreen />);
    expect(getByPlaceholderText(PH.email)).toBeTruthy();
  });

  it('renders the Mobile Number input', () => {
    const { getByPlaceholderText } = render(<CreateAccountScreen />);
    expect(getByPlaceholderText(PH.phone)).toBeTruthy();
  });

  it('renders the Date of Birth picker button', () => {
    const { getByText } = render(<CreateAccountScreen />);
    expect(getByText(PH.dob)).toBeTruthy();
  });

  it('renders the Password input', () => {
    const { getAllByPlaceholderText } = render(<CreateAccountScreen />);
    expect(getAllByPlaceholderText(PH.password).length).toBeGreaterThanOrEqual(1);
  });

  it('renders the Confirm Password input', () => {
    const { getAllByPlaceholderText } = render(<CreateAccountScreen />);
    expect(getAllByPlaceholderText(PH.password).length).toBe(2);
  });

  it('renders the Sign Up button', () => {
    const { getByText } = render(<CreateAccountScreen />);
    expect(getByText('Sign Up')).toBeTruthy();
  });

  it('renders the Log In footer link', () => {
    const { getByText } = render(<CreateAccountScreen />);
    expect(getByText('Log In')).toBeTruthy();
  });
});

// ── Validation ────────────────────────────────────────────────────────────────

describe('CreateAccountScreen — validation', () => {
  it('shows "Full name is required" when name is empty', async () => {
    const { getByText } = render(<CreateAccountScreen />);
    await act(async () => { fireEvent.press(getByText('Sign Up')); });
    expect(getByText('Full name is required.')).toBeTruthy();
  });

  it('shows "Email is required" when email is empty', async () => {
    const utils = render(<CreateAccountScreen />);
    fireEvent.changeText(utils.getByPlaceholderText(PH.name), 'Jane Doe');
    await act(async () => { fireEvent.press(utils.getByText('Sign Up')); });
    expect(utils.getByText('Email is required.')).toBeTruthy();
  });

  it('shows "Mobile number is required" when phone is empty', async () => {
    const utils = render(<CreateAccountScreen />);
    fireEvent.changeText(utils.getByPlaceholderText(PH.name),  'Jane Doe');
    fireEvent.changeText(utils.getByPlaceholderText(PH.email), 'jane@example.com');
    await act(async () => { fireEvent.press(utils.getByText('Sign Up')); });
    expect(utils.getByText('Mobile number is required.')).toBeTruthy();
  });

  it('shows "Date of birth is required" when DOB is not selected', async () => {
    const utils = render(<CreateAccountScreen />);
    fireEvent.changeText(utils.getByPlaceholderText(PH.name),  'Jane Doe');
    fireEvent.changeText(utils.getByPlaceholderText(PH.email), 'jane@example.com');
    fireEvent.changeText(utils.getByPlaceholderText(PH.phone), '+63912345678');
    await act(async () => { fireEvent.press(utils.getByText('Sign Up')); });
    expect(utils.getByText('Date of birth is required.')).toBeTruthy();
  });

  it('shows "Password is required" when password is empty', async () => {
    const utils = render(<CreateAccountScreen />);
    fireEvent.changeText(utils.getByPlaceholderText(PH.name),  'Jane Doe');
    fireEvent.changeText(utils.getByPlaceholderText(PH.email), 'jane@example.com');
    fireEvent.changeText(utils.getByPlaceholderText(PH.phone), '+63912345678');
    fireEvent.press(utils.getByText(PH.dob));
    fireEvent.press(utils.getByTestId('date-picker-confirm'));
    await act(async () => { fireEvent.press(utils.getByText('Sign Up')); });
    expect(utils.getByText('Password is required.')).toBeTruthy();
  });

  it('shows "Password must be at least 6 characters" when password is too short', async () => {
    const utils = render(<CreateAccountScreen />);
    fireEvent.changeText(utils.getByPlaceholderText(PH.name),  'Jane Doe');
    fireEvent.changeText(utils.getByPlaceholderText(PH.email), 'jane@example.com');
    fireEvent.changeText(utils.getByPlaceholderText(PH.phone), '+63912345678');
    fireEvent.press(utils.getByText(PH.dob));
    fireEvent.press(utils.getByTestId('date-picker-confirm'));
    fireEvent.changeText(utils.getAllByPlaceholderText(PH.password)[0], 'abc');
    await act(async () => { fireEvent.press(utils.getByText('Sign Up')); });
    expect(utils.getByText('Password must be at least 6 characters.')).toBeTruthy();
  });

  it('shows "Passwords do not match" when confirm password differs', async () => {
    const utils = render(<CreateAccountScreen />);
    fireEvent.changeText(utils.getByPlaceholderText(PH.name),  'Jane Doe');
    fireEvent.changeText(utils.getByPlaceholderText(PH.email), 'jane@example.com');
    fireEvent.changeText(utils.getByPlaceholderText(PH.phone), '+63912345678');
    fireEvent.press(utils.getByText(PH.dob));
    fireEvent.press(utils.getByTestId('date-picker-confirm'));
    const pwInputs = utils.getAllByPlaceholderText(PH.password);
    fireEvent.changeText(pwInputs[0], 'Password1');
    fireEvent.changeText(pwInputs[1], 'Different1');
    await act(async () => { fireEvent.press(utils.getByText('Sign Up')); });
    expect(utils.getByText('Passwords do not match.')).toBeTruthy();
  });
});

// ── Date of Birth Picker ──────────────────────────────────────────────────────

describe('CreateAccountScreen — date of birth picker', () => {
  it('opens the DatePickerModal when the DOB button is pressed', () => {
    const { getByText, getByTestId } = render(<CreateAccountScreen />);
    fireEvent.press(getByText(PH.dob));
    expect(getByTestId('date-picker-modal')).toBeTruthy();
  });

  it('displays the selected date after the picker is confirmed', () => {
    const { getByText, getByTestId } = render(<CreateAccountScreen />);
    fireEvent.press(getByText(PH.dob));
    fireEvent.press(getByTestId('date-picker-confirm'));
    // Jan 1 2000 formatted via toLocaleDateString('en-US', ...)
    expect(getByText('January 1, 2000')).toBeTruthy();
  });
});

// ── Sign Up — Success ─────────────────────────────────────────────────────────

describe('CreateAccountScreen — sign up success', () => {
  it('calls supabase.auth.signUp with sanitized name, email, and phone', async () => {
    const utils = render(<CreateAccountScreen />);
    // Use dirty inputs to verify sanitizers are applied
    fireEvent.changeText(utils.getByPlaceholderText(PH.name),  '  Jane Doe  ');
    fireEvent.changeText(utils.getByPlaceholderText(PH.email), '  JANE@EXAMPLE.COM  ');
    fireEvent.changeText(utils.getByPlaceholderText(PH.phone), '091abc234567');
    fireEvent.press(utils.getByText(PH.dob));
    fireEvent.press(utils.getByTestId('date-picker-confirm'));
    const pwInputs = utils.getAllByPlaceholderText(PH.password);
    fireEvent.changeText(pwInputs[0], 'Password1');
    fireEvent.changeText(pwInputs[1], 'Password1');

    await act(async () => { fireEvent.press(utils.getByText('Sign Up')); });

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email:    'jane@example.com',
        password: 'Password1',
        options: expect.objectContaining({
          data: expect.objectContaining({
            full_name: 'Jane Doe',
            phone:     '091234567',
          }),
        }),
      })
    );
  });

  it('navigates to /(tabs) after a successful sign up', async () => {
    const utils = render(<CreateAccountScreen />);
    await fillAllFields(utils);
    await act(async () => { fireEvent.press(utils.getByText('Sign Up')); });
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });
});

// ── Sign Up — Failure ─────────────────────────────────────────────────────────

describe('CreateAccountScreen — sign up failure', () => {
  it('displays the auth error message when sign up fails', async () => {
    (mockSupabase.auth.signUp as jest.Mock).mockResolvedValue({
      error: { message: 'Email already in use' },
    });
    const utils = render(<CreateAccountScreen />);
    await fillAllFields(utils);
    await act(async () => { fireEvent.press(utils.getByText('Sign Up')); });
    await waitFor(() => {
      expect(utils.getByText('Email already in use')).toBeTruthy();
    });
  });
});

// ── Loading State ─────────────────────────────────────────────────────────────

describe('CreateAccountScreen — loading state', () => {
  it('shows a loading indicator while sign up is in progress', async () => {
    let resolveSignUp!: () => void;
    (mockSupabase.auth.signUp as jest.Mock).mockReturnValue(
      new Promise(resolve => { resolveSignUp = () => resolve({ error: null }); })
    );
    const utils = render(<CreateAccountScreen />);
    await fillAllFields(utils);
    fireEvent.press(utils.getByText('Sign Up'));

    await waitFor(() => {
      expect(utils.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });

    await act(async () => { resolveSignUp(); });
  });
});

// ── Navigation & Error Clearing ───────────────────────────────────────────────

describe('CreateAccountScreen — navigation and error clearing', () => {
  it('navigates to /login-form when the Log In link is pressed', () => {
    const { getByText } = render(<CreateAccountScreen />);
    fireEvent.press(getByText('Log In'));
    expect(mockRouter.push).toHaveBeenCalledWith('/login-form');
  });

  it('clears the error when the user starts typing in any field', async () => {
    const utils = render(<CreateAccountScreen />);
    // Trigger an error first
    await act(async () => { fireEvent.press(utils.getByText('Sign Up')); });
    expect(utils.getByText('Full name is required.')).toBeTruthy();

    // Start typing — error should clear
    fireEvent.changeText(utils.getByPlaceholderText(PH.name), 'J');
    expect(utils.queryByText('Full name is required.')).toBeNull();
  });
});
