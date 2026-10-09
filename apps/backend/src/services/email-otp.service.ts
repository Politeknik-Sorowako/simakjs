import { and, eq } from 'drizzle-orm';
import { Resend } from 'resend';
import { emailVerificationCodes, users } from '../models/schema';
import { db } from '../utils/db';
import { getEmailFrom } from '../utils/email';
import { escapeHtml } from '../utils/html-escape';

const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

export async function hashOtp(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateNumericOtp(): string {
  if (process.env.NODE_ENV === 'test') {
    return '123456';
  }
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const val = array[0] % 1000000;
  return val.toString().padStart(6, '0');
}

export type OtpContext = 'activation' | 'password_reset';

export class EmailOtpService {
  static async generateAndSendOtp(
    emailInput: string,
    context: OtpContext,
    namaParam?: string,
  ): Promise<{ success: boolean; message: string; cooldownRemaining?: number }> {
    const email = emailInput.toLowerCase().trim();

    // Check user for activation or password_reset context
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (context === 'activation') {
      if (!user || user.isActive) {
        // Anti-enumeration: return generic success without sending email if invalid or already active
        return {
          success: true,
          message: 'Jika email terdaftar dan belum aktif, kode OTP 6-digit telah dikirim ke email Anda.',
        };
      }
    } else if (context === 'password_reset') {
      if (!user) {
        // Anti-enumeration
        return {
          success: true,
          message: 'Jika email terdaftar, kode OTP 6-digit reset password telah dikirim ke email Anda.',
        };
      }
    }

    const now = new Date();

    // Check existing active OTP for cooldown
    const [existing] = await db
      .select()
      .from(emailVerificationCodes)
      .where(and(eq(emailVerificationCodes.email, email), eq(emailVerificationCodes.context, context)))
      .limit(1);

    if (existing && existing.resendAfter > now && process.env.NODE_ENV !== 'test') {
      const cooldownRemaining = Math.ceil((existing.resendAfter.getTime() - now.getTime()) / 1000);
      return {
        success: false,
        message: `Harap tunggu ${cooldownRemaining} detik sebelum meminta kode OTP baru.`,
        cooldownRemaining,
      };
    }

    const otpCode = generateNumericOtp();
    const codeHash = await hashOtp(otpCode);
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const resendAfter = new Date(now.getTime() + RESEND_COOLDOWN_SECONDS * 1000);

    // Remove existing OTP for this email & context
    await db
      .delete(emailVerificationCodes)
      .where(and(eq(emailVerificationCodes.email, email), eq(emailVerificationCodes.context, context)));

    await db.insert(emailVerificationCodes).values({
      userId: user ? user.id : null,
      email,
      codeHash,
      context,
      attempts: 0,
      expiresAt,
      resendAfter,
    });

    // Send Email
    const targetNama = namaParam || (user ? user.nama : 'Pengguna');
    await EmailOtpService.sendOtpEmail(email, targetNama, otpCode, context);

    return {
      success: true,
      message:
        context === 'activation'
          ? 'Kode OTP aktivasi 6-digit telah dikirim ke email Anda.'
          : 'Kode OTP reset password 6-digit telah dikirim ke email Anda.',
    };
  }

  static async sendOtpEmail(email: string, nama: string, otpCode: string, context: OtpContext): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn(`[2FA Email OTP] RESEND_API_KEY tidak dikonfigurasi. OTP ${context} untuk ${email}:`, otpCode);
      return;
    }

    const title = context === 'activation' ? 'Kode OTP Aktivasi Akun' : 'Kode OTP Reset Kata Sandi';
    const description =
      context === 'activation'
        ? 'Gunakan kode OTP 6-digit di bawah ini untuk mengaktifkan akun SIMAK Vokasi Anda:'
        : 'Gunakan kode OTP 6-digit di bawah ini untuk mereset kata sandi akun SIMAK Vokasi Anda:';

    try {
      const resend = new Resend(resendApiKey);
      const { error: sendError } = await resend.emails.send({
        from: getEmailFrom(),
        to: [email],
        subject: `${title} - SIMAK Vokasi`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #1e3a8a; margin: 0; font-size: 20px;">SIMAK Vokasi</h2>
              <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Pendidikan Vokasi Politeknik Sorowako</p>
            </div>
            <p style="color: #334155; font-size: 14px;">Halo <strong>${escapeHtml(nama)}</strong>,</p>
            <p style="color: #334155; font-size: 14px; line-height: 1.5;">${description}</p>
            
            <div style="margin: 28px 0; text-align: center;">
              <div style="display: inline-block; background-color: #f1f5f9; padding: 16px 28px; border-radius: 12px; letter-spacing: 8px; font-size: 28px; font-weight: 800; color: #2563eb; border: 1px solid #cbd5e1; font-family: monospace;">
                ${otpCode}
              </div>
            </div>

            <p style="color: #64748b; font-size: 12px; text-align: center;">Kode OTP ini berlaku selama <strong>10 menit</strong>. Jangan bagikan kode ini kepada siapapun demi keamanan akun Anda.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #94a3b8; font-size: 11px; text-align: center;">Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini.</p>
          </div>
        `,
      });

      if (sendError) {
        console.error(`Gagal mengirim email OTP ${context}:`, sendError.message);
      }
    } catch (err: unknown) {
      console.error(`Error saat mengirim email OTP ${context}:`, err instanceof Error ? err.message : err);
    }
  }

  static async verifyOtp(
    emailInput: string,
    code: string,
    context: OtpContext,
  ): Promise<{ valid: boolean; message: string; userId?: number }> {
    const email = emailInput.toLowerCase().trim();
    const cleanCode = code.trim();

    if (!cleanCode || cleanCode.length !== 6) {
      return { valid: false, message: 'Kode OTP harus berupa 6 digit angka.' };
    }

    const [record] = await db
      .select()
      .from(emailVerificationCodes)
      .where(and(eq(emailVerificationCodes.email, email), eq(emailVerificationCodes.context, context)))
      .limit(1);

    if (!record) {
      return { valid: false, message: 'Kode OTP tidak ditemukan atau telah kedaluwarsa. Silakan minta kode baru.' };
    }

    const now = new Date();
    if (record.expiresAt < now) {
      await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.id, record.id));
      return { valid: false, message: 'Kode OTP telah kedaluwarsa. Silakan minta kode OTP baru.' };
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.id, record.id));
      return {
        valid: false,
        message: 'Batas percobaan input OTP telah terlampaui. Silakan minta kode OTP baru.',
      };
    }

    const inputHash = await hashOtp(cleanCode);
    const hashA = Buffer.from(inputHash, 'hex');
    const hashB = Buffer.from(record.codeHash, 'hex');
    const isMatch = hashA.length === hashB.length && crypto.timingSafeEqual(hashA, hashB);

    if (!isMatch) {
      const newAttempts = record.attempts + 1;
      if (newAttempts >= MAX_ATTEMPTS) {
        await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.id, record.id));
        return {
          valid: false,
          message: 'Kode OTP salah. Batas percobaan habis. Silakan minta kode OTP baru.',
        };
      }

      await db
        .update(emailVerificationCodes)
        .set({ attempts: newAttempts })
        .where(eq(emailVerificationCodes.id, record.id));

      const sisa = MAX_ATTEMPTS - newAttempts;
      return {
        valid: false,
        message: `Kode OTP salah. Sisa kesempatan percobaan: ${sisa}x.`,
      };
    }

    // OTP Valid -> Hapus record OTP agar tidak bisa dipakai ulang (one-time use)
    await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.id, record.id));

    return {
      valid: true,
      message: 'Kode OTP valid.',
      userId: record.userId ?? undefined,
    };
  }
}
