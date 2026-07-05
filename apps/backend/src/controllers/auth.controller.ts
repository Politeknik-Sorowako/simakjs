import { Resend } from 'resend';
import { AuthService } from '../services/auth.service';
import { AuthContext } from '../utils/types';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export class AuthController {
  static async register({ body, set }: AuthContext) {
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

  static async login({
    body,
    jwt,
    set,
    cookie,
  }: AuthContext & { jwt: { sign: (payload: Record<string, any>) => Promise<string> } }) {
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
      theme: user.theme,
    });

    // Set token in httpOnly cookie
    if (cookie && cookie.access_token) {
      cookie.access_token.set({
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });
    }

    return {
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        email: user.email,
        nama: user.nama,
        role: user.role,
        theme: user.theme,
        avatar: user.avatar,
      },
    };
  }

  static async forgotPassword({ body, set }: AuthContext) {
    try {
      const email = (body as any)?.email;
      if (!email) {
        set.status = 400;
        return { error: 'Email wajib diisi' };
      }

      // Simple Rate Limiting (max 3 requests per 15 minutes per email)
      const now = Date.now();
      const limitKey = email.toLowerCase().trim();
      const limitRecord = rateLimitMap.get(limitKey);
      if (limitRecord) {
        if (now > limitRecord.resetTime) {
          rateLimitMap.set(limitKey, { count: 1, resetTime: now + 15 * 60 * 1000 });
        } else {
          if (limitRecord.count >= 3) {
            set.status = 429;
            return { error: 'Terlalu banyak permintaan reset password. Silakan coba lagi dalam 15 menit.' };
          }
          limitRecord.count++;
        }
      } else {
        rateLimitMap.set(limitKey, { count: 1, resetTime: now + 15 * 60 * 1000 });
      }

      // Check if user exists
      const user = await AuthService.findByEmail(email);
      if (!user) {
        set.status = 404;
        return { error: 'Email tidak terdaftar' };
      }

      // Generate token
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour expiration

      // Delete old tokens and insert new one
      await AuthService.createPasswordReset(email, token, expiresAt);

      // Send reset link using Resend API if API Key is configured
      const resendApiKey = process.env.RESEND_API_KEY;
      if (resendApiKey) {
        const domainName = process.env.DOMAIN_NAME || 'localhost';
        const protocol = domainName === 'localhost' ? 'http' : 'https';
        const port = domainName === 'localhost' ? ':8080' : '';
        const resetLink = `${protocol}://${domainName}${port}/reset-password?token=${token}`;

        try {
          const resend = new Resend(resendApiKey);
          const { data, error } = await resend.emails.send({
            from: 'SIMAK Vokasi <onboarding@resend.dev>',
            to: [email],
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

          if (!error) {
            console.log(`[SIMAK RESET PASSWORD] Email reset berhasil dikirim ke ${email}`);
          } else {
            const errBody = error.message;
            console.error('Failed to send email via Resend:', errBody);
          }
        } catch (error) {
          console.error('Error occurred while sending email via Resend:', error);
        }
      } else {
        console.warn('[SIMAK RESET PASSWORD] RESEND_API_KEY tidak dikonfigurasi di environment backend!');
        console.log(`[SIMAK RESET PASSWORD] Token untuk ${email}: ${token}`);
      }

      return {
        message:
          'Link/token reset password berhasil dibuat. Silakan cek email Anda (atau lihat log server untuk development).',
      };
    } catch (error: any) {
      set.status = 500;
      return { error: 'Gagal membuat token reset password', details: error.message };
    }
  }

  static async resetPassword({ body, set }: AuthContext) {
    try {
      const token = (body as any)?.token;
      const password = (body as any)?.password;

      if (!token || !password) {
        set.status = 400;
        return { error: 'Token dan password baru wajib diisi' };
      }

      if (password.length < 6) {
        set.status = 400;
        return { error: 'Password minimal harus 6 karakter' };
      }

      // Find token
      const resetRecord = await AuthService.getPasswordReset(token);
      if (!resetRecord) {
        set.status = 400;
        return { error: 'Token reset password tidak valid atau kedaluwarsa' };
      }

      // Check expiration
      if (resetRecord.expiresAt < new Date()) {
        await AuthService.deletePasswordReset(resetRecord.id);
        set.status = 400;
        return { error: 'Token reset password telah kedaluwarsa' };
      }

      // Find user
      const user = await AuthService.findByEmail(resetRecord.email);
      if (!user) {
        set.status = 404;
        return { error: 'Pengguna tidak ditemukan' };
      }

      // Hash and update password
      const hashedPassword = await AuthService.hashPassword(password);
      await AuthService.updatePassword(user.id, hashedPassword);

      // Clean up token
      await AuthService.deletePasswordReset(resetRecord.id);

      return {
        message: 'Password Anda berhasil diubah. Silakan login kembali.',
      };
    } catch (error: any) {
      set.status = 500;
      return { error: 'Gagal menyetel ulang password', details: error.message };
    }
  }

  static async getResetTokenDetails({ params, set }: { params: { token: string }; set: any }) {
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
    } catch (error: any) {
      set.status = 500;
      return { error: 'Gagal memverifikasi token reset password', details: error.message };
    }
  }
}
