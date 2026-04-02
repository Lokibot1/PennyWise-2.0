import React from 'react';
import { render, act } from '@testing-library/react-native';
import SplashScreen from '../index';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
}));
jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn().mockResolvedValue({
        sound: {
          setOnPlaybackStatusUpdate: jest.fn(),
          unloadAsync: jest.fn().mockResolvedValue(undefined),
        },
      }),
    },
  },
}));

jest.mock('@/constants/fonts', () => ({
  Font: {
    headerBlack: 'LeagueSpartan_900Black',
    bodyRegular: 'KumbhSans_400Regular',
  },
}));

const mockGetSession = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: (...a: any[]) => mockGetSession(...a) } },
}));

import { router } from 'expo-router';
const mockRouter = router as jest.Mocked<typeof router>;

beforeEach(() => jest.clearAllMocks());

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SplashScreen — auth routing', () => {
  it('navigates to /(tabs) when a session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });

    jest.useFakeTimers();
    render(<SplashScreen />);

    // The navigation fires after a 4800ms setTimeout
    await act(async () => { jest.advanceTimersByTime(5000); });
    await act(async () => {}); // flush promises

    expect(mockGetSession).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
    jest.useRealTimers();
  });

  it('navigates to /login-form when no session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    jest.useFakeTimers();
    render(<SplashScreen />);

    await act(async () => { jest.advanceTimersByTime(5000); });
    await act(async () => {});

    expect(mockRouter.replace).toHaveBeenCalledWith('/login-form');
    jest.useRealTimers();
  });

  it('calls supabase.auth.getSession exactly once per render', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    jest.useFakeTimers();
    render(<SplashScreen />);
    await act(async () => { jest.advanceTimersByTime(5000); });
    await act(async () => {});

    expect(mockGetSession).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('does not navigate before the 4800ms animation completes', () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    jest.useFakeTimers();
    render(<SplashScreen />);
    jest.advanceTimersByTime(4799); // just before

    expect(mockRouter.replace).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});
