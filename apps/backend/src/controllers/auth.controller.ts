import { eq } from 'drizzle-orm';
import { Resend } from 'resend';
import { users } from '../models/schema';
import { AccountActivationService } from '../services/account-activation.service';
import { AuthService } from '../services/auth.service';
import { SsoService } from '../services/sso.service';
import { SystemParameterService } from '../services/system-parameter.service';
import { TwoFactorService } from '../services/two-factor.service';
import { db } from '../utils/db';
import { getFrontendBaseUrl } from '../utils/frontend-url';
import { escapeHtml } from '../utils/html-escape';
import { PasswordValidationError, validatePassword } from '../utils/password-policy';
import { isSuperAdminOrAdmin } from '../utils/role';
import type { AuthContext } from '../utils/types';

const loginRateLimit = new Map<string, { count: number; resetTime: number }>();
const forgotRateLimit = new Map<string, { count: number; resetTime: number }>();

const TWO_FA_INTERIM_TTL_SECONDS = 10 * 60;

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const FORGOT_MAX_ATTEMPTS = 3;

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

function rateLimitKey(prefix: string, request: Request, email: string): string {
  return `${prefix}:${getClientIp(request)}:${email.toLowerCase().trim()}`;
}

function rateLimitCheck(
  map: Map<string, { count: number; resetTime: number }>,
  key: string,
  maxAttempts: number,
): { limited: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = map.get(key);
  if (!record || now >= record.resetTime) {
    map.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { limited: false };
  }
  record.count++;
  if (record.count >= maxAttempts) {
    return { limited: true, retryAfter: Math.max(1, Math.ceil((record.resetTime - now) / 1000)) };
  }
  return { limited: false };
}

// Bersihkan entri kedaluwarsa agar Map tidak bocor tak terbatas.
let rateLimitSweepTimer: ReturnType<typeof setInterval> | undefined;
function ensureRateLimitSweep() {
  if (rateLimitSweepTimer) return;
  rateLimitSweepTimer = setInterval(() => {
    const now = Date.now();
    for (const map of [loginRateLimit, forgotRateLimit]) {
      for (const [key, record] of map) {
        if (now >= record.resetTime) map.delete(key);
      }
    }
  }, RATE_LIMIT_WINDOW_MS);
  if (rateLimitSweepTimer.unref) rateLimitSweepTimer.unref();
}

export class AuthController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async logout({ set, cookie }: AuthContext): Promise<any> {
    if (cookie?.access_token) {
      cookie.access_token.remove();
    }
    set.status = 200;
    return { message: 'Logout berhasil' };
  }

  /**
   * Profil sesi yang sedang aktif, di-resolve dari cookie access_token (httpOnly)
   * maupun header Authorization. Endpoint ini menjadi sumber kebenaran frontend
   * untuk cookie-only auth: kembalikan identitas user + `exp` sesi (epoch detik)
   * untuk keperluan idle timer tanpa perlu menyimpan token di client.
   */
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async me({ getCurrentUser, jwt, headers, cookie, set }: AuthContext & { jwt: any }): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }

    const authHeader = headers?.['authorization'];
    const rawToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : cookie?.access_token?.value;
    let exp: number | undefined;
    if (typeof rawToken === 'string') {
      try {
        const payload = (await jwt.verify(rawToken)) as { exp?: number } | null;
        exp = payload?.exp;
      } catch {
        exp = undefined;
      }
    }

    const userResponse: Record<string, unknown> = {
      id: user.id,
      email: user.email,
      nama: user.nama,
      role: user.role,
      roles: user.roles,
      mustChangePassword: user.mustChangePassword,
      isGlobalScope: user.isGlobalScope ?? false,
    };
    return { user: userResponse, exp: typeof exp === 'number' ? exp : null };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async register({ body, set }: AuthContext): Promise<any> {
    const allowedRoles: string[] = ['dosen', 'mahasiswa', 'guest'];
    if (body.role && !allowedRoles.includes(body.role)) {
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
      if (e instanceof PasswordValidationError) {
        set.status = 422;
        return { error: e.message };
      }
      set.status = 400;
      return { error: 'Email sudah terdaftar' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async login({ body, jwt, set, cookie, request }: AuthContext & { jwt: any }): Promise<any> {
    if (process.env.NODE_ENV !== 'test') {
      ensureRateLimitSweep();
      const loginResult = rateLimitCheck(
        loginRateLimit,
        rateLimitKey('login', request, body.email),
        LOGIN_MAX_ATTEMPTS,
      );
      if (loginResult.limited) {
        set.status = 429;
        return { error: 'Terlalu banyak percobaan login. Silakan coba lagi.', retryAfter: loginResult.retryAfter };
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
      const now = Math.floor(Date.now() / 1000);
      const twoFactorToken = await jwt.sign({
        id: user.id,
        stage: '2fa_required',
        iat: now,
        exp: now + TWO_FA_INTERIM_TTL_SECONDS,
      });
      set.status = 200;
      return {
        requires2FA: true,
        twoFactorToken,
        message: 'Verifikasi 2FA diperlukan.',
      };
    }

    const sessionDurationSeconds = await SystemParameterService.getSessionDurationSeconds();
    const sessionEpoch = await SystemParameterService.getSessionEpoch();
    const now = Math.floor(Date.now() / 1000);
    const token = await jwt.sign({
      id: user.id,
      email: user.email,
      nama: user.nama,
      role: user.role,
      roles: user.roles,
      mustChangePassword: user.mustChangePassword,
      isGlobalScope: user.isGlobalScope ?? false,
      sessEpoch: sessionEpoch,
      iat: now,
      exp: now + sessionDurationSeconds,
    });

    if (cookie?.access_token) {
      cookie.access_token.set({
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        path: '/',
        sameSite: 'strict',
        maxAge: sessionDurationSeconds,
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
      twoFactorEnabled: user.twoFactorEnabled ?? false,
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
    try {
      const url = SsoService.getGoogleAuthUrl();
      set.status = 200;
      return { url };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal menghasilkan URL autentikasi Google' };
    }
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
        const now = Math.floor(Date.now() / 1000);
        const twoFactorToken = await jwt.sign({
          id: user.id,
          stage: '2fa_required',
          iat: now,
          exp: now + TWO_FA_INTERIM_TTL_SECONDS,
        });
        set.status = 200;
        return {
          requires2FA: true,
          twoFactorToken,
          message: 'Verifikasi 2FA diperlukan.',
        };
      }

      const sessionDurationSeconds = await SystemParameterService.getSessionDurationSeconds();
      const sessionEpoch = await SystemParameterService.getSessionEpoch();
      const now = Math.floor(Date.now() / 1000);
      const token = await jwt.sign({
        id: user.id,
        email: user.email,
        nama: user.nama,
        role: user.role,
        roles: user.roles,
        mustChangePassword: user.mustChangePassword,
        isGlobalScope: user.isGlobalScope ?? false,
        sessEpoch: sessionEpoch,
        iat: now,
        exp: now + sessionDurationSeconds,
      });

      if (cookie?.access_token) {
        cookie.access_token.set({
          value: token,
          httpOnly: true,
          secure: process.env.NODE_ENV !== 'development',
          path: '/',
          sameSite: 'strict',
          maxAge: sessionDurationSeconds,
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
          twoFactorEnabled: user.twoFactorEnabled ?? false,
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
      const sessionDurationSeconds = await SystemParameterService.getSessionDurationSeconds();
      const sessionEpoch = await SystemParameterService.getSessionEpoch();
      const now = Math.floor(Date.now() / 1000);
      const token = await jwt.sign({
        id: user.id,
        email: user.email,
        nama: user.nama,
        role: user.role,
        roles,
        mustChangePassword: user.mustChangePassword,
        isGlobalScope: user.isGlobalScope ?? false,
        sessEpoch: sessionEpoch,
        iat: now,
        exp: now + sessionDurationSeconds,
      });

      if (cookie?.access_token) {
        cookie.access_token.set({
          value: token,
          httpOnly: true,
          secure: process.env.NODE_ENV !== 'development',
          path: '/',
          sameSite: 'strict',
          maxAge: sessionDurationSeconds,
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
        twoFactorEnabled: true,
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
  static async forgotPassword({ body, set, request }: AuthContext): Promise<any> {
    try {
      const email = (body as { email?: string })?.email;
      if (!email) {
        set.status = 400;
        return { error: 'Email wajib diisi' };
      }

      ensureRateLimitSweep();
      const forgotResult = rateLimitCheck(forgotRateLimit, rateLimitKey('forgot', request, email), FORGOT_MAX_ATTEMPTS);
      if (forgotResult.limited) {
        set.status = 429;
        return {
          error: 'Terlalu banyak permintaan. Silakan coba lagi dalam 15 menit.',
          retryAfter: forgotResult.retryAfter,
        };
      }

      const emailLower = email.toLowerCase().trim();

      const token = await AuthService.createPasswordResetForEmail(emailLower);
      if (token) {
        const resendApiKey = process.env.RESEND_API_KEY;
        if (resendApiKey) {
          const resetLink = `${getFrontendBaseUrl()}/reset-password?token=${token}`;

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
                    <a href="${escapeHtml(resetLink)}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Atur Ulang Kata Sandi</a>
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

      const passwordError = validatePassword(password);
      if (passwordError) {
        set.status = 400;
        return { error: passwordError };
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
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!isSuperAdminOrAdmin(user)) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }

    const email = (body as { email?: string })?.email;
    if (!email) {
      set.status = 400;
      return { error: 'Email wajib diisi' };
    }

    const emailLower = email.toLowerCase().trim();
    const loginPrefix = `login:`;
    const forgotPrefix = `forgot:`;

    // Kumpulkan key dulu, baru hapus (hindari mutasi Map saat iterasi).
    const loginKeysToDelete = Array.from(loginRateLimit.keys()).filter(
      (key) => key.startsWith(loginPrefix) && key.endsWith(`:${emailLower}`),
    );
    const forgotKeysToDelete = Array.from(forgotRateLimit.keys()).filter(
      (key) => key.startsWith(forgotPrefix) && key.endsWith(`:${emailLower}`),
    );
    const loginCleared = loginKeysToDelete.length > 0;
    const forgotCleared = forgotKeysToDelete.length > 0;

    for (const key of loginKeysToDelete) loginRateLimit.delete(key);
    for (const key of forgotKeysToDelete) forgotRateLimit.delete(key);

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
