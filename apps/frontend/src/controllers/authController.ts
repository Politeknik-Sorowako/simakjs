import { User } from '../contexts/AuthContext';
import { eden, unwrap } from '../utils/eden';

export interface AuthResponse {
  token?: string;
  user?: User;
  requires2FA?: boolean;
  twoFactorToken?: string;
  message?: string;
}

type GenericEden<T> = Promise<{ data?: T; error?: unknown }>;

export const authController = {
  async login(email: string, password: string): Promise<AuthResponse> {
    return unwrap<AuthResponse>(eden.auth.login.post({ email, password }) as unknown as GenericEden<AuthResponse>);
  },

  async register(
    email: string,
    password: string,
    nama: string,
    role: string,
  ): Promise<{ message: string; user: User }> {
    const bodyRole = (['dosen', 'mahasiswa', 'guest'].includes(role) ? role : 'mahasiswa') as
      | 'dosen'
      | 'mahasiswa'
      | 'guest';
    return unwrap<{ message: string; user: User }>(
      eden.auth.register.post({ nama, email, password, role: bodyRole }) as unknown as GenericEden<{
        message: string;
        user: User;
      }>,
    );
  },

  async getGoogleAuthUrl(): Promise<{ url: string }> {
    return unwrap<{ url: string }>(eden.auth.google.url.get() as unknown as GenericEden<{ url: string }>);
  },

  async googleCallback(code: string): Promise<AuthResponse> {
    return unwrap<AuthResponse>(eden.auth.google.callback.post({ code }) as unknown as GenericEden<AuthResponse>);
  },

  async activateAccount(token: string): Promise<{ message: string; email: string }> {
    return unwrap<{ message: string; email: string }>(
      eden.auth.activate.post({ token }) as unknown as GenericEden<{ message: string; email: string }>,
    );
  },

  async resendActivation(email: string): Promise<{ message: string }> {
    return unwrap<{ message: string }>(
      eden.auth['resend-activation'].post({ email }) as unknown as GenericEden<{ message: string }>,
    );
  },

  async twoFactorSetup(): Promise<{ secret: string; qrCodeUrl: string; otpauthUri: string }> {
    return unwrap<{ secret: string; qrCodeUrl: string; otpauthUri: string }>(
      eden.auth['2fa'].setup.post() as unknown as GenericEden<{
        secret: string;
        qrCodeUrl: string;
        otpauthUri: string;
      }>,
    );
  },

  async twoFactorEnable(secret: string, code: string): Promise<{ message: string; recoveryCodes: string[] }> {
    return unwrap<{ message: string; recoveryCodes: string[] }>(
      eden.auth['2fa'].enable.post({ secret, code }) as unknown as GenericEden<{
        message: string;
        recoveryCodes: string[];
      }>,
    );
  },

  async twoFactorDisable(password: string, code: string): Promise<{ message: string }> {
    return unwrap<{ message: string }>(
      eden.auth['2fa'].disable.post({ password, code }) as unknown as GenericEden<{ message: string }>,
    );
  },

  async twoFactorVerifyLogin(twoFactorToken: string, code: string, isRecovery?: boolean): Promise<AuthResponse> {
    return unwrap<AuthResponse>(
      eden.auth['2fa'].verify.post({ twoFactorToken, code, isRecovery }) as unknown as GenericEden<AuthResponse>,
    );
  },

  async forgotPassword(email: string): Promise<{ message: string; token?: string }> {
    return unwrap<{ message: string; token?: string }>(
      eden.auth['forgot-password'].post({ email }) as unknown as GenericEden<{ message: string; token?: string }>,
    );
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    return unwrap<{ message: string }>(
      eden.auth['reset-password'].post({ token, password }) as unknown as GenericEden<{ message: string }>,
    );
  },

  async validateResetToken(token: string): Promise<{ email: string }> {
    return unwrap<{ email: string }>(
      eden.auth['reset-password']['validate'].post({ token }) as unknown as GenericEden<{ email: string }>,
    );
  },

  async clearRateLimit(email: string): Promise<{ message: string; loginCleared: boolean; forgotCleared: boolean }> {
    return unwrap<{ message: string; loginCleared: boolean; forgotCleared: boolean }>(
      eden.auth['clear-rate-limit'].post({ email }) as unknown as GenericEden<{
        message: string;
        loginCleared: boolean;
        forgotCleared: boolean;
      }>,
    );
  },
};
