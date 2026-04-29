import React from 'react';
import { Platform } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import DatePickerModal from '../DatePickerModal';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Controls what the mock DateTimePicker passes as `selected` to onChange.
// Must be prefixed with "mock" so jest.mock can access it.
let mockPickerSelected: Date | undefined = new Date(2000, 5, 15); // 15 Jun 2000
const mockPickedDate = new Date(2000, 5, 15);

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ onChange, testID }: any) => {
      React.useEffect(() => {
        onChange?.({}, mockPickerSelected);
      }, []);
      return <View testID={testID ?? 'date-time-picker'} />;
    },
  };
});

jest.mock('@/contexts/AppTheme', () => ({
  useAppTheme: () => ({
    theme: {
      modalBg:       '#FFFFFF',
      textPrimary:   '#0F1F17',
      textSecondary: '#4A6355',
      statusBar:     'light',
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
    bodyMedium:   'KumbhSans_500Medium',
    bodySemiBold: 'KumbhSans_600SemiBold',
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE_DATE = new Date(1995, 3, 20); // 20 Apr 1995

function renderModal(overrides: Partial<React.ComponentProps<typeof DatePickerModal>> = {}) {
  const onConfirm = jest.fn();
  const onClose   = jest.fn();
  const utils = render(
    <DatePickerModal
      visible
      value={BASE_DATE}
      onConfirm={onConfirm}
      onClose={onClose}
      {...overrides}
    />
  );
  return { ...utils, onConfirm, onClose };
}

beforeEach(() => jest.clearAllMocks());

// ── Visibility ────────────────────────────────────────────────────────────────

describe('DatePickerModal — visibility', () => {
  it('renders nothing when visible is false (iOS)', () => {
    Platform.OS = 'ios' as any;
    const { queryByText } = renderModal({ visible: false });
    expect(queryByText('Select Date')).toBeNull();
  });

  it('renders nothing when visible is false (Android)', () => {
    Platform.OS = 'android' as any;
    const { toJSON } = renderModal({ visible: false });
    expect(toJSON()).toBeNull();
  });

  it('renders the sheet when visible is true (iOS)', () => {
    Platform.OS = 'ios' as any;
    const { getByText } = renderModal();
    expect(getByText('Select Date')).toBeTruthy();
  });
});

// ── iOS picker ────────────────────────────────────────────────────────────────

describe('DatePickerModal — iOS', () => {
  beforeEach(() => { Platform.OS = 'ios' as any; });

  it('shows the initial date formatted in the badge', () => {
    const { getByText } = renderModal({ value: new Date(1995, 3, 20) });
    expect(getByText('April 20, 1995')).toBeTruthy();
  });

  it('calls onClose when Cancel is pressed', () => {
    const { getByText, onClose } = renderModal();
    fireEvent.press(getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm and onClose when Done is pressed', () => {
    const { getByText, onConfirm, onClose } = renderModal();
    fireEvent.press(getByText('Done'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm with the current draft date when Done is pressed', () => {
    const { getByText, onConfirm } = renderModal();
    fireEvent.press(getByText('Done'));
    expect(onConfirm).toHaveBeenCalledWith(BASE_DATE);
  });

  it('calls onConfirm and onClose when Confirm Date is pressed', () => {
    const { getByText, onConfirm, onClose } = renderModal();
    fireEvent.press(getByText('Confirm Date'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is pressed', () => {
    const { getByTestId, onClose } = renderModal();
    fireEvent.press(getByTestId('date-picker-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose when the inner sheet is pressed', () => {
    const { getByTestId, onClose } = renderModal();
    fireEvent.press(getByTestId('date-picker-sheet'));
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ── Android picker ────────────────────────────────────────────────────────────
// Android now uses a pure-RN custom calendar (no native dialog).

describe('DatePickerModal — Android', () => {
  beforeEach(() => { Platform.OS = 'android' as any; });

  it('shows the initial date in the badge', () => {
    const { getByText } = renderModal();
    expect(getByText('April 20, 1995')).toBeTruthy();
  });

  it('calls onConfirm with the initial date and onClose when Done is pressed', () => {
    const { getByText, onConfirm, onClose } = renderModal();
    fireEvent.press(getByText('Done'));
    expect(onConfirm).toHaveBeenCalledWith(BASE_DATE);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel is pressed', () => {
    const { getByText, onClose } = renderModal();
    fireEvent.press(getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is pressed', () => {
    const { getByTestId, onClose } = renderModal();
    fireEvent.press(getByTestId('date-picker-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
