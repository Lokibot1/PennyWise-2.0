import React from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';
import CircularRing from '../CircularRing';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { Ionicons: ({ name }: { name: string }) => <Text testID="icon">{name}</Text> };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE = {
  size:     80,
  stroke:   6,
  color:    '#1B7A4A',
  track:    '#E0EDE6',
  icon:     'wallet-outline',
  iconSize: 24,
};

function renderRing(pct: number, extra: Partial<typeof BASE> = {}) {
  return render(<CircularRing {...BASE} {...extra} pct={pct} />);
}

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('CircularRing — rendering', () => {
  it('renders the icon passed via props', () => {
    const { getByTestId } = renderRing(50);
    expect(getByTestId('icon').props.children).toBe('wallet-outline');
  });

  it('renders the right arc when pct > 0', () => {
    const { getByTestId } = renderRing(25);
    expect(getByTestId('ring-arc-right')).toBeTruthy();
  });

  it('does not render the right arc when pct is 0', () => {
    const { queryByTestId } = renderRing(0);
    expect(queryByTestId('ring-arc-right')).toBeNull();
  });

  it('renders the left arc when pct > 50', () => {
    const { getByTestId } = renderRing(75);
    expect(getByTestId('ring-arc-left')).toBeTruthy();
  });

  it('does not render the left arc when pct is exactly 50', () => {
    const { queryByTestId } = renderRing(50);
    expect(queryByTestId('ring-arc-left')).toBeNull();
  });

  it('does not render the left arc when pct < 50', () => {
    const { queryByTestId } = renderRing(30);
    expect(queryByTestId('ring-arc-left')).toBeNull();
  });

  it('renders both arcs when pct is 100', () => {
    const { getByTestId } = renderRing(100);
    expect(getByTestId('ring-arc-right')).toBeTruthy();
    expect(getByTestId('ring-arc-left')).toBeTruthy();
  });
});

// ── Clamping ──────────────────────────────────────────────────────────────────

describe('CircularRing — pct clamping', () => {
  it('clamps pct below 0 — right arc is hidden', () => {
    const { queryByTestId } = renderRing(-10);
    expect(queryByTestId('ring-arc-right')).toBeNull();
  });

  it('clamps pct above 100 — both arcs are shown as if pct were 100', () => {
    const { getByTestId } = renderRing(150);
    expect(getByTestId('ring-arc-right')).toBeTruthy();
    expect(getByTestId('ring-arc-left')).toBeTruthy();
  });
});

// ── Inner circle background ───────────────────────────────────────────────────

describe('CircularRing — inner background', () => {
  it('uses `color` as the inner circle background by default', () => {
    const { getByTestId } = renderRing(50);
    const style = getByTestId('ring-inner').props.style;
    const flat  = [style].flat();
    expect(flat).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: '#1B7A4A' })])
    );
  });

  it('uses `innerBg` when explicitly provided', () => {
    const { getByTestId } = renderRing(50, { innerBg: '#FF0000' } as any);
    const style = getByTestId('ring-inner').props.style;
    const flat  = [style].flat();
    expect(flat).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: '#FF0000' })])
    );
  });
});
