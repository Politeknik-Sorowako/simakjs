import type { App } from '@backend/app';
import { edenTreaty } from '@elysiajs/eden';
import { API_URL } from './api';

interface EdenError {
  status?: number;
  value?: unknown;
  data?: unknown;
  response?: unknown;
  message?: unknown;
  error?: unknown;
}

function getStringValue(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const v = record[key];
    if (typeof v === 'string' && v.length > 0) return v;
    if (v && typeof v === 'object') {
      const nested = v as Record<string, unknown>;
      const nestedMsg = getStringValue(nested, keys);
      if (nestedMsg) return nestedMsg;
    }
  }
  return null;
}

function stringifyFallback(raw: unknown): string {
  try {
    const str = JSON.stringify(raw);
    if (str && str !== '{}' && str !== '[]' && str !== '""') return str;
  } catch {
    // ignore circular references
  }
  return 'Terjadi kesalahan, silakan coba lagi';
}

function extractErrorText(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (raw instanceof Error) return raw.message || 'Terjadi kesalahan, silakan coba lagi';
  if (raw && typeof raw === 'object') {
    const err = raw as EdenError;
    // Nested error.value / error.data / error.response holds the HTTP body
    for (const container of [err.value, err.data]) {
      if (container && typeof container === 'object') {
        const v = container as Record<string, unknown>;
        const msg = getStringValue(v, ['error', 'message']);
        if (msg) return msg;
      }
    }
    if (err.response && typeof err.response === 'object') {
      const r = err.response as Record<string, unknown>;
      const data = r.data ?? r.body;
      if (data && typeof data === 'object') {
        const msg = getStringValue(data as Record<string, unknown>, ['error', 'message']);
        if (msg) return msg;
      }
    }
    // Array of validation errors
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (item && typeof item === 'object') {
          const msg = getStringValue(item as Record<string, unknown>, ['error', 'message']);
          if (msg) return msg;
        }
      }
    }
    // Direct props on the error object
    const direct = getStringValue(raw as Record<string, unknown>, ['error', 'message']);
    if (direct) return direct;
    return stringifyFallback(raw);
  }
  return 'Terjadi kesalahan, silakan coba lagi';
}

// Eden Treaty returns { data, error }. This unwraps the response and throws
// a readable Error on failure so callers can rely on error.message uniformly.
export async function unwrap<TData>(promise: Promise<{ data?: TData | null; error?: unknown }>): Promise<TData> {
  const res = await promise;
  if (res.error) {
    throw new Error(extractErrorText(res.error));
  }
  return res.data as TData;
}

export const eden = edenTreaty<App>(API_URL, {
  fetcher: ((input, init) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers = new Headers(init?.headers);
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(input, { ...init, headers, credentials: 'include' });
  }) as typeof fetch,
});
