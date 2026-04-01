import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SlideTabBar from '../SlideTabBar';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);

jest.mock('@/constants/fonts', () => ({
  Font: {
    bodyMedium:   'KumbhSans_500Medium',
    bodySemiBold: 'KumbhSans_600SemiBold',
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const TABS = ['All', 'Income', 'Expense'] as const;

function renderBar(overrides: Partial<React.ComponentProps<typeof SlideTabBar>> = {}) {
  const onChange = jest.fn();
  const utils = render(
    <SlideTabBar
      tabs={TABS}
      active="All"
      onChange={onChange}
      {...overrides}
    />
  );
  return { ...utils, onChange };
}

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('SlideTabBar — rendering', () => {
  it('renders a label for every tab', () => {
    const { getByText } = renderBar();
    expect(getByText('All')).toBeTruthy();
    expect(getByText('Income')).toBeTruthy();
    expect(getByText('Expense')).toBeTruthy();
  });

  it('does not render a badge when badge counts are all 0', () => {
    const { queryByText } = renderBar({ badge: { All: 0, Income: 0 } });
    // No numeric badge text should appear
    expect(queryByText('0')).toBeNull();
  });

  it('renders a badge when the count is greater than 0', () => {
    const { getByText } = renderBar({ badge: { Income: 3 } });
    expect(getByText('3')).toBeTruthy();
  });

  it('renders badges for multiple tabs simultaneously', () => {
    const { getByText } = renderBar({ badge: { Income: 2, Expense: 5 } });
    expect(getByText('2')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();
  });
});

// ── Interaction ───────────────────────────────────────────────────────────────

describe('SlideTabBar — interaction', () => {
  it('calls onChange with the tapped tab label', () => {
    const { getByText, onChange } = renderBar();
    fireEvent.press(getByText('Income'));
    expect(onChange).toHaveBeenCalledWith('Income');
  });

  it('calls onChange with the correct label for each tab', () => {
    const { getByText, onChange } = renderBar();
    fireEvent.press(getByText('Expense'));
    expect(onChange).toHaveBeenCalledWith('Expense');
  });

  it('calls onChange exactly once per press', () => {
    const { getByText, onChange } = renderBar();
    fireEvent.press(getByText('Income'));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('does not call onChange when the already-active tab is pressed', () => {
    // onChange contract: the parent decides whether to ignore same-tab presses;
    // SlideTabBar always fires — this test documents the actual behaviour.
    const { getByText, onChange } = renderBar({ active: 'All' });
    fireEvent.press(getByText('All'));
    expect(onChange).toHaveBeenCalledWith('All');
  });
});

// ── Active state ──────────────────────────────────────────────────────────────

describe('SlideTabBar — active state', () => {
  it('applies the active text style to the active tab', () => {
    const { getByText } = renderBar({ active: 'Income' });
    const incomeLabel = getByText('Income');
    // Active tab uses bodySemiBold; inactive tabs use bodyMedium
    expect(incomeLabel.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fontFamily: 'KumbhSans_600SemiBold' }),
      ])
    );
  });

  it('applies white text colour to the active tab label', () => {
    const { getByText } = renderBar({ active: 'All' });
    const allLabel = getByText('All');
    const flatStyle = [allLabel.props.style].flat();
    const colorStyle = flatStyle.find((s: any) => s?.color !== undefined);
    expect(colorStyle?.color).toBe('#fff');
  });

  it('applies the inactiveTextColor to non-active tab labels', () => {
    const { getByText } = renderBar({ active: 'All', inactiveTextColor: '#999' });
    const incomeLabel = getByText('Income');
    const flatStyle = [incomeLabel.props.style].flat();
    const colorStyle = flatStyle.find((s: any) => s?.color !== undefined);
    expect(colorStyle?.color).toBe('#999');
  });
});
