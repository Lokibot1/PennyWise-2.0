import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MascotChatbot from '../MascotChatbot';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => <Text testID={`icon-${name}`}>{name}</Text>,
  };
});

jest.mock('@/constants/fonts', () => ({
  Font: {
    headerBold:   'LeagueSpartan_700Bold',
    bodyBold:     'KumbhSans_700Bold',
    bodyRegular:  'KumbhSans_400Regular',
    bodySemiBold: 'KumbhSans_600SemiBold',
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
      cardBg:        '#FFFFFF',
      surface:       '#F2F8F4',
      inputBorder:   '#C8DDD2',
    },
  }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
      }),
    },
  },
}));

jest.mock('@/lib/dataCache', () => ({
  DataCache: {
    fetchProfile:           jest.fn().mockResolvedValue({ full_name: 'Alice', budget_limit: 20000 }),
    fetchIncomeSources:     jest.fn().mockResolvedValue([]),
    fetchIncomeCategories:  jest.fn().mockResolvedValue([]),
    fetchExpenses:          jest.fn().mockResolvedValue([]),
    fetchExpenseCategories: jest.fn().mockResolvedValue([]),
    fetchSavingsGoals:      jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@/lib/pennyBrain', () => ({
  buildSnapshot:  jest.fn().mockReturnValue({}),
  processMessage: jest.fn().mockReturnValue('Hoot! Test response.'),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const onClose = jest.fn();
beforeEach(() => onClose.mockClear());

// ── Not visible ───────────────────────────────────────────────────────────────

describe('MascotChatbot — not visible', () => {
  it('renders without crashing when visible=false', () => {
    // Modal with visible=false renders null in the test renderer — just ensure no throw
    expect(() => render(<MascotChatbot visible={false} onClose={onClose} />)).not.toThrow();
  });
});

// ── Visible ───────────────────────────────────────────────────────────────────

describe('MascotChatbot — visible', () => {
  it('renders without crashing when visible=true', () => {
    const { toJSON } = render(<MascotChatbot visible onClose={onClose} />);
    expect(toJSON()).toBeTruthy();
  });

  it('shows the "Penny" header name', () => {
    const { getByText } = render(<MascotChatbot visible onClose={onClose} />);
    expect(getByText('Penny')).toBeTruthy();
  });

  it('shows the greeting message', () => {
    const { getByText } = render(<MascotChatbot visible onClose={onClose} />);
    expect(getByText(/Hoo there/)).toBeTruthy();
  });

  it('shows the close icon button', () => {
    const { getByTestId } = render(<MascotChatbot visible onClose={onClose} />);
    expect(getByTestId('icon-close')).toBeTruthy();
  });

  it('shows the refresh icon button', () => {
    const { getByTestId } = render(<MascotChatbot visible onClose={onClose} />);
    expect(getByTestId('icon-refresh-outline')).toBeTruthy();
  });

  it('calls onClose when the close button is pressed', () => {
    const { getByTestId } = render(<MascotChatbot visible onClose={onClose} />);
    fireEvent.press(getByTestId('icon-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ── Suggestion chips ──────────────────────────────────────────────────────────

describe('MascotChatbot — suggestion chips', () => {
  // Chips render only after loading=false, so findByText (async) is required
  it('shows suggestion chips when only the greeting is present', async () => {
    const { findByText } = render(<MascotChatbot visible onClose={onClose} />);
    await findByText("How's my budget?");
  });

  it('shows the "Show my expenses" suggestion chip', async () => {
    const { findByText } = render(<MascotChatbot visible onClose={onClose} />);
    await findByText('Show my expenses');
  });
});

// ── Input field ───────────────────────────────────────────────────────────────

describe('MascotChatbot — input', () => {
  it('renders the text input', () => {
    const { getByPlaceholderText } = render(
      <MascotChatbot visible onClose={onClose} />
    );
    expect(
      getByPlaceholderText('Ask Penny about your finances…')
    ).toBeTruthy();
  });
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe('MascotChatbot — loading', () => {
  it('eventually shows advisor status after data loads', async () => {
    const { findByText } = render(<MascotChatbot visible onClose={onClose} />);
    await findByText('● Your financial advisor');
  });
});
