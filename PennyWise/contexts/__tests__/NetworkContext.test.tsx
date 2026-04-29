import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { NetworkProvider, useNetwork } from '../NetworkContext';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFetch         = jest.fn();
const mockAddListener   = jest.fn();
const mockSetOnline     = jest.fn();
const mockSync          = jest.fn();
const mockGetUser       = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch:            (...a: any[]) => mockFetch(...a),
    addEventListener: (...a: any[]) => mockAddListener(...a),
  },
}));

jest.mock('@/lib/network', () => ({
  setNetworkOnline: (...a: any[]) => mockSetOnline(...a),
}));

jest.mock('@/lib/syncEngine', () => ({
  syncMutationQueue: (...a: any[]) => mockSync(...a),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: (...a: any[]) => mockGetUser(...a),
    },
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NetworkProvider>{children}</NetworkProvider>
);

let netInfoCallback: ((state: any) => Promise<void>) | null = null;
let mockUnsub: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  netInfoCallback = null;
  mockUnsub       = jest.fn();

  mockFetch.mockResolvedValue({ isConnected: true });
  mockAddListener.mockImplementation((cb: any) => {
    netInfoCallback = cb;
    return mockUnsub;
  });
  mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } } });
  mockSync.mockResolvedValue(0);
});

// ── Initial state ─────────────────────────────────────────────────────────────

describe('NetworkProvider — initial state', () => {
  it('exposes isOnline and pendingSync', async () => {
    const { result } = renderHook(() => useNetwork(), { wrapper });
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(typeof result.current.isOnline).toBe('boolean');
    expect(typeof result.current.pendingSync).toBe('boolean');
  });

  it('calls setNetworkOnline with true when initially connected', async () => {
    renderHook(() => useNetwork(), { wrapper });
    await waitFor(() => expect(mockSetOnline).toHaveBeenCalledWith(true));
  });

  it('sets isOnline to false when initial fetch reports disconnected', async () => {
    mockFetch.mockResolvedValue({ isConnected: false });
    const { result } = renderHook(() => useNetwork(), { wrapper });
    await waitFor(() => expect(mockSetOnline).toHaveBeenCalledWith(false));
    expect(result.current.isOnline).toBe(false);
  });

  it('treats isConnected = null as online (optimistic / unknown state)', async () => {
    mockFetch.mockResolvedValue({ isConnected: null });
    const { result } = renderHook(() => useNetwork(), { wrapper });
    await waitFor(() => expect(mockSetOnline).toHaveBeenCalledWith(true));
    expect(result.current.isOnline).toBe(true);
  });

  it('subscribes to NetInfo events on mount', async () => {
    renderHook(() => useNetwork(), { wrapper });
    await waitFor(() => expect(mockAddListener).toHaveBeenCalled());
  });
});

// ── Unmount ───────────────────────────────────────────────────────────────────

describe('NetworkProvider — unmount', () => {
  it('calls the unsubscribe function when the provider unmounts', async () => {
    const { unmount } = renderHook(() => useNetwork(), { wrapper });
    await waitFor(() => expect(mockAddListener).toHaveBeenCalled());
    unmount();
    expect(mockUnsub).toHaveBeenCalled();
  });
});

// ── Connectivity changes ──────────────────────────────────────────────────────

describe('NetworkProvider — connectivity events', () => {
  it('updates isOnline to false when device goes offline', async () => {
    const { result } = renderHook(() => useNetwork(), { wrapper });
    await waitFor(() => expect(mockAddListener).toHaveBeenCalled());

    await act(async () => {
      await netInfoCallback?.({ isConnected: false });
    });

    expect(result.current.isOnline).toBe(false);
  });

  it('updates isOnline to true when device comes back online', async () => {
    const { result } = renderHook(() => useNetwork(), { wrapper });
    await waitFor(() => expect(mockAddListener).toHaveBeenCalled());

    await act(async () => { await netInfoCallback?.({ isConnected: false }); });
    await act(async () => { await netInfoCallback?.({ isConnected: true }); });

    expect(result.current.isOnline).toBe(true);
  });

  it('calls setNetworkOnline on each connectivity change', async () => {
    renderHook(() => useNetwork(), { wrapper });
    await waitFor(() => expect(mockAddListener).toHaveBeenCalled());

    await act(async () => { await netInfoCallback?.({ isConnected: false }); });
    expect(mockSetOnline).toHaveBeenCalledWith(false);

    await act(async () => { await netInfoCallback?.({ isConnected: true }); });
    expect(mockSetOnline).toHaveBeenCalledWith(true);
  });
});

// ── Sync on reconnect ─────────────────────────────────────────────────────────

describe('NetworkProvider — offline → online sync', () => {
  it('calls syncMutationQueue when coming back online after being offline', async () => {
    renderHook(() => useNetwork(), { wrapper });
    await waitFor(() => expect(mockAddListener).toHaveBeenCalled());

    await act(async () => { await netInfoCallback?.({ isConnected: false }); });
    await act(async () => { await netInfoCallback?.({ isConnected: true }); });

    await waitFor(() => expect(mockSync).toHaveBeenCalledWith('uid-1'));
  });

  it('does not call syncMutationQueue when going online without having been offline', async () => {
    renderHook(() => useNetwork(), { wrapper });
    await waitFor(() => expect(mockAddListener).toHaveBeenCalled());

    // Never went offline — direct online event
    await act(async () => { await netInfoCallback?.({ isConnected: true }); });

    expect(mockSync).not.toHaveBeenCalled();
  });

  it('does not call syncMutationQueue when user is not signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    renderHook(() => useNetwork(), { wrapper });
    await waitFor(() => expect(mockAddListener).toHaveBeenCalled());

    await act(async () => { await netInfoCallback?.({ isConnected: false }); });
    await act(async () => { await netInfoCallback?.({ isConnected: true }); });

    expect(mockSync).not.toHaveBeenCalled();
  });
});
