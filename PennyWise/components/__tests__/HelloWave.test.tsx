import React from 'react';
import { render } from '@testing-library/react-native';
import { HelloWave } from '../hello-wave';

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);

describe('HelloWave', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<HelloWave />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the wave emoji', () => {
    const { getByText } = render(<HelloWave />);
    expect(getByText('👋')).toBeTruthy();
  });
});
