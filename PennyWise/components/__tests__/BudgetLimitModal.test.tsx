import React from 'react';
import { act, render, fireEvent, waitFor } from '@testing-library/react-native';
import BudgetLimitModal from '../BudgetLimitModal';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/contexts/AppTheme', () => ({
  useAppTheme: () => ({
    theme: {
      modalBg:      '#FFFFFF',
      divider:      '#E0EDE6',
      textPrimary:  '#0F1F17',
      textSecondary:'#4A6355',
      textMuted:    '#8FAF9A',
      surface:      '#F2F8F4',
      inputBorder:  '#C8DDD2',
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
    headerBold:   'LeagueSpartan_700Bold',
    bodyRegular:  'KumbhSans_400Regular',
    bodySemiBold: 'KumbhSans_600SemiBold',
    bodyMedium:   'KumbhSans_500Medium',
  },
}));

jest.mock('@/lib/sfx', () => ({
  sfx: { coin: jest.fn() },
}));

jest.mock('@/components/GlobalLoadingBar', () => ({
  loadingBar: { start: jest.fn(), finish: jest.fn() },
}));

// Mock ConfirmModal — renders actionable buttons when visible so we can
// trigger onConfirm / onClose without testing ConfirmModal internals here.
jest.mock('@/components/ConfirmModal', () => {
  const { TouchableOpacity, Text, View } = require('react-native');
  return ({ visible, onConfirm, onClose }: any) =>
    visible ? (
      <View testID="confirm-modal">
        <TouchableOpacity testID="confirm-modal-confirm" onPress={onConfirm}>
          <Text>Yes, Set Budget</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="confirm-modal-cancel" onPress={onClose}>
          <Text>Cancel Confirm</Text>
        </TouchableOpacity>
      </View>
    ) : null;
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const baseProps = {
  visible:  true,
  current:  20000,
  onClose:  jest.fn(),
  onSave:   jest.fn().mockResolvedValue(undefined),
};

const INPUT_PLACEHOLDER = 'e.g. 20,000.00';

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('BudgetLimitModal — rendering', () => {
  it('renders nothing when visible is false', () => {
    const { queryByText } = render(<BudgetLimitModal {...baseProps} visible={false} />);
    expect(queryByText('Monthly Budget')).toBeNull();
  });

  it('renders content when visible is true', () => {
    const { getByText } = render(<BudgetLimitModal {...baseProps} />);
    expect(getByText('Monthly Budget')).toBeTruthy();
  });

  it('pre-fills the input with the formatted current value on open', () => {
    const { getByDisplayValue } = render(
      <BudgetLimitModal {...baseProps} current={20000} />
    );
    expect(getByDisplayValue('20,000')).toBeTruthy();
  });

  it('renders the Save Budget button', () => {
    const { getByText } = render(<BudgetLimitModal {...baseProps} />);
    expect(getByText('Save Budget')).toBeTruthy();
  });

  it('renders the Cancel button', () => {
    const { getByText } = render(<BudgetLimitModal {...baseProps} />);
    expect(getByText('Cancel')).toBeTruthy();
  });
});

// ── Input & Validation ────────────────────────────────────────────────────────

describe('BudgetLimitModal — input and validation', () => {
  it('formats typed input with thousand-separator commas', () => {
    const { getByPlaceholderText, getByDisplayValue } = render(
      <BudgetLimitModal {...baseProps} current={0} />
    );
    fireEvent.changeText(getByPlaceholderText(INPUT_PLACEHOLDER), '20000');
    expect(getByDisplayValue('20,000')).toBeTruthy();
  });

  it('Save Budget does not open confirm when the input is empty', () => {
    const { getByPlaceholderText, getByText, queryByTestId } = render(
      <BudgetLimitModal {...baseProps} current={0} />
    );
    fireEvent.changeText(getByPlaceholderText(INPUT_PLACEHOLDER), '');
    fireEvent.press(getByText('Save Budget'));
    expect(queryByTestId('confirm-modal')).toBeNull();
  });

  it('Save Budget does not open confirm when the value is zero', () => {
    const { getByPlaceholderText, getByText, queryByTestId } = render(
      <BudgetLimitModal {...baseProps} current={0} />
    );
    fireEvent.changeText(getByPlaceholderText(INPUT_PLACEHOLDER), '0');
    fireEvent.press(getByText('Save Budget'));
    expect(queryByTestId('confirm-modal')).toBeNull();
  });

  it('opens confirm modal when a valid positive number is entered and Save is pressed', () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <BudgetLimitModal {...baseProps} current={0} />
    );
    fireEvent.changeText(getByPlaceholderText(INPUT_PLACEHOLDER), '5000');
    fireEvent.press(getByText('Save Budget'));
    expect(getByTestId('confirm-modal')).toBeTruthy();
  });
});

// ── Cancel ────────────────────────────────────────────────────────────────────

describe('BudgetLimitModal — cancel', () => {
  it('calls onClose when Cancel is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(<BudgetLimitModal {...baseProps} onClose={onClose} />);
    fireEvent.press(getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ── Save Flow ─────────────────────────────────────────────────────────────────

describe('BudgetLimitModal — save flow', () => {
  it('shows the confirmation modal when Save Budget is pressed with valid input', () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <BudgetLimitModal {...baseProps} current={0} />
    );
    fireEvent.changeText(getByPlaceholderText(INPUT_PLACEHOLDER), '15000');
    fireEvent.press(getByText('Save Budget'));
    expect(getByTestId('confirm-modal')).toBeTruthy();
  });

  it('calls onSave with the parsed numeric value after confirmation', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <BudgetLimitModal {...baseProps} current={0} onSave={onSave} />
    );
    fireEvent.changeText(getByPlaceholderText(INPUT_PLACEHOLDER), '15,000');
    fireEvent.press(getByText('Save Budget'));
    await act(async () => {
      fireEvent.press(getByTestId('confirm-modal-confirm'));
    });
    expect(onSave).toHaveBeenCalledWith(15000);
  });

  it('calls onClose after a successful save', async () => {
    const onClose = jest.fn();
    const onSave  = jest.fn().mockResolvedValue(undefined);
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <BudgetLimitModal {...baseProps} current={0} onClose={onClose} onSave={onSave} />
    );
    fireEvent.changeText(getByPlaceholderText(INPUT_PLACEHOLDER), '8000');
    fireEvent.press(getByText('Save Budget'));
    await act(async () => {
      fireEvent.press(getByTestId('confirm-modal-confirm'));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('displays an error message when onSave rejects', async () => {
    const onSave = jest.fn().mockRejectedValue(new Error('Network error'));
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <BudgetLimitModal {...baseProps} current={0} onSave={onSave} />
    );
    fireEvent.changeText(getByPlaceholderText(INPUT_PLACEHOLDER), '8000');
    fireEvent.press(getByText('Save Budget'));
    await act(async () => {
      fireEvent.press(getByTestId('confirm-modal-confirm'));
    });
    await waitFor(() => {
      expect(getByText('Network error')).toBeTruthy();
    });
  });

  it('shows "Saving…" on the button while the save is in progress', async () => {
    let resolveOnSave!: () => void;
    const onSave = jest.fn().mockReturnValue(
      new Promise<void>(resolve => { resolveOnSave = resolve; })
    );
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <BudgetLimitModal {...baseProps} current={0} onSave={onSave} />
    );
    fireEvent.changeText(getByPlaceholderText(INPUT_PLACEHOLDER), '8000');
    fireEvent.press(getByText('Save Budget'));
    fireEvent.press(getByTestId('confirm-modal-confirm'));

    await waitFor(() => {
      expect(getByText('Saving…')).toBeTruthy();
    });

    // Resolve so React can clean up async state
    await act(async () => { resolveOnSave(); });
  });
});

// ── State Reset ───────────────────────────────────────────────────────────────

describe('BudgetLimitModal — state reset', () => {
  it('clears any error message when the modal is reopened', async () => {
    const onSave = jest.fn().mockRejectedValue(new Error('Save failed'));
    const { getByPlaceholderText, getByText, getByTestId, queryByText, rerender } =
      render(<BudgetLimitModal {...baseProps} current={0} onSave={onSave} />);

    // Trigger an error
    fireEvent.changeText(getByPlaceholderText(INPUT_PLACEHOLDER), '8000');
    fireEvent.press(getByText('Save Budget'));
    await act(async () => {
      fireEvent.press(getByTestId('confirm-modal-confirm'));
    });
    await waitFor(() => expect(getByText('Save failed')).toBeTruthy());

    // Close and reopen the modal
    rerender(<BudgetLimitModal {...baseProps} current={0} onSave={onSave} visible={false} />);
    rerender(<BudgetLimitModal {...baseProps} current={0} onSave={onSave} visible={true} />);

    expect(queryByText('Save failed')).toBeNull();
  });
});
