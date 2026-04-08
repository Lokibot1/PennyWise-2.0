import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemedText } from '../themed-text';

jest.mock('@/hooks/use-theme-color', () => ({
  useThemeColor: jest.fn((_: any, key: string) => key === 'text' ? '#0F1F17' : '#fff'),
}));

import { useThemeColor } from '@/hooks/use-theme-color';
const mockUseThemeColor = useThemeColor as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('ThemedText — rendering', () => {
  it('renders its children', () => {
    const { getByText } = render(<ThemedText>Hello</ThemedText>);
    expect(getByText('Hello')).toBeTruthy();
  });

  it('applies the text color from useThemeColor', () => {
    mockUseThemeColor.mockReturnValue('#123456');
    const { getByText } = render(<ThemedText>Colored</ThemedText>);
    const styles = [getByText('Colored').props.style].flat();
    expect(styles).toEqual(expect.arrayContaining([expect.objectContaining({ color: '#123456' })]));
  });

  it('passes lightColor and darkColor to useThemeColor', () => {
    render(<ThemedText lightColor="#fff" darkColor="#000">Test</ThemedText>);
    expect(mockUseThemeColor).toHaveBeenCalledWith({ light: '#fff', dark: '#000' }, 'text');
  });
});

describe('ThemedText — type variants', () => {
  const CASES: Array<[React.ComponentProps<typeof ThemedText>['type'], number]> = [
    ['default',         16],
    ['defaultSemiBold', 16],
    ['title',           32],
    ['subtitle',        20],
    ['link',            16],
  ];

  CASES.forEach(([type, expectedFontSize]) => {
    it(`type="${type}" applies fontSize ${expectedFontSize}`, () => {
      const { getByText } = render(<ThemedText type={type}>T</ThemedText>);
      const styles = [getByText('T').props.style].flat();
      const sizeStyle = styles.find((s: any) => s?.fontSize !== undefined);
      expect(sizeStyle?.fontSize).toBe(expectedFontSize);
    });
  });

  it('defaults to type="default" when no type is provided', () => {
    const { getByText } = render(<ThemedText>Default</ThemedText>);
    const styles = [getByText('Default').props.style].flat();
    const sizeStyle = styles.find((s: any) => s?.fontSize !== undefined);
    expect(sizeStyle?.fontSize).toBe(16);
  });
});
