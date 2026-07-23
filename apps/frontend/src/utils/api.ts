export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * SafeAny — use for dynamic API data in SolidJS <For> loops
 * and contexts where strict typing causes compilation failures
 * due to optional/null fields from the backend.
 */
export type SafeAny = Record<string, unknown>;

interface FetchOptions extends RequestInit {
  requireAuth?: boolean;
}

export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { requireAuth = true, headers, ...customConfig } = options;

  const isFormData = customConfig.body instanceof FormData;

  const config: RequestInit = {
    ...customConfig,
    credentials: 'include' as const,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
  };

  if (requireAuth) {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);

  let data: unknown;
  const isJson = response.headers.get('content-type')?.includes('application/json');

  if (isJson) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (response.ok) {
    return data as T;
  }

  if (response.status === 401 && requireAuth) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
  }

  const errorObj = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : null;
  const errorMessage = (errorObj?.error || errorObj?.message || response.statusText) as string;

  if (response.status === 403) {
    throw new Error(errorMessage);
  }

  throw new Error(errorMessage);
}
