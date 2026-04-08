import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ErrorModal from '../ErrorModal';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/contexts/AppTheme', () => ({
  useAppTheme: () => ({
    theme: {
      modalBg:       '#FFFFFF',
      textPrimary:   '#0F1F17',
      textSecondary: '#4A6355',
      divider:       '#E0EDE6',
    },
  }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: ({ name }: { name: string }) => <Text testID="icon">{name}</Text> };
});

jest.mock('@/constants/fonts', () => ({
  Font: {
    headerBold:   'LeagueSpartan_700Bold',
    bodyRegular:  'KumbhSans_400Regular',
    bodySemiBold: 'KumbhSans_600SemiBold',
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_PROPS = {
  visible:  true,
  onClose:  jest.fn(),
  title:    'Something went wrong',
  message:  'Please try again later.',
};

beforeEach(() => jest.clearAllMocks());

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('ErrorModal — rendering', () => {
  it('renders nothing when visible is false', () => {
    const { queryByText } = render(<ErrorModal {...DEFAULT_PROPS} visible={false} />);
    expect(queryByText('Something went wrong')).toBeNull();
  });

  it('renders the title when visible is true', () => {
    const { getByText } = render(<ErrorModal {...DEFAULT_PROPS} />);
    expect(getByText('Something went wrong')).toBeTruthy();
  });

  it('renders the message when visible is true', () => {
    const { getByText } = render(<ErrorModal {...DEFAULT_PROPS} />);
    expect(getByText('Please try again later.')).toBeTruthy();
  });

  it('renders the "Got it" dismiss button', () => {
    const { getByText } = render(<ErrorModal {...DEFAULT_PROPS} />);
    expect(getByText('Got it')).toBeTruthy();
  });
});

// ── Props ─────────────────────────────────────────────────────────────────────

describe('ErrorModal — props', () => {
  it('renders a custom title passed via props', () => {
    const { getByText } = render(<ErrorModal {...DEFAULT_PROPS} title="Network Error" />);
    expect(getByText('Network Error')).toBeTruthy();
  });

  it('renders a custom message passed via props', () => {
    const { getByText } = render(
      <ErrorModal {...DEFAULT_PROPS} message="Check your connection." />
    );
    expect(getByText('Check your connection.')).toBeTruthy();
  });
});

// ── Dismiss interactions ──────────────────────────────────────────────────────

describe('ErrorModal — dismiss interactions', () => {
  it('calls onClose when the "Got it" button is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(<ErrorModal {...DEFAULT_PROPS} onClose={onClose} />);
    fireEvent.press(getByText('Got it'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<ErrorModal {...DEFAULT_PROPS} onClose={onClose} />);
    fireEvent.press(getByTestId('error-modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose when the inner sheet is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<ErrorModal {...DEFAULT_PROPS} onClose={onClose} />);
    fireEvent.press(getByTestId('error-modal-sheet'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when the hardware back button fires (onRequestClose)', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<ErrorModal {...DEFAULT_PROPS} onClose={onClose} />);
    fireEvent(getByTestId('error-modal-backdrop'), 'requestClose');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
