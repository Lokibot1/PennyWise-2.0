import React from 'react';
import { render } from '@testing-library/react-native';
import AnimatedOwl from '../AnimatedOwl';

// AnimatedOwl uses React Native's built-in Animated (not Reanimated),
// so no reanimated mock is needed. The expo jest preset handles image assets.

// ── Basic render ──────────────────────────────────────────────────────────────

describe('AnimatedOwl — render', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<AnimatedOwl width={100} height={100} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders without crashing when flipX is false (default)', () => {
    const { toJSON } = render(<AnimatedOwl width={80} height={80} flipX={false} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders without crashing when flipX is true', () => {
    const { toJSON } = render(<AnimatedOwl width={80} height={80} flipX />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders without crashing with large dimensions', () => {
    const { toJSON } = render(<AnimatedOwl width={300} height={300} />);
    expect(toJSON()).toBeTruthy();
  });
});

// ── Cleanup ───────────────────────────────────────────────────────────────────

describe('AnimatedOwl — cleanup', () => {
  it('unmounts without errors (clears timers)', () => {
    const { unmount } = render(<AnimatedOwl width={100} height={100} />);
    expect(() => unmount()).not.toThrow();
  });
});
