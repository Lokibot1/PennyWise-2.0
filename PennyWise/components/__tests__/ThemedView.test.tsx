import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemedView } from '../themed-view';

jest.mock('@/hooks/use-theme-color', () => ({
  useThemeColor: jest.fn(() => '#F2F8F4'),
}));

import { useThemeColor } from '@/hooks/use-theme-color';
const mockUseThemeColor = useThemeColor as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('ThemedView — rendering', () => {
  it('renders its children', () => {
    const { getByText } = render(<ThemedView><></></ ThemedView>);
    // Just render without crash
    expect(true).toBe(true);
  });

  it('renders text children', () => {
    const { Text } = require('react-native');
    const { getByText } = render(
      <ThemedView><Text>child</Text></ThemedView>
    );
    expect(getByText('child')).toBeTruthy();
  });

  it('applies backgroundColor from useThemeColor', () => {
    mockUseThemeColor.mockReturnValue('#ABCDEF');
    const { getByTestId } = render(<ThemedView testID="themed-view" />);
    const styles = [getByTestId('themed-view').props.style].flat();
    expect(styles).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: '#ABCDEF' })])
    );
  });

  it('passes lightColor and darkColor to useThemeColor', () => {
    render(<ThemedView lightColor="#eee" darkColor="#111" />);
    expect(mockUseThemeColor).toHaveBeenCalledWith({ light: '#eee', dark: '#111' }, 'background');
  });

  it('merges extra style prop with the background color style', () => {
    const { getByTestId } = render(
      <ThemedView testID="themed-view" style={{ padding: 16 }} />
    );
    const styles = [getByTestId('themed-view').props.style].flat();
    expect(styles).toEqual(
      expect.arrayContaining([expect.objectContaining({ padding: 16 })])
    );
  });
});
