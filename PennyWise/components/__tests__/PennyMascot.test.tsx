import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PennyMascot, { PENNY_TIPS } from '../PennyMascot';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);

jest.mock('@/constants/fonts', () => ({
  Font: {
    bodyBold:    'KumbhSans_700Bold',
    bodyRegular: 'KumbhSans_400Regular',
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const onPress = jest.fn();
beforeEach(() => onPress.mockClear());

// ── PENNY_TIPS export ─────────────────────────────────────────────────────────

describe('PENNY_TIPS', () => {
  it('exports an array', () => {
    expect(Array.isArray(PENNY_TIPS)).toBe(true);
  });

  it('has 8 tips', () => {
    expect(PENNY_TIPS.length).toBe(8);
  });

  it('every tip is a non-empty string', () => {
    PENNY_TIPS.forEach(tip => {
      expect(typeof tip).toBe('string');
      expect(tip.length).toBeGreaterThan(0);
    });
  });
});

// ── bubble variant (default) ──────────────────────────────────────────────────

describe('PennyMascot — bubble variant', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<PennyMascot onPress={onPress} />);
    expect(toJSON()).toBeTruthy();
  });

  it('shows "Penny 🦉" label', () => {
    const { getByText } = render(<PennyMascot onPress={onPress} />);
    expect(getByText('Penny 🦉')).toBeTruthy();
  });

  it('shows a provided tip', () => {
    const { getByText } = render(
      <PennyMascot onPress={onPress} tip="Save more today!" />
    );
    expect(getByText('Save more today!')).toBeTruthy();
  });

  it('falls back to a PENNY_TIPS entry when no tip prop given', () => {
    const { toJSON } = render(<PennyMascot onPress={onPress} />);
    expect(toJSON()).toBeTruthy();
  });
});

// ── icon variant ──────────────────────────────────────────────────────────────

describe('PennyMascot — icon variant', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<PennyMascot onPress={onPress} variant="icon" />);
    expect(toJSON()).toBeTruthy();
  });

  it('does not show the "Penny 🦉" bubble label', () => {
    const { queryByText } = render(
      <PennyMascot onPress={onPress} variant="icon" />
    );
    expect(queryByText('Penny 🦉')).toBeNull();
  });
});

// ── onPress ───────────────────────────────────────────────────────────────────

describe('PennyMascot — onPress', () => {
  it('calls onPress when the bubble label is pressed', () => {
    const { getByText } = render(
      <PennyMascot onPress={onPress} tip="Test tip" />
    );
    fireEvent.press(getByText('Penny 🦉'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

// ── dark prop ─────────────────────────────────────────────────────────────────

describe('PennyMascot — dark prop', () => {
  it('renders without crashing with dark=true', () => {
    const { toJSON } = render(<PennyMascot onPress={onPress} dark />);
    expect(toJSON()).toBeTruthy();
  });

  it('still shows "Penny 🦉" in dark mode', () => {
    const { getByText } = render(<PennyMascot onPress={onPress} dark />);
    expect(getByText('Penny 🦉')).toBeTruthy();
  });
});

// ── size prop ─────────────────────────────────────────────────────────────────

describe('PennyMascot — size prop', () => {
  it('renders with default size (56)', () => {
    const { toJSON } = render(<PennyMascot onPress={onPress} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with a custom size', () => {
    const { toJSON } = render(<PennyMascot onPress={onPress} size={80} />);
    expect(toJSON()).toBeTruthy();
  });
});
