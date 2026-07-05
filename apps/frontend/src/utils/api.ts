const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface FetchOptions extends RequestInit {
  requireAuth?: boolean;
}

export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { requireAuth = true, headers, ...customConfig } = options;

  const config: RequestInit = {
    ...customConfig,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
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

  let data: any;
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

  const errorMessage = data?.error || data?.message || response.statusText;

  if (response.status === 403) {
    throw new Error(errorMessage);
  }

  throw new Error(errorMessage);
}
