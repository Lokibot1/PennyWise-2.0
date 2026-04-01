import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FormInput } from '../form-input';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/contexts/AppTheme', () => ({
  useAppTheme: () => ({
    theme: {
      textSecondary: '#4A6355',
      inputBg: '#F2F8F4',
      inputBorder: '#C8DDD2',
      textMuted: '#8FAF9A',
      textPrimary: '#0F1F17',
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
    bodySemiBold: 'KumbhSans_600SemiBold',
    bodyRegular: 'KumbhSans_400Regular',
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const baseProps = {
  label: 'Email',
  placeholder: 'Enter your email',
  iconName: 'mail-outline' as const,
  value: 'test@example.com',
  onChangeText: jest.fn(),
};

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('FormInput — rendering', () => {
  it('renders the label text', () => {
    const { getByText } = render(<FormInput {...baseProps} />);
    expect(getByText('Email')).toBeTruthy();
  });

  it('renders the placeholder text', () => {
    const { getByPlaceholderText } = render(<FormInput {...baseProps} />);
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
  });

  it('renders the current value', () => {
    const { getByDisplayValue } = render(<FormInput {...baseProps} />);
    expect(getByDisplayValue('test@example.com')).toBeTruthy();
  });

  it('does not render the eye toggle when isPassword is false', () => {
    const { getAllByTestId } = render(<FormInput {...baseProps} isPassword={false} />);
    const icons = getAllByTestId('icon');
    // Only the left field icon should be present — no eye toggle icon
    expect(icons).toHaveLength(1);
  });

  it('renders the eye-off icon by default when isPassword is true', () => {
    const { getAllByTestId } = render(
      <FormInput {...baseProps} isPassword={true} />
    );
    const icons = getAllByTestId('icon');
    const eyeIcon = icons.find(i => i.props.children === 'eye-off-outline');
    expect(eyeIcon).toBeTruthy();
  });
});

// ── Password Visibility Toggle ────────────────────────────────────────────────

describe('FormInput — password visibility toggle', () => {
  it('input is masked by default when isPassword is true', () => {
    const { getByPlaceholderText } = render(
      <FormInput {...baseProps} placeholder="Enter password" isPassword={true} />
    );
    const input = getByPlaceholderText('Enter password');
    expect(input.props.secureTextEntry).toBe(true);
  });

  it('pressing the eye toggle reveals the password', () => {
    const { getByPlaceholderText, getAllByTestId } = render(
      <FormInput {...baseProps} placeholder="Enter password" isPassword={true} />
    );
    const eyeIcon = getAllByTestId('icon').find(i => i.props.children === 'eye-off-outline')!;
    fireEvent.press(eyeIcon);
    expect(getByPlaceholderText('Enter password').props.secureTextEntry).toBe(false);
  });

  it('pressing the eye toggle again re-hides the password', () => {
    const { getByPlaceholderText, getAllByTestId } = render(
      <FormInput {...baseProps} placeholder="Enter password" isPassword={true} />
    );
    const getEyeIcon = () =>
      getAllByTestId('icon').find(
        i => i.props.children === 'eye-off-outline' || i.props.children === 'eye-outline'
      )!;
    fireEvent.press(getEyeIcon());
    fireEvent.press(getEyeIcon());
    expect(getByPlaceholderText('Enter password').props.secureTextEntry).toBe(true);
  });

  it('eye icon changes to eye-outline after toggle', () => {
    const { getAllByTestId } = render(
      <FormInput {...baseProps} isPassword={true} />
    );
    const eyeOffIcon = getAllByTestId('icon').find(i => i.props.children === 'eye-off-outline')!;
    fireEvent.press(eyeOffIcon);
    const eyeIcon = getAllByTestId('icon').find(i => i.props.children === 'eye-outline');
    expect(eyeIcon).toBeTruthy();
  });
});

// ── Text Input Behavior ───────────────────────────────────────────────────────

describe('FormInput — text input behavior', () => {
  it('calls onChangeText when the user types', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <FormInput {...baseProps} onChangeText={onChangeText} />
    );
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'new@mail.com');
    expect(onChangeText).toHaveBeenCalledWith('new@mail.com');
  });

  it('does not call onChangeText when nothing is typed', () => {
    const onChangeText = jest.fn();
    render(<FormInput {...baseProps} onChangeText={onChangeText} />);
    expect(onChangeText).not.toHaveBeenCalled();
  });
});

// ── Edge Cases ────────────────────────────────────────────────────────────────

describe('FormInput — edge cases', () => {
  it('renders with an empty string value', () => {
    const { getByPlaceholderText } = render(
      <FormInput {...baseProps} value="" />
    );
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
  });

  it('renders correctly when isPassword is omitted', () => {
    const { getAllByTestId } = render(<FormInput {...baseProps} />);
    // Only the left field icon — no eye toggle
    expect(getAllByTestId('icon')).toHaveLength(1);
  });
});
