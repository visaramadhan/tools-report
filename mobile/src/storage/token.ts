import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'tools_report_token';

export async function getToken() {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(KEY);
}

export async function setToken(token: string) {
  if (Platform.OS === 'web') {
    localStorage.setItem(KEY, token);
    return;
  }
  await SecureStore.setItemAsync(KEY, token);
}

export async function clearToken() {
  if (Platform.OS === 'web') {
    localStorage.removeItem(KEY);
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
}
