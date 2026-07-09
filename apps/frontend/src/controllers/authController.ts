import { User } from '../contexts/AuthContext';
import { fetchApi } from '../utils/api';

interface AuthResponse {
  token: string;
  user: User;
}

export const authController = {
  async login(email: string, password: string): Promise<AuthResponse> {
    return fetchApi<AuthResponse>('/auth/login', {
      method: 'POST',
      requireAuth: false,
      body: JSON.stringify({ email, password }),
    });
  },

  async register(email: string, password: string, nama: string, role: string): Promise<any> {
    return fetchApi<any>('/auth/register', {
      method: 'POST',
      requireAuth: false,
      body: JSON.stringify({ email, password, nama, role }),
    });
  },

  async forgotPassword(email: string): Promise<{ message: string; token?: string }> {
    return fetchApi<{ message: string; token?: string }>('/auth/forgot-password', {
      method: 'POST',
      requireAuth: false,
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    return fetchApi<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      requireAuth: false,
      body: JSON.stringify({ token, password }),
    });
  },

  async validateResetToken(token: string): Promise<{ email: string }> {
    return fetchApi<{ email: string }>('/auth/reset-password/validate', {
      method: 'POST',
      requireAuth: false,
      body: JSON.stringify({ token }),
    });
  },
};
