import { User } from '../contexts/AuthContext';
import { eden, unwrap } from '../utils/eden';

interface AuthResponse {
  token: string;
  user: User;
}

type AuthEden = Promise<{ data?: AuthResponse; error?: unknown }>;

export const authController = {
  async login(email: string, password: string): Promise<AuthResponse> {
    return unwrap<AuthResponse>(eden.auth.login.post({ email, password }) as unknown as AuthEden);
  },

  async register(email: string, password: string, nama: string, role: string): Promise<AuthResponse> {
    const bodyRole = (['dosen', 'mahasiswa', 'guest'].includes(role) ? role : 'mahasiswa') as
      | 'dosen'
      | 'mahasiswa'
      | 'guest';
    return unwrap<AuthResponse>(
      eden.auth.register.post({ nama, email, password, role: bodyRole }) as unknown as AuthEden,
    );
  },

  async forgotPassword(email: string): Promise<{ message: string; token?: string }> {
    return unwrap<{ message: string; token?: string }>(eden.auth['forgot-password'].post({ email }));
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    return unwrap<{ message: string }>(eden.auth['reset-password'].post({ token, password }));
  },

  async validateResetToken(token: string): Promise<{ email: string }> {
    return unwrap<{ email: string }>(eden.auth['reset-password']['validate'].post({ token }));
  },

  async getGoogleAuthUrl(): Promise<{ url: string }> {
    return unwrap<{ url: string }>(
      eden.auth.google.url.get() as unknown as Promise<{ data?: { url: string }; error?: unknown }>,
    );
  },

  async handleGoogleCallback(code: string): Promise<AuthResponse> {
    return unwrap<AuthResponse>(eden.auth.google.callback.post({ code }) as unknown as AuthEden);
  },

  async clearRateLimit(email: string): Promise<{ message: string; loginCleared: boolean; forgotCleared: boolean }> {
    return unwrap<{ message: string; loginCleared: boolean; forgotCleared: boolean }>(
      eden.auth['clear-rate-limit'].post({ email }),
    );
  },
};
