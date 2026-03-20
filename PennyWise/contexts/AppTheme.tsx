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
  headerBg: '#1B3D2B',        // deep forest green — logo background
  cardBg: '#FFFFFF',
  surface: '#F2F8F4',         // soft green-tinted off-white
  textPrimary: '#0F1F17',     // near-black with a green tint
  textSecondary: '#4A6355',   // muted forest green
  textMuted: '#8FAF9A',       // subtle green-grey
  iconBtnBg: 'rgba(255,255,255,0.18)',
  iconBtnColor: '#FFFFFF',    // white icons on dark green header
  tabBarBg: '#FFFFFF',
  tabBarInactive: '#8FAF9A',
  inputBg: '#F2F8F4',         // light green-tinted input background
  inputBorder: '#C8DDD2',     // soft green border
  divider: '#E0EDE6',         // very light green divider
  modalBg: '#FFFFFF',
  confirmBg: '#FFFFFF',
  statusBar: 'light',         // white status bar icons on dark green header
  isDark: false,
};

export const DARK: Theme = {
  headerBg: '#0C1F14',        // darkest forest — logo coin shadow
  cardBg: '#121C16',
  surface: '#1A2820',
  textPrimary: '#E8F5EE',     // soft white with green tint
  textSecondary: '#7AAF90',   // muted emerald
  textMuted: '#4A6A55',
  iconBtnBg: 'rgba(255,255,255,0.12)',
  iconBtnColor: '#FFFFFF',
  tabBarBg: '#121C16',
  tabBarInactive: '#4A6A55',
  inputBg: '#1A2820',
  inputBorder: '#2A4035',
  divider: '#1E3028',
  modalBg: '#1A2820',
  confirmBg: '#1E3028',
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
