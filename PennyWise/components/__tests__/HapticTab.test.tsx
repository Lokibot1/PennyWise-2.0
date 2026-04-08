import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HapticTab } from '../haptic-tab';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockImpactAsync = jest.fn();

jest.mock('expo-haptics', () => ({
  impactAsync: (...args: any[]) => mockImpactAsync(...args),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('@react-navigation/elements', () => {
  const { TouchableOpacity } = require('react-native');
  return {
    PlatformPressable: ({ onPressIn, testID, children, ...rest }: any) => (
      <TouchableOpacity
        testID={testID ?? 'platform-pressable'}
        onPress={(e: any) => onPressIn?.(e)}
        {...rest}
      >
        {children}
      </TouchableOpacity>
    ),
  };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

beforeEach(() => jest.clearAllMocks());

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('HapticTab — rendering', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<HapticTab testID="tab" />);
    expect(toJSON()).toBeTruthy();
  });
});

// ── Haptic feedback ───────────────────────────────────────────────────────────

describe('HapticTab — haptic feedback', () => {
  it('triggers haptic feedback on press on iOS', () => {
    (process.env as any).EXPO_OS = 'ios';
    const { getByTestId } = render(<HapticTab testID="tab" />);
    fireEvent.press(getByTestId('tab'));
    expect(mockImpactAsync).toHaveBeenCalledWith('light');
  });

  // Note: the Android branch (process.env.EXPO_OS !== 'ios') is a compile-time
  // constant inlined by Babel — it cannot be toggled at runtime in Jest.

  it('calls the original onPressIn prop', () => {
    const onPressIn = jest.fn();
    const { getByTestId } = render(<HapticTab testID="tab" onPressIn={onPressIn} />);
    fireEvent.press(getByTestId('tab'));
    expect(onPressIn).toHaveBeenCalledTimes(1);
  });
});
