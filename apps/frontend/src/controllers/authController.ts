import { fetchApi } from '../utils/api';
import { User } from '../contexts/AuthContext';

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

  async register(email: string, password: string, role: string): Promise<any> {
    return fetchApi<any>('/auth/register', {
      method: 'POST',
      requireAuth: false,
      body: JSON.stringify({ email, password, role }),
    });
  },
};
