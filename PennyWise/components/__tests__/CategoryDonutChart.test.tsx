import React from 'react';
import { render } from '@testing-library/react-native';
import CategoryDonutChart from '../CategoryDonutChart';
import { LIGHT, DARK } from '@/contexts/AppTheme';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: any) => <View testID="svg">{children}</View>,
    Path:    (props: any) => <View testID="svg-path" />,
  };
});

jest.mock('@/contexts/AppTheme', () => {
  const LIGHT = {
    isDark: false,
    textPrimary:   '#0F1F17',
    textSecondary: '#4A6355',
    textMuted:     '#8FAF9A',
    divider:       '#E0EDE6',
    headerBg:      '#1B3D2B',
    cardBg:        '#FFFFFF',
    surface:       '#F2F8F4',
    iconBtnBg:     'rgba(255,255,255,0.18)',
    iconBtnColor:  '#FFFFFF',
    tabBarBg:      '#FFFFFF',
    tabBarInactive:'#8FAF9A',
    inputBg:       '#F2F8F4',
    inputBorder:   '#C8DDD2',
    modalBg:       '#FFFFFF',
    confirmBg:     '#FFFFFF',
    statusBar:     'light',
  };
  const DARK = { ...LIGHT, isDark: true };
  return { LIGHT, DARK };
});

jest.mock('@/constants/fonts', () => ({
  Font: {
    headerBold:   'LeagueSpartan_700Bold',
    bodyRegular:  'KumbhSans_400Regular',
    bodyMedium:   'KumbhSans_500Medium',
    bodySemiBold: 'KumbhSans_600SemiBold',
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const THEME = LIGHT as any;

const SLICES = [
  { label: 'Food',      value: 3000, color: '#22C55E' },
  { label: 'Transport', value: 2000, color: '#4895EF' },
  { label: 'Shopping',  value: 1000, color: '#F59E0B' },
];

// ── No data ───────────────────────────────────────────────────────────────────

describe('CategoryDonutChart — no data', () => {
  it('renders without crashing when slices is empty', () => {
    const { toJSON } = render(
      <CategoryDonutChart slices={[]} total={0} theme={THEME} />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('shows "No data yet" when slices is empty', () => {
    const { getByText } = render(
      <CategoryDonutChart slices={[]} total={0} theme={THEME} />
    );
    expect(getByText('No data yet')).toBeTruthy();
  });

  it('renders an empty-state path when slices is empty', () => {
    const { getAllByTestId } = render(
      <CategoryDonutChart slices={[]} total={0} theme={THEME} />
    );
    expect(getAllByTestId('svg-path').length).toBeGreaterThan(0);
  });
});

// ── With data ─────────────────────────────────────────────────────────────────

describe('CategoryDonutChart — with slices', () => {
  it('renders without crashing with valid slices', () => {
    const { toJSON } = render(
      <CategoryDonutChart slices={SLICES} total={6000} theme={THEME} />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders one svg-path per slice', () => {
    const { getAllByTestId } = render(
      <CategoryDonutChart slices={SLICES} total={6000} theme={THEME} />
    );
    // Each slice produces one arc path
    expect(getAllByTestId('svg-path').length).toBeGreaterThanOrEqual(SLICES.length);
  });

  it('renders legend labels for each slice', () => {
    const { getByText } = render(
      <CategoryDonutChart slices={SLICES} total={6000} theme={THEME} />
    );
    expect(getByText('Food')).toBeTruthy();
    expect(getByText('Transport')).toBeTruthy();
    expect(getByText('Shopping')).toBeTruthy();
  });
});

// ── Center label ──────────────────────────────────────────────────────────────

describe('CategoryDonutChart — center content', () => {
  it('renders centerAmount when provided', () => {
    const { getByText } = render(
      <CategoryDonutChart slices={SLICES} total={6000} theme={THEME} centerAmount={6000} />
    );
    expect(getByText('TOTAL')).toBeTruthy();
  });

  it('renders centerLabel when provided and no centerAmount', () => {
    const { getByText } = render(
      <CategoryDonutChart slices={SLICES} total={6000} theme={THEME} centerLabel="Income" />
    );
    expect(getByText('Income')).toBeTruthy();
  });

  it('renders neither center section when neither prop is provided', () => {
    const { queryByText } = render(
      <CategoryDonutChart slices={SLICES} total={6000} theme={THEME} />
    );
    expect(queryByText('TOTAL')).toBeNull();
  });
});

// ── Dark theme ────────────────────────────────────────────────────────────────

describe('CategoryDonutChart — dark theme', () => {
  it('renders without crashing in dark theme', () => {
    const { toJSON } = render(
      <CategoryDonutChart slices={SLICES} total={6000} theme={DARK as any} />
    );
    expect(toJSON()).toBeTruthy();
  });
});

// ── Amount formatting ─────────────────────────────────────────────────────────

describe('CategoryDonutChart — amount formatting', () => {
  it('formats amounts >= 1000 with K suffix in legend', () => {
    const { getByText } = render(
      <CategoryDonutChart
        slices={[{ label: 'Food', value: 3000, color: '#22C55E' }]}
        total={3000}
        theme={THEME}
      />
    );
    expect(getByText('₱3.0K')).toBeTruthy();
  });

  it('formats amounts >= 1M with M suffix in legend', () => {
    const { getByText } = render(
      <CategoryDonutChart
        slices={[{ label: 'Big', value: 2_000_000, color: '#22C55E' }]}
        total={2_000_000}
        theme={THEME}
      />
    );
    expect(getByText('₱2.0M')).toBeTruthy();
  });
});
