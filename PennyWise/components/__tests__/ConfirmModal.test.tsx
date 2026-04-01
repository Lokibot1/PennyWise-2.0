import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ConfirmModal from '../ConfirmModal';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/contexts/AppTheme', () => ({
  useAppTheme: () => ({
    theme: {
      modalBg:       '#FFFFFF',
      divider:       '#E0EDE6',
      textPrimary:   '#0F1F17',
      textSecondary: '#4A6355',
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
    headerBold:    'LeagueSpartan_700Bold',
    bodyRegular:   'KumbhSans_400Regular',
    bodySemiBold:  'KumbhSans_600SemiBold',
    bodyMedium:    'KumbhSans_500Medium',
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const baseProps = {
  visible:   true,
  onClose:   jest.fn(),
  onConfirm: jest.fn(),
  title:     'Delete entry',
  message:   'This action cannot be undone.',
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Visibility ────────────────────────────────────────────────────────────────

describe('ConfirmModal — visibility', () => {
  it('renders nothing when visible is false', () => {
    const { queryByText } = render(<ConfirmModal {...baseProps} visible={false} />);
    expect(queryByText('Delete entry')).toBeNull();
  });

  it('renders content when visible is true', () => {
    const { getByText } = render(<ConfirmModal {...baseProps} />);
    expect(getByText('Delete entry')).toBeTruthy();
  });
});

// ── Content ───────────────────────────────────────────────────────────────────

describe('ConfirmModal — content', () => {
  it('renders the title text', () => {
    const { getByText } = render(<ConfirmModal {...baseProps} />);
    expect(getByText('Delete entry')).toBeTruthy();
  });

  it('renders the message text', () => {
    const { getByText } = render(<ConfirmModal {...baseProps} />);
    expect(getByText('This action cannot be undone.')).toBeTruthy();
  });

  it('renders "Confirm" as the default confirm button label', () => {
    const { getByText } = render(<ConfirmModal {...baseProps} />);
    expect(getByText('Confirm')).toBeTruthy();
  });

  it('renders a custom confirmLabel when provided', () => {
    const { getByText } = render(<ConfirmModal {...baseProps} confirmLabel="Delete" />);
    expect(getByText('Delete')).toBeTruthy();
  });

  it('renders the Cancel button', () => {
    const { getByText } = render(<ConfirmModal {...baseProps} />);
    expect(getByText('Cancel')).toBeTruthy();
  });
});

// ── Confirm Action ────────────────────────────────────────────────────────────

describe('ConfirmModal — confirm action', () => {
  it('calls onConfirm when the confirm button is pressed', () => {
    const onConfirm = jest.fn();
    const { getByText } = render(<ConfirmModal {...baseProps} onConfirm={onConfirm} />);
    fireEvent.press(getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when the confirm button is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(<ConfirmModal {...baseProps} onClose={onClose} />);
    fireEvent.press(getByText('Confirm'));
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ── Cancel / Dismiss ──────────────────────────────────────────────────────────

describe('ConfirmModal — cancel and dismiss', () => {
  it('calls onClose when the Cancel button is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(<ConfirmModal {...baseProps} onClose={onClose} />);
    fireEvent.press(getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onConfirm when Cancel is pressed', () => {
    const onConfirm = jest.fn();
    const { getByText } = render(<ConfirmModal {...baseProps} onConfirm={onConfirm} />);
    fireEvent.press(getByText('Cancel'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onClose when the backdrop overlay is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <ConfirmModal {...baseProps} onClose={onClose} />
    );
    fireEvent.press(getByTestId('confirm-modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ── Prop Defaults ─────────────────────────────────────────────────────────────

describe('ConfirmModal — prop defaults', () => {
  it('uses "alert-circle-outline" as the default icon', () => {
    const { getAllByTestId } = render(<ConfirmModal {...baseProps} />);
    const icons = getAllByTestId('icon').map(i => i.props.children);
    expect(icons).toContain('alert-circle-outline');
  });

  it('renders a custom icon when the icon prop is provided', () => {
    const { getAllByTestId } = render(
      <ConfirmModal {...baseProps} icon="trash-outline" />
    );
    const icons = getAllByTestId('icon').map(i => i.props.children);
    expect(icons).toContain('trash-outline');
  });
});
