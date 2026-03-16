import { Platform } from 'react-native';

const defaultBaseUrl =
  Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || defaultBaseUrl;

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

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await res.json().catch(() => undefined) : await res.text().catch(() => undefined);

  if (!res.ok) {
    const message =
      (body && typeof body === 'object' && 'error' in (body as any) && String((body as any).error)) ||
      `Request failed (${res.status})`;
    const err: ApiError = { status: res.status, message, detail: body };
    throw err;
  }

  return body as T;
}
