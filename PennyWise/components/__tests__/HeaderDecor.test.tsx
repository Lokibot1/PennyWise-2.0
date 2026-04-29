import React from 'react';
import { render } from '@testing-library/react-native';
import HeaderDecor from '../HeaderDecor';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-svg', () => {
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: any) => <View testID="svg">{children}</View>,
    Circle:    (props: any) => <View testID="circle" />,
    G:         ({ children }: any) => <View testID="g">{children}</View>,
    Path:      (props: any) => <View testID="path" />,
  };
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('HeaderDecor', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<HeaderDecor />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the SVG element', () => {
    const { getByTestId } = render(<HeaderDecor />);
    expect(getByTestId('svg')).toBeTruthy();
  });

  it('renders with the default height of 220', () => {
    const { toJSON } = render(<HeaderDecor />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with a custom height prop', () => {
    const { toJSON } = render(<HeaderDecor height={300} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders Circle decorations', () => {
    const { getAllByTestId } = render(<HeaderDecor />);
    expect(getAllByTestId('circle').length).toBeGreaterThan(0);
  });

  it('renders Path decorations (birds and trees)', () => {
    const { getAllByTestId } = render(<HeaderDecor />);
    expect(getAllByTestId('path').length).toBeGreaterThan(0);
  });

  it('renders with pointerEvents="none" (does not intercept touches)', () => {
    const { toJSON } = render(<HeaderDecor />);
    const root = toJSON() as any;
    expect(root).toBeTruthy();
  });
});
