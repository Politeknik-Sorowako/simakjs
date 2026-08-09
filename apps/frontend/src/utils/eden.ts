import type { App } from '@backend/app';
import { edenTreaty } from '@elysiajs/eden';
import { API_URL } from './api';

// Eden Treaty returns { data, error }. This unwraps the response and throws
// on error so TanStack Solid Query treats failures uniformly.
export async function unwrap<TData>(promise: Promise<{ data?: TData | null; error?: unknown }>): Promise<TData> {
  const res = await promise;
  if (res.error) {
    throw res.error;
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
