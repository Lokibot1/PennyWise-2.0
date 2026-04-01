import React from 'react';
import { render } from '@testing-library/react-native';
import GlobalLoadingBar, { loadingBar } from '../GlobalLoadingBar';

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);

describe('GlobalLoadingBar — imperative API', () => {
  it('loadingBar.start is a no-op before the component mounts', () => {
    expect(() => loadingBar.start()).not.toThrow();
  });

  it('loadingBar.finish is a no-op before the component mounts', () => {
    expect(() => loadingBar.finish()).not.toThrow();
  });

  it('registers start and finish functions after mounting', () => {
    render(<GlobalLoadingBar />);
    expect(typeof loadingBar.start).toBe('function');
    expect(typeof loadingBar.finish).toBe('function');
  });

  it('loadingBar.start is callable without throwing after mount', () => {
    render(<GlobalLoadingBar />);
    expect(() => loadingBar.start()).not.toThrow();
  });

  it('loadingBar.finish is callable without throwing after mount', () => {
    render(<GlobalLoadingBar />);
    expect(() => loadingBar.finish()).not.toThrow();
  });

  it('start followed immediately by finish does not throw', () => {
    render(<GlobalLoadingBar />);
    expect(() => {
      loadingBar.start();
      loadingBar.finish();
    }).not.toThrow();
  });
});

describe('GlobalLoadingBar — rendering', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<GlobalLoadingBar />);
    expect(toJSON()).toBeTruthy();
  });
});
