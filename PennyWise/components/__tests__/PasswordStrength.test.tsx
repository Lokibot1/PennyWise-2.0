import React from 'react';
import { render } from '@testing-library/react-native';
import { PasswordStrength } from '../password-strength';

// ── Mocks ─────────────────────────────────────────────────────────────────────

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

// ── Null Guard ────────────────────────────────────────────────────────────────

describe('PasswordStrength — null guard', () => {
  it('renders nothing when password is empty string', () => {
    const { toJSON } = render(<PasswordStrength password="" />);
    expect(toJSON()).toBeNull();
  });
});

// ── Strength Bar & Label ──────────────────────────────────────────────────────

describe('PasswordStrength — strength label', () => {
  it('shows "Weak" label when only 1 rule is met', () => {
    // meets: length only — 8 non-letter, non-digit chars
    const { getByText } = render(<PasswordStrength password="!@#$!@#$" />);
    expect(getByText('Weak')).toBeTruthy();
  });

  it('shows "Fair" label when 2 rules are met', () => {
    // meets: length + uppercase only — no lowercase, no digits
    const { getByText } = render(<PasswordStrength password="ABCDEFGH" />);
    expect(getByText('Fair')).toBeTruthy();
  });

  it('shows "Good" label when 3 rules are met', () => {
    // meets: length + uppercase + lowercase — no digits
    const { getByText } = render(<PasswordStrength password="ABCDEFGh" />);
    expect(getByText('Good')).toBeTruthy();
  });

  it('shows "Strong" label when all 4 rules are met', () => {
    // meets: length + uppercase + lowercase + number
    const { getByText } = render(<PasswordStrength password="Abcdefg1" />);
    expect(getByText('Strong')).toBeTruthy();
  });

  it('shows no strength label when no rules are met', () => {
    // "!" is 1 char, no letters, no digits — 0 rules met
    const { queryByText } = render(<PasswordStrength password="!" />);
    expect(queryByText('Weak')).toBeNull();
    expect(queryByText('Fair')).toBeNull();
    expect(queryByText('Good')).toBeNull();
    expect(queryByText('Strong')).toBeNull();
  });
});

// ── Rule Checklist ────────────────────────────────────────────────────────────

describe('PasswordStrength — rule checklist', () => {
  it('shows all 4 rule labels', () => {
    const { getByText } = render(<PasswordStrength password="a" />);
    expect(getByText('At least 8 characters')).toBeTruthy();
    expect(getByText('Uppercase letter (A–Z)')).toBeTruthy();
    expect(getByText('Lowercase letter (a–z)')).toBeTruthy();
    expect(getByText('Contains a number (0–9)')).toBeTruthy();
  });

  it('marks the length rule as met when password has 8+ characters', () => {
    // "aaaaaaaa" = 8 chars, lowercase only — length rule met
    const { getAllByTestId } = render(<PasswordStrength password="aaaaaaaa" />);
    const checks = getAllByTestId('icon').filter(i => i.props.children === 'checkmark-circle');
    expect(checks.length).toBeGreaterThanOrEqual(1);
  });

  it('marks the uppercase rule as met when password contains an uppercase letter', () => {
    // "A" — only uppercase rule met
    const { getAllByTestId } = render(<PasswordStrength password="A" />);
    const checks = getAllByTestId('icon').filter(i => i.props.children === 'checkmark-circle');
    expect(checks.length).toBeGreaterThanOrEqual(1);
  });

  it('marks the lowercase rule as met when password contains a lowercase letter', () => {
    // "a" — only lowercase rule met
    const { getAllByTestId } = render(<PasswordStrength password="a" />);
    const checks = getAllByTestId('icon').filter(i => i.props.children === 'checkmark-circle');
    expect(checks.length).toBeGreaterThanOrEqual(1);
  });

  it('marks the number rule as met when password contains a digit', () => {
    // "1" — only number rule met
    const { getAllByTestId } = render(<PasswordStrength password="1" />);
    const checks = getAllByTestId('icon').filter(i => i.props.children === 'checkmark-circle');
    expect(checks.length).toBeGreaterThanOrEqual(1);
  });

  it('shows all rules as unmet for a password satisfying none', () => {
    // "!" — no rule satisfied
    const { getAllByTestId } = render(<PasswordStrength password="!" />);
    const icons = getAllByTestId('icon').map(i => i.props.children);
    expect(icons.every(name => name === 'ellipse-outline')).toBe(true);
  });

  it('shows all rules as met for a fully strong password', () => {
    // "Abcdefg1" — all 4 rules met
    const { getAllByTestId } = render(<PasswordStrength password="Abcdefg1" />);
    const icons = getAllByTestId('icon').map(i => i.props.children);
    expect(icons.every(name => name === 'checkmark-circle')).toBe(true);
  });
});
