import { Resend } from 'resend';
import { AuthService } from '../services/auth.service';
import type { AuthContext } from '../utils/types';

const loginRateLimit = new Map<string, { count: number; resetTime: number }>();
const forgotRateLimit = new Map<string, { count: number; resetTime: number }>();

export class AuthController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async logout({ set }: AuthContext): Promise<any> {
    set.status = 200;
    return { message: 'Logout berhasil' };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async register({ body, set }: AuthContext): Promise<any> {
    if (body.role === 'admin' || body.role === 'prodi' || body.role === 'keuangan') {
      set.status = 403;
      return { error: 'Registrasi dengan role tersebut tidak diizinkan.' };
    }
    try {
      const user = await AuthService.register(body.email, body.password, body.nama, body.role);
      set.status = 201;
      return {
        message: 'Registrasi berhasil',
        user,
      };
    } catch (e) {
      set.status = 400;
      return { error: 'Email sudah terdaftar' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async login({ body, jwt, set, cookie }: AuthContext & { jwt: any }): Promise<any> {
    if (process.env.NODE_ENV !== 'test') {
      const now = Date.now();
      const limitKey = `login:${body.email.toLowerCase().trim()}`;
      const loginRecord = loginRateLimit.get(limitKey);
      if (loginRecord) {
        if (now < loginRecord.resetTime) {
          if (loginRecord.count >= 5) {
            set.status = 429;
            return { error: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.' };
          }
          loginRecord.count++;
        } else {
          loginRateLimit.set(limitKey, { count: 1, resetTime: now + 15 * 60 * 1000 });
        }
      } else {
        loginRateLimit.set(limitKey, { count: 1, resetTime: now + 15 * 60 * 1000 });
      }
    }

    const user = await AuthService.validateUser(body.email, body.password);
    if (!user) {
      set.status = 401;
      return { error: 'Email atau password salah' };
    }
    if (!user.isActive) {
      set.status = 403;
      return { error: 'Akun Anda belum diaktifkan oleh Admin' };
    }
    const token = await jwt.sign({
      id: user.id,
      email: user.email,
      nama: user.nama,
      role: user.role,
      roles: user.roles,
      mustChangePassword: user.mustChangePassword,
      isGlobalScope: user.isGlobalScope ?? false,
    });

    if (cookie?.access_token) {
      cookie.access_token.set({
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    set.status = 200;
    const userResponse: Record<string, unknown> = {
      id: user.id,
      email: user.email,
      nama: user.nama,
      role: user.role,
      roles: user.roles,
      mustChangePassword: user.mustChangePassword,
    };
    if (user.theme) userResponse.theme = user.theme;
    if (user.avatar) userResponse.avatar = user.avatar;
    return {
      message: 'Login berhasil',
      token,
      user: userResponse,
    };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async forgotPassword({ body, set }: AuthContext): Promise<any> {
    try {
      const email = (body as { email?: string })?.email;
      if (!email) {
        set.status = 400;
        return { error: 'Email wajib diisi' };
      }

      const emailLower = email.toLowerCase().trim();
      const now = Date.now();
      const limitKey = `forgot:${emailLower}`;
      const limitRecord = forgotRateLimit.get(limitKey);
      if (limitRecord) {
        if (now < limitRecord.resetTime) {
          if (limitRecord.count >= 3) {
            set.status = 429;
            return { error: 'Terlalu banyak permintaan. Silakan coba lagi dalam 15 menit.' };
          }
          limitRecord.count++;
        } else {
          forgotRateLimit.set(limitKey, { count: 1, resetTime: now + 15 * 60 * 1000 });
        }
      } else {
        forgotRateLimit.set(limitKey, { count: 1, resetTime: now + 15 * 60 * 1000 });
      }

      const user = await AuthService.findByEmail(emailLower);
      if (user) {
        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 3600000);
        await AuthService.createPasswordReset(emailLower, token, expiresAt);

        if (process.env.NODE_ENV === 'test') {
          return {
            message: 'Jika email terdaftar, link reset password telah dikirim.',
            token,
          };
        }

        const resendApiKey = process.env.RESEND_API_KEY;
        if (resendApiKey) {
          const domainName = process.env.DOMAIN_NAME || 'localhost';
          const protocol = domainName === 'localhost' ? 'http' : 'https';
          const port = domainName === 'localhost' ? ':8080' : '';
          const resetLink = `${protocol}://${domainName}${port}/reset-password?token=${token}`;

          try {
            const resend = new Resend(resendApiKey);
            const { error: sendError } = await resend.emails.send({
              from: 'SIMAK Vokasi <onboarding@resend.dev>',
              to: [emailLower],
              subject: 'Reset Kata Sandi - SIMAK Vokasi',
              html: `
                <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                  <h2 style="color: #1e3a8a; margin-bottom: 16px;">SIMAK Vokasi</h2>
                  <p>Halo,</p>
                  <p>Kami menerima permintaan untuk mereset kata sandi akun SIMAK Vokasi Anda.</p>
                  <p>Silakan klik tombol di bawah ini untuk mengatur ulang kata sandi Anda. Tautan ini akan kedaluwarsa dalam 1 jam.</p>
                  <div style="margin: 24px 0;">
                    <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Atur Ulang Kata Sandi</a>
                  </div>
                  <p style="color: #64748b; font-size: 12px;">Jika Anda tidak meminta ini, abaikan email ini.</p>
                </div>
              `,
            });

            if (sendError) {
              console.error('Gagal mengirim email reset:', sendError.message);
            }
          } catch (sendErr) {
            console.error('Gagal mengirim email reset:', sendErr);
          }
        }
      }

      return {
        message: 'Jika email terdaftar, link reset password telah dikirim.',
      };
    } catch (error: unknown) {
      set.status = 500;
      return { error: 'Gagal memproses permintaan reset password' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async resetPassword({ body, set }: AuthContext): Promise<any> {
    try {
      const token = (body as { token?: string; password?: string })?.token;
      const password = (body as { token?: string; password?: string })?.password;

      if (!token || !password) {
        set.status = 400;
        return { error: 'Token dan password baru wajib diisi' };
      }

      if (password.length < 8) {
        set.status = 400;
        return { error: 'Password minimal harus 8 karakter' };
      }

      if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
        set.status = 400;
        return { error: 'Password harus mengandung huruf kapital dan angka' };
      }

      const resetRecord = await AuthService.getPasswordReset(token);
      if (!resetRecord) {
        set.status = 400;
        return { error: 'Token reset password tidak valid atau kedaluwarsa' };
      }

      if (resetRecord.expiresAt < new Date()) {
        await AuthService.deletePasswordReset(resetRecord.id);
        set.status = 400;
        return { error: 'Token reset password telah kedaluwarsa' };
      }

      const user = await AuthService.findByEmail(resetRecord.email);
      if (!user) {
        set.status = 404;
        return { error: 'Pengguna tidak ditemukan' };
      }

      const hashedPassword = await AuthService.hashPassword(password);
      await AuthService.updatePassword(user.id, hashedPassword);
      await AuthService.deletePasswordReset(resetRecord.id);

      return { message: 'Password Anda berhasil diubah. Silakan login kembali.' };
    } catch (error: unknown) {
      set.status = 500;
      return { error: 'Gagal menyetel ulang password' };
    }
  }

  static async getResetTokenDetails({ params, set }: { params: { token: string }; set: { status: number } }) {
    try {
      const token = params.token;
      if (!token) {
        set.status = 400;
        return { error: 'Token wajib diisi' };
      }

      const resetRecord = await AuthService.getPasswordReset(token);
      if (!resetRecord) {
        set.status = 400;
        return { error: 'Token reset password tidak valid atau kedaluwarsa' };
      }

      if (resetRecord.expiresAt < new Date()) {
        await AuthService.deletePasswordReset(resetRecord.id);
        set.status = 400;
        return { error: 'Token reset password telah kedaluwarsa' };
      }

      return { email: resetRecord.email };
    } catch (error: unknown) {
      set.status = 500;
      return { error: 'Gagal memverifikasi token reset password' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async validateResetToken({ body, set }: AuthContext): Promise<any> {
    try {
      const token = (body as { token?: string })?.token;
      if (!token) {
        set.status = 400;
        return { error: 'Token wajib diisi' };
      }

      const resetRecord = await AuthService.getPasswordReset(token);
      if (!resetRecord) {
        set.status = 400;
        return { error: 'Token reset password tidak valid atau kedaluwarsa' };
      }

      if (resetRecord.expiresAt < new Date()) {
        await AuthService.deletePasswordReset(resetRecord.id);
        set.status = 400;
        return { error: 'Token reset password telah kedaluwarsa' };
      }

      return { email: resetRecord.email };
    } catch (error: unknown) {
      set.status = 500;
      return { error: 'Gagal memverifikasi token reset password' };
    }
  }
}
