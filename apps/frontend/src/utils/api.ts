export const API_URL = (() => {
  if (import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== '') {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return '/api';
    }
  }
  return 'http://localhost:3000';
})();

/**
 * Menghasilkan URL absolut lengkap (termasuk protokol dan host domain)
 * untuk akses berkas storage agar tautan valid dan dapat diakses langsung oleh pengguna.
 *
 * - URL absolut (http/https) dikembalikan apa adanya.
 * - API_URL absolut (mis. http://localhost:3000) digabung langsung.
 * - API_URL relatif (mis. /api di production/staging) digabung dengan
 *   window.location.origin sehingga menghasilkan URL berdomain lengkap.
 */
export function getAbsoluteStorageUrl(path: string): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // Jika API_URL sudah berupa URL absolut (mis. http://localhost:3000)
  if (/^https?:\/\//i.test(API_URL)) {
    const trimmedApi = API_URL.replace(/\/+$/, '');
    return `${trimmedApi}${normalizedPath}`;
  }

  // Jika di browser dan API_URL bernilai relatif (mis. '/api' di production/staging)
  if (typeof window !== 'undefined') {
    const origin = window.location.origin.replace(/\/+$/, '');
    const apiPrefix =
      API_URL && API_URL !== '/' ? (API_URL.startsWith('/') ? API_URL : `/${API_URL}`).replace(/\/+$/, '') : '';
    return `${origin}${apiPrefix}${normalizedPath}`;
  }

  return `${API_URL}${normalizedPath}`;
}

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

  const errObj = data as { error?: string; message?: string } | undefined;
  const errorMessage = errObj?.error || errObj?.message || response.statusText;

  if (response.status === 403) {
    throw new Error(errorMessage);
  }

  throw new Error(errorMessage);
}
