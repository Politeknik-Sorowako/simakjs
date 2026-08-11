import type { App } from '@backend/app';
import { edenTreaty } from '@elysiajs/eden';
import { API_URL } from './api';

interface EdenError {
  status?: number;
  value?: unknown;
  message?: unknown;
  error?: unknown;
}

function extractErrorText(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (raw instanceof Error) return raw.message;
  if (raw && typeof raw === 'object') {
    const err = raw as EdenError;
    const value = err.value;
    if (value && typeof value === 'object') {
      const v = value as Record<string, unknown>;
      if (typeof v.error === 'string') return v.error;
      if (typeof v.message === 'string') return v.message;
    }
    if (typeof err.error === 'string') return err.error;
    if (typeof err.message === 'string') return err.message;
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
