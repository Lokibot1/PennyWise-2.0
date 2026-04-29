import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AppThemeProvider, useAppTheme, LIGHT, DARK } from '../AppTheme';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...a: any[]) => mockGetItem(...a),
  setItem: (...a: any[]) => mockSetItem(...a),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppThemeProvider>{children}</AppThemeProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
});

// ── Theme constants ───────────────────────────────────────────────────────────

describe('LIGHT / DARK constants', () => {
  it('LIGHT.isDark is false', () => {
    expect(LIGHT.isDark).toBe(false);
  });

  it('DARK.isDark is true', () => {
    expect(DARK.isDark).toBe(true);
  });

  it('LIGHT and DARK have different headerBg values', () => {
    expect(LIGHT.headerBg).not.toBe(DARK.headerBg);
  });

  it('LIGHT statusBar is "light"', () => {
    expect(LIGHT.statusBar).toBe('light');
  });
});

// ── Initial state ─────────────────────────────────────────────────────────────

describe('AppThemeProvider — initial state', () => {
  it('defaults to light theme when no preference is stored', async () => {
    const { result } = renderHook(() => useAppTheme(), { wrapper });
    await waitFor(() => expect(mockGetItem).toHaveBeenCalled());
    expect(result.current.darkMode).toBe(false);
    expect(result.current.theme).toEqual(LIGHT);
  });

  it('loads dark mode when stored preference is "true"', async () => {
    mockGetItem.mockResolvedValue('true');
    const { result } = renderHook(() => useAppTheme(), { wrapper });
    await waitFor(() => expect(result.current.darkMode).toBe(true));
    expect(result.current.theme).toEqual(DARK);
  });

  it('stays light when stored preference is "false"', async () => {
    mockGetItem.mockResolvedValue('false');
    const { result } = renderHook(() => useAppTheme(), { wrapper });
    await waitFor(() => expect(mockGetItem).toHaveBeenCalled());
    expect(result.current.darkMode).toBe(false);
  });

  it('reads from the correct AsyncStorage key', async () => {
    renderHook(() => useAppTheme(), { wrapper });
    await waitFor(() => expect(mockGetItem).toHaveBeenCalledWith('pw_dark_mode_v1'));
  });
});

// ── toggleDark ────────────────────────────────────────────────────────────────

describe('AppThemeProvider — toggleDark', () => {
  it('switches from light to dark when toggled', async () => {
    const { result } = renderHook(() => useAppTheme(), { wrapper });
    await waitFor(() => expect(mockGetItem).toHaveBeenCalled());

    act(() => result.current.toggleDark());

    expect(result.current.darkMode).toBe(true);
    expect(result.current.theme).toEqual(DARK);
  });

  it('switches from dark back to light when toggled again', async () => {
    mockGetItem.mockResolvedValue('true');
    const { result } = renderHook(() => useAppTheme(), { wrapper });
    await waitFor(() => expect(result.current.darkMode).toBe(true));

    act(() => result.current.toggleDark());

    expect(result.current.darkMode).toBe(false);
    expect(result.current.theme).toEqual(LIGHT);
  });

  it('persists the new preference (true) to AsyncStorage', async () => {
    const { result } = renderHook(() => useAppTheme(), { wrapper });
    await waitFor(() => expect(mockGetItem).toHaveBeenCalled());

    act(() => result.current.toggleDark());

    await waitFor(() =>
      expect(mockSetItem).toHaveBeenCalledWith('pw_dark_mode_v1', 'true')
    );
  });

  it('persists the new preference (false) when toggling back', async () => {
    mockGetItem.mockResolvedValue('true');
    const { result } = renderHook(() => useAppTheme(), { wrapper });
    await waitFor(() => expect(result.current.darkMode).toBe(true));

    act(() => result.current.toggleDark());

    await waitFor(() =>
      expect(mockSetItem).toHaveBeenCalledWith('pw_dark_mode_v1', 'false')
    );
  });

  it('double-toggle returns to the original state', async () => {
    const { result } = renderHook(() => useAppTheme(), { wrapper });
    await waitFor(() => expect(mockGetItem).toHaveBeenCalled());

    act(() => result.current.toggleDark());
    act(() => result.current.toggleDark());

    expect(result.current.darkMode).toBe(false);
  });
});

// ── context exposure ──────────────────────────────────────────────────────────

describe('useAppTheme', () => {
  it('exposes theme, darkMode, and toggleDark', async () => {
    const { result } = renderHook(() => useAppTheme(), { wrapper });
    await waitFor(() => expect(mockGetItem).toHaveBeenCalled());
    expect(result.current.theme).toBeDefined();
    expect(typeof result.current.darkMode).toBe('boolean');
    expect(typeof result.current.toggleDark).toBe('function');
  });
});
