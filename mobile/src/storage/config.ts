import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_URL_KEY = 'tools_report_api_base_url';

export async function getApiBaseUrlOverride() {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(API_URL_KEY);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(API_URL_KEY);
}

export async function setApiBaseUrlOverride(value: string) {
  if (Platform.OS === 'web') {
    localStorage.setItem(API_URL_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(API_URL_KEY, value);
}

export async function clearApiBaseUrlOverride() {
  if (Platform.OS === 'web') {
    localStorage.removeItem(API_URL_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(API_URL_KEY);
}

