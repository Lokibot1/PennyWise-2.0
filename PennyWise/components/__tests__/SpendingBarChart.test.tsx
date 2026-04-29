import React from 'react';
import { render } from '@testing-library/react-native';
import SpendingBarChart from '../SpendingBarChart';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-svg', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default:    ({ children }: any) => <View testID="svg">{children}</View>,
    G:          ({ children }: any) => <View testID="g">{children}</View>,
    Line:       (props: any)        => <View testID="line" />,
    Rect:       (props: any)        => <View testID="rect" />,
    Text:       ({ children }: any) => <Text testID="svg-text">{children}</Text>,
  };
});

jest.mock('@/constants/fonts', () => ({
  Font: { bodyRegular: 'KumbhSans_400Regular' },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const THEME = {
  isDark:        false,
  textPrimary:   '#0F1F17',
  textSecondary: '#4A6355',
  textMuted:     '#8FAF9A',
  divider:       '#E0EDE6',
} as any;

const DATA = [
  { label: 'Jan', income: 15000, expense: 8000 },
  { label: 'Feb', income: 12000, expense: 9000 },
  { label: 'Mar', income: 18000, expense: 7000 },
];

// ── Empty data ────────────────────────────────────────────────────────────────

describe('SpendingBarChart — empty data', () => {
  it('renders without crashing when data is empty', () => {
    const { toJSON } = render(<SpendingBarChart data={[]} theme={THEME} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the svg container even with no data', () => {
    const { getByTestId } = render(<SpendingBarChart data={[]} theme={THEME} />);
    expect(getByTestId('svg')).toBeTruthy();
  });
});

// ── With data ─────────────────────────────────────────────────────────────────

describe('SpendingBarChart — with data', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<SpendingBarChart data={DATA} theme={THEME} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders one group of bars per data point', () => {
    const { getAllByTestId } = render(<SpendingBarChart data={DATA} theme={THEME} />);
    // Each month renders 2 Rect bars (income + expense)
    expect(getAllByTestId('rect').length).toBe(DATA.length * 2);
  });

  it('renders gridlines', () => {
    const { getAllByTestId } = render(<SpendingBarChart data={DATA} theme={THEME} />);
    expect(getAllByTestId('line').length).toBeGreaterThan(0);
  });

  it('renders month labels', () => {
    const { getAllByTestId } = render(<SpendingBarChart data={DATA} theme={THEME} />);
    // svg-text elements include Y-axis labels and month labels
    expect(getAllByTestId('svg-text').length).toBeGreaterThan(0);
  });
});

// ── Legend ────────────────────────────────────────────────────────────────────

describe('SpendingBarChart — legend', () => {
  it('shows "Income" legend entry', () => {
    const { getByText } = render(<SpendingBarChart data={DATA} theme={THEME} />);
    expect(getByText('Income')).toBeTruthy();
  });

  it('shows "Expenses" legend entry', () => {
    const { getByText } = render(<SpendingBarChart data={DATA} theme={THEME} />);
    expect(getByText('Expenses')).toBeTruthy();
  });
});

// ── Single data point ─────────────────────────────────────────────────────────

describe('SpendingBarChart — single data point', () => {
  it('renders correctly with a single month', () => {
    const { getByTestId } = render(
      <SpendingBarChart data={[{ label: 'Apr', income: 5000, expense: 3000 }]} theme={THEME} />
    );
    expect(getByTestId('svg')).toBeTruthy();
  });
});

// ── Zero values ───────────────────────────────────────────────────────────────

describe('SpendingBarChart — zero values', () => {
  it('renders without crashing when all values are 0', () => {
    const zeroData = [{ label: 'Apr', income: 0, expense: 0 }];
    const { toJSON } = render(<SpendingBarChart data={zeroData} theme={THEME} />);
    expect(toJSON()).toBeTruthy();
  });
});
