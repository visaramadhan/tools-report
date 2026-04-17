import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_MODE_KEY = 'tools_report_theme_mode';

export async function getThemeMode(): Promise<ThemeMode> {
  const raw = Platform.OS === 'web' ? localStorage.getItem(THEME_MODE_KEY) : await SecureStore.getItemAsync(THEME_MODE_KEY);
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return 'system';
}

export async function setThemeMode(mode: ThemeMode) {
  if (Platform.OS === 'web') {
    localStorage.setItem(THEME_MODE_KEY, mode);
    return;
  }
  await SecureStore.setItemAsync(THEME_MODE_KEY, mode);
}

