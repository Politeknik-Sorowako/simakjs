import { eq } from 'drizzle-orm';
import { Resend } from 'resend';
import { users } from '../models/schema';
import { AccountActivationService } from '../services/account-activation.service';
import { AuthService } from '../services/auth.service';
import { SsoService } from '../services/sso.service';
import { TwoFactorService } from '../services/two-factor.service';
import { db } from '../utils/db';
import { isSuperAdminOrAdmin } from '../utils/role';
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
        message: 'Registrasi berhasil. Silakan cek email Anda untuk mengaktifkan akun.',
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
          loginRecord.count++;
          if (loginRecord.count >= 5) {
            set.status = 429;
            const retryAfter = Math.max(1, Math.ceil((loginRecord.resetTime - now) / 1000));
            return { error: 'Terlalu banyak percobaan login. Silakan coba lagi.', retryAfter };
          }
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
      return { error: 'Akun Anda belum diaktifkan' };
    }

    if (user.twoFactorEnabled) {
      const twoFactorToken = await jwt.sign({
        id: user.id,
        stage: '2fa_required',
      });
      set.status = 200;
      return {
        requires2FA: true,
        twoFactorToken,
        message: 'Verifikasi 2FA diperlukan.',
      };
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
  static async googleAuthUrl({ set }: AuthContext): Promise<any> {
    const url = SsoService.getGoogleAuthUrl();
    set.status = 200;
    return { url };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async googleCallback({ body, jwt, set, cookie }: AuthContext & { jwt: any }): Promise<any> {
    try {
      const code = (body as { code?: string })?.code;
      if (!code) {
        set.status = 400;
        return { error: 'Kode otorisasi Google wajib diisi.' };
      }

      const googleUser = await SsoService.exchangeCodeForGoogleUser(code);
      const user = await SsoService.findOrCreateGoogleUser(googleUser);

      if (!user.isActive) {
        set.status = 403;
        return { error: 'Akun Anda belum aktif.' };
      }

      if (user.twoFactorEnabled) {
        const twoFactorToken = await jwt.sign({
          id: user.id,
          stage: '2fa_required',
        });
        set.status = 200;
        return {
          requires2FA: true,
          twoFactorToken,
          message: 'Verifikasi 2FA diperlukan.',
        };
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
      return {
        message: 'Login Google berhasil',
        token,
        user: {
          id: user.id,
          email: user.email,
          nama: user.nama,
          role: user.role,
          roles: user.roles,
          mustChangePassword: user.mustChangePassword,
          theme: user.theme,
          avatar: user.avatar,
        },
      };
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal memproses login Google Workspace.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async activateAccount({ body, set }: AuthContext): Promise<any> {
    try {
      const token = (body as { token?: string })?.token;
      if (!token) {
        set.status = 400;
        return { error: 'Token aktivasi wajib diisi.' };
      }

      const result = await AccountActivationService.verifyActivationToken(token);
      set.status = 200;
      return { message: 'Akun Anda berhasil diaktifkan. Silakan login.', email: result.email };
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal mengaktifkan akun.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async resendActivation({ body, set }: AuthContext): Promise<any> {
    try {
      const email = (body as { email?: string })?.email;
      if (!email) {
        set.status = 400;
        return { error: 'Email wajib diisi.' };
      }

      await AccountActivationService.resendActivationToken(email);
      set.status = 200;
      return { message: 'Tautan aktivasi baru telah dikirimkan ke email Anda.' };
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal mengirim ulang email aktivasi.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async twoFactorSetup({ set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu.' };
      }

      const { secret, otpauthUri } = TwoFactorService.generateSecret(currentUser.email);
      const qrCodeUrl = await TwoFactorService.generateQrCode(otpauthUri);

      set.status = 200;
      return { secret, qrCodeUrl, otpauthUri };
    } catch (err: unknown) {
      set.status = 500;
      return { error: 'Gagal menyiapkan 2FA.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async twoFactorEnable({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu.' };
      }

      const secret = (body as { secret?: string; code?: string })?.secret;
      const code = (body as { secret?: string; code?: string })?.code;

      if (!secret || !code) {
        set.status = 400;
        return { error: 'Secret dan kode 6-digit wajib diisi.' };
      }

      const isValid = TwoFactorService.verifyTotp(code, secret);
      if (!isValid) {
        set.status = 400;
        return { error: 'Kode 6-digit TOTP tidak valid. Pastikan waktu di perangkat Anda sesuai.' };
      }

      const { plainCodes, hashedCodes } = await TwoFactorService.generateRecoveryCodes();

      await db
        .update(users)
        .set({
          twoFactorEnabled: true,
          twoFactorSecret: secret,
          twoFactorRecoveryCodes: hashedCodes,
        })
        .where(eq(users.id, currentUser.id));

      set.status = 200;
      return {
        message: 'Autentikasi Dua Faktor (2FA) berhasil diaktifkan.',
        recoveryCodes: plainCodes,
      };
    } catch (err: unknown) {
      set.status = 500;
      return { error: 'Gagal mengaktifkan 2FA.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async twoFactorDisable({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu.' };
      }

      const password = (body as { password?: string; code?: string })?.password;
      const code = (body as { password?: string; code?: string })?.code;

      if (!password || !code) {
        set.status = 400;
        return { error: 'Kata sandi dan kode 6-digit wajib diisi.' };
      }

      const [fullUser] = await db.select().from(users).where(eq(users.id, currentUser.id)).limit(1);
      if (!fullUser) {
        set.status = 404;
        return { error: 'Pengguna tidak ditemukan.' };
      }

      const isMatch = await Bun.password.verify(password, fullUser.password);
      if (!isMatch) {
        set.status = 400;
        return { error: 'Kata sandi Anda salah.' };
      }

      if (!fullUser.twoFactorSecret) {
        set.status = 400;
        return { error: '2FA belum diaktifkan.' };
      }

      const isValid = TwoFactorService.verifyTotp(code, fullUser.twoFactorSecret);
      if (!isValid) {
        set.status = 400;
        return { error: 'Kode 6-digit TOTP tidak valid.' };
      }

      await db
        .update(users)
        .set({
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorRecoveryCodes: [],
        })
        .where(eq(users.id, currentUser.id));

      set.status = 200;
      return { message: 'Autentikasi Dua Faktor (2FA) telah dinonaktifkan.' };
    } catch (err: unknown) {
      set.status = 500;
      return { error: 'Gagal menonaktifkan 2FA.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async twoFactorVerifyLogin({ body, jwt, set, cookie }: AuthContext & { jwt: any }): Promise<any> {
    try {
      const twoFactorToken = (body as { twoFactorToken?: string; code?: string; isRecovery?: boolean })?.twoFactorToken;
      const code = (body as { twoFactorToken?: string; code?: string; isRecovery?: boolean })?.code;
      const isRecovery = (body as { twoFactorToken?: string; code?: string; isRecovery?: boolean })?.isRecovery;

      if (!twoFactorToken || !code) {
        set.status = 400;
        return { error: 'Token 2FA dan kode wajib diisi.' };
      }

      const payload = await jwt.verify(twoFactorToken);
      if (!payload || payload.stage !== '2fa_required' || !payload.id) {
        set.status = 401;
        return { error: 'Sesi 2FA tidak valid atau telah kedaluwarsa. Silakan login kembali.' };
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.id as number))
        .limit(1);
      if (!user || !user.isActive) {
        set.status = 401;
        return { error: 'Pengguna tidak ditemukan atau tidak aktif.' };
      }

      let isVerified = false;
      if (isRecovery) {
        isVerified = await TwoFactorService.verifyAndConsumeRecoveryCode(user.id, code);
      } else if (user.twoFactorSecret) {
        isVerified = TwoFactorService.verifyTotp(code, user.twoFactorSecret);
      }

      if (!isVerified) {
        set.status = 400;
        return {
          error: isRecovery ? 'Kode pemulihan backup tidak valid atau sudah digunakan.' : 'Kode 6-digit TOTP salah.',
        };
      }

      const roles = await AuthService.getRolesForUser(user.id);
      const token = await jwt.sign({
        id: user.id,
        email: user.email,
        nama: user.nama,
        role: user.role,
        roles,
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
        roles,
        mustChangePassword: user.mustChangePassword,
      };
      if (user.theme) userResponse.theme = user.theme;
      if (user.avatar) userResponse.avatar = user.avatar;

      return {
        message: 'Login 2FA berhasil',
        token,
        user: userResponse,
      };
    } catch (err: unknown) {
      set.status = 500;
      return { error: 'Gagal memverifikasi 2FA.' };
    }
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
            const retryAfter = Math.max(1, Math.ceil((limitRecord.resetTime - now) / 1000));
            return { error: 'Terlalu banyak permintaan. Silakan coba lagi dalam 15 menit.', retryAfter };
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

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async clearRateLimit({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !isSuperAdminOrAdmin(user)) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }

    const email = (body as { email?: string })?.email;
    if (!email) {
      set.status = 400;
      return { error: 'Email wajib diisi' };
    }

    const emailLower = email.toLowerCase().trim();
    const loginKey = `login:${emailLower}`;
    const forgotKey = `forgot:${emailLower}`;
    const loginCleared = loginRateLimit.delete(loginKey);
    const forgotCleared = forgotRateLimit.delete(forgotKey);

    if (!loginCleared && !forgotCleared) {
      set.status = 404;
      return { error: 'Tidak ada rate limit aktif untuk email tersebut.' };
    }

    return {
      message: 'Rate limit berhasil dibersihkan.',
      loginCleared,
      forgotCleared,
    };
  }
}
