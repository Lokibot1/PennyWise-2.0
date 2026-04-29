import React from 'react';
import { render } from '@testing-library/react-native';
import { DraftSaveIndicator } from '../DraftSaveIndicator';

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => <Text testID="icon">{name}</Text>,
  };
});

jest.mock('@/constants/fonts', () => ({
  Font: {
    bodyRegular:  'KumbhSans_400Regular',
    bodySemiBold: 'KumbhSans_600SemiBold',
  },
}));

// ── idle ─────────────────────────────────────────────────────────────────────

describe('DraftSaveIndicator — idle', () => {
  it('renders nothing when status is "idle"', () => {
    const { toJSON } = render(<DraftSaveIndicator status="idle" />);
    expect(toJSON()).toBeNull();
  });
});

// ── saving ────────────────────────────────────────────────────────────────────

describe('DraftSaveIndicator — saving', () => {
  it('renders without crashing when status is "saving"', () => {
    const { toJSON } = render(<DraftSaveIndicator status="saving" />);
    expect(toJSON()).toBeTruthy();
  });

  it('shows "Saving…" text', () => {
    const { getByText } = render(<DraftSaveIndicator status="saving" />);
    expect(getByText('Saving…')).toBeTruthy();
  });

  it('renders the ellipsis-horizontal icon', () => {
    const { getByTestId } = render(<DraftSaveIndicator status="saving" />);
    expect(getByTestId('icon').props.children).toBe('ellipsis-horizontal');
  });
});

// ── saved ─────────────────────────────────────────────────────────────────────

describe('DraftSaveIndicator — saved', () => {
  it('renders without crashing when status is "saved"', () => {
    const { toJSON } = render(<DraftSaveIndicator status="saved" />);
    expect(toJSON()).toBeTruthy();
  });

  it('shows "Draft saved" text', () => {
    const { getByText } = render(<DraftSaveIndicator status="saved" />);
    expect(getByText('Draft saved')).toBeTruthy();
  });

  it('renders the checkmark-circle icon', () => {
    const { getByTestId } = render(<DraftSaveIndicator status="saved" />);
    expect(getByTestId('icon').props.children).toBe('checkmark-circle');
  });
});
