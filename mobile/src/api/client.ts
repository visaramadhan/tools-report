import { Platform } from 'react-native';
import { getApiBaseUrlOverride } from '../storage/config';

const defaultBaseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://127.0.0.1:3001';

function normalizeBaseUrl(input: string) {
  const value = input.trim().replace(/\/+$/, '');
  if (!value) return '';
  if (!/^https?:\/\//i.test(value)) return `https://${value}`;
  return value;
}

let cachedBaseUrl: string | null = null;
let loaded = false;

function isLocalAddress(url: string) {
  return (
    url.includes('://localhost') ||
    url.includes('://127.0.0.1') ||
    url.includes('://10.0.2.2') ||
    url.includes('://10.0.3.2')
  );
}

function enforceHttpsOnWeb(url: string) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return url;
  if (window.location.protocol !== 'https:') return url;
  if (!url.startsWith('http://')) return url;
  if (isLocalAddress(url)) return url;
  return url.replace(/^http:\/\//i, 'https://');
}

export async function resolveApiBaseUrl() {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env) return enforceHttpsOnWeb(normalizeBaseUrl(env));

  if (!loaded) {
    loaded = true;
    const override = await getApiBaseUrlOverride().catch(() => null);
    if (override) {
      const normalized = normalizeBaseUrl(override);
      if (normalized && !isLocalAddress(normalized)) cachedBaseUrl = normalized;
    }
  }
  if (cachedBaseUrl) return enforceHttpsOnWeb(cachedBaseUrl);

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Check if we are on localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    return window.location.origin.replace(/\/+$/, '');
  }

  return enforceHttpsOnWeb(defaultBaseUrl);
}

export async function getApiBaseUrlForDisplay() {
  return resolveApiBaseUrl();
}

export type ApiError = {
  status: number;
  message: string;
  detail?: unknown;
};

export async function apiRequest<T>(
  path: string,
  options?: RequestInit & { token?: string }
): Promise<T> {
  const token = options?.token;
  const headers = new Headers(options?.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const baseUrl = await resolveApiBaseUrl();
  const url = `${baseUrl}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Network request failed';
    const err: ApiError = { status: 0, message: 'Network request failed', detail: { url, error: detail } };
    throw err;
  }
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await res.json().catch(() => undefined) : await res.text().catch(() => undefined);

  if (!res.ok) {
    const message =
      (body && typeof body === 'object' && 'error' in (body as any) && String((body as any).error)) ||
      `Request failed (${res.status})`;
    const err: ApiError = { status: res.status, message, detail: { url, body } };
    throw err;
  }

  return body as T;
}
