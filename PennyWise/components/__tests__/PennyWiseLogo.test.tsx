import React from 'react';
import { render } from '@testing-library/react-native';
import { PennyWiseLogo, PennyWiseTextLogo } from '../penny-wise-logo';

jest.mock('@/constants/fonts', () => ({
  Font: {
    headerBlack: 'LeagueSpartan_900Black',
    headerBold:  'LeagueSpartan_700Bold',
  },
}));

// Mock the logo image asset
jest.mock('@/assets/images/logo.jpg', () => 1, { virtual: true });

describe('PennyWiseLogo — rendering', () => {
  it('renders without crashing at default size', () => {
    const { toJSON } = render(<PennyWiseLogo />);
    expect(toJSON()).toBeTruthy();
  });

  (['xs', 'sm', 'md', 'lg'] as const).forEach(size => {
    it(`renders at size="${size}"`, () => {
      const { toJSON } = render(<PennyWiseLogo size={size} />);
      expect(toJSON()).toBeTruthy();
    });
  });
});

describe('PennyWiseTextLogo — rendering', () => {
  it('renders the "P" and "W" large letters', () => {
    const { getByText } = render(<PennyWiseTextLogo />);
    expect(getByText('P')).toBeTruthy();
    expect(getByText('W')).toBeTruthy();
  });

  it('renders the "ENNY" and "ISE" word fragments', () => {
    const { getByText } = render(<PennyWiseTextLogo />);
    expect(getByText('ENNY')).toBeTruthy();
    expect(getByText('ISE')).toBeTruthy();
  });

  it('applies custom color to the letters', () => {
    const { getByText } = render(<PennyWiseTextLogo color="#123456" />);
    const styles = [getByText('P').props.style].flat();
    expect(styles).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: '#123456' })])
    );
  });

  (['sm', 'md', 'lg'] as const).forEach(size => {
    it(`renders at size="${size}"`, () => {
      const { toJSON } = render(<PennyWiseTextLogo size={size} />);
      expect(toJSON()).toBeTruthy();
    });
  });
});
