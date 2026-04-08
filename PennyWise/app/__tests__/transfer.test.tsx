import React from 'react';
import { render } from '@testing-library/react-native';
import TransferScreen from '../(tabs)/transfer';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/constants/fonts', () => ({
  Font: { headerBlack: 'X', headerBold: 'X', bodyRegular: 'X', bodySemiBold: 'X', bodyMedium: 'X' },
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TransferScreen', () => {
  it('renders the Transfer heading', () => {
    const { getByText } = render(<TransferScreen />);
    expect(getByText('Transfer')).toBeTruthy();
  });

  it('renders the coming soon subtitle', () => {
    const { getByText } = render(<TransferScreen />);
    expect(getByText('Coming soon')).toBeTruthy();
  });
});
