import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

// ── Theme definition ────────────────────────────────────────────────────────────
export type Theme = {
  headerBg: string;       // top green section
  cardBg: string;         // white card / bottom section
  surface: string;        // form inputs, embedded cards
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  iconBtnBg: string;      // circular icon buttons in header
  iconBtnColor: string;
  tabBarBg: string;
  tabBarInactive: string;
  inputBg: string;
  inputBorder: string;
  divider: string;
  modalBg: string;
  confirmBg: string;
  statusBar: 'dark' | 'light';
  isDark: boolean;
};

export const LIGHT: Theme = {
  headerBg: '#7CB898',
  cardBg: '#FFFFFF',
  surface: '#F8FBF9',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#999999',
  iconBtnBg: 'rgba(255,255,255,0.5)',
  iconBtnColor: '#1A1A1A',
  tabBarBg: '#FFFFFF',
  tabBarInactive: '#9AA5B4',
  inputBg: '#EEF7F3',
  inputBorder: '#D5EDE4',
  divider: '#F2F2F2',
  modalBg: '#FFFFFF',
  confirmBg: '#FFFFFF',
  statusBar: 'dark',
  isDark: false,
};

export const DARK: Theme = {
  headerBg: '#1B3028',
  cardBg: '#141414',
  surface: '#1E1E1E',
  textPrimary: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#666666',
  iconBtnBg: 'rgba(255,255,255,0.12)',
  iconBtnColor: '#FFFFFF',
  tabBarBg: '#141414',
  tabBarInactive: '#4A4A4A',
  inputBg: '#252525',
  inputBorder: '#333333',
  divider: '#252525',
  modalBg: '#1E1E1E',
  confirmBg: '#242424',
  statusBar: 'light',
  isDark: true,
};

// ── Context ─────────────────────────────────────────────────────────────────────
type AppThemeCtx = {
  theme: Theme;
  darkMode: boolean;
  toggleDark: () => void;
};

const AppThemeContext = createContext<AppThemeCtx>({
  theme: LIGHT,
  darkMode: false,
  toggleDark: () => {},
});

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);
  const theme = darkMode ? DARK : LIGHT;

  return (
    <AppThemeContext.Provider value={{ theme, darkMode, toggleDark: () => setDarkMode(v => !v) }}>
      {children}
    </AppThemeContext.Provider>
  );
}

export const useAppTheme = () => useContext(AppThemeContext);
