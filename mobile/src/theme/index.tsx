import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DarkTheme as NavDarkTheme, DefaultTheme as NavDefaultTheme, Theme as NavTheme } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { getThemeMode, setThemeMode, ThemeMode } from '../storage/theme';

type AppColors = {
  background: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  inputBg: string;
  primary: string;
  danger: string;
};

const lightColors: AppColors = {
  background: '#F5F7FA',
  card: '#ffffff',
  text: '#111827',
  muted: '#6b7280',
  border: 'rgba(42,53,71,0.12)',
  inputBg: '#ffffff',
  primary: '#0E5E7E',
  danger: '#ef4444',
};

const darkColors: AppColors = {
  background: '#0b1220',
  card: '#111827',
  text: '#f9fafb',
  muted: '#9ca3af',
  border: 'rgba(148,163,184,0.20)',
  inputBg: '#0f172a',
  primary: '#38bdf8',
  danger: '#f87171',
};

type ThemeContextValue = {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  colors: AppColors;
  navTheme: NavTheme;
  setMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    (async () => {
      const saved = await getThemeMode();
      setModeState(saved);
    })();
  }, []);

  const resolved = (mode === 'system' ? system : mode) === 'dark' ? 'dark' : 'light';
  const colors = resolved === 'dark' ? darkColors : lightColors;

  const navTheme: NavTheme = useMemo(() => {
    const base = resolved === 'dark' ? NavDarkTheme : NavDefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.card,
        text: colors.text,
        border: colors.border,
        primary: colors.primary,
      },
    };
  }, [colors.background, colors.border, colors.card, colors.primary, colors.text, resolved]);

  const setMode = useCallback(async (next: ThemeMode) => {
    setModeState(next);
    await setThemeMode(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolved, colors, navTheme, setMode }),
    [colors, mode, navTheme, resolved, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within ThemeProvider');
  return ctx;
}

