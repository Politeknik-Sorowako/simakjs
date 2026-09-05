import { eq } from 'drizzle-orm';
import { Resend } from 'resend';
import { accountActivations, users } from '../models/schema';
import { db } from '../utils/db';

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export class AccountActivationService {
  static async createActivationToken(userId: number, email: string): Promise<string> {
    const rawToken = crypto.randomUUID();
    const tokenHash = await hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000); // 24 jam

    // Clean existing tokens for this user
    await db.delete(accountActivations).where(eq(accountActivations.userId, userId));

    await db.insert(accountActivations).values({
      userId,
      email: email.toLowerCase().trim(),
      token: tokenHash,
      expiresAt,
    });

    return rawToken;
  }

  static async sendActivationEmail(email: string, nama: string, token: string): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY tidak dikonfigurasi. Token aktivasi:', token);
      return;
    }

    const domainName = process.env.DOMAIN_NAME || 'localhost';
    const protocol = domainName === 'localhost' ? 'http' : 'https';
    const port = domainName === 'localhost' ? ':8080' : '';
    const activationLink = `${protocol}://${domainName}${port}/aktivasi-akun?token=${token}`;

    try {
      const resend = new Resend(resendApiKey);
      const { error: sendError } = await resend.emails.send({
        from: 'SIMAK Vokasi <onboarding@resend.dev>',
        to: [email],
        subject: 'Aktivasi Akun SIMAK Vokasi',
        html: `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #1e3a8a; margin-top: 0; margin-bottom: 16px;">Selamat Datang di SIMAK Vokasi</h2>
            <p style="color: #334155; font-size: 15px;">Halo <strong>${nama}</strong>,</p>
            <p style="color: #334155; font-size: 15px;">Terima kasih telah mendaftar di Sistem Informasi Akademik Vokasi (SIMAK). Silakan aktifkan akun Anda dengan mengklik tombol di bawah ini:</p>
            <div style="margin: 28px 0; text-align: center;">
              <a href="${activationLink}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 15px; box-shadow: 0 2px 4px rgba(37,99,235,0.2);">Aktifkan Akun Saya</a>
            </div>
            <p style="color: #64748b; font-size: 13px;">Tautan ini berlaku selama 24 jam. Jika Anda tidak merasa mendaftar akun di SIMAK Vokasi, abaikan email ini.</p>
          </div>
        `,
      });

      if (sendError) {
        console.error('Gagal mengirim email aktivasi:', sendError.message);
      }
    } catch (err: unknown) {
      console.error('Error saat mengirim email aktivasi:', err instanceof Error ? err.message : err);
    }
  }

  static async verifyActivationToken(rawToken: string): Promise<{ userId: number; email: string }> {
    const tokenHash = await hashToken(rawToken);

    const [record] = await db.select().from(accountActivations).where(eq(accountActivations.token, tokenHash)).limit(1);

    if (!record) {
      throw new Error('Token aktivasi tidak valid atau sudah digunakan.');
    }

    if (record.expiresAt < new Date()) {
      await db.delete(accountActivations).where(eq(accountActivations.id, record.id));
      throw new Error('Token aktivasi telah kedaluwarsa. Silakan minta tautan aktivasi baru.');
    }

    // Set user active
    await db.update(users).set({ isActive: true }).where(eq(users.id, record.userId));

    // Delete used activation token
    await db.delete(accountActivations).where(eq(accountActivations.id, record.id));

    return {
      userId: record.userId,
      email: record.email,
    };
  }

  static async resendActivationToken(email: string): Promise<string> {
    const emailLower = email.toLowerCase().trim();
    const [user] = await db.select().from(users).where(eq(users.email, emailLower)).limit(1);

    if (!user) {
      throw new Error('Akun dengan email tersebut tidak ditemukan.');
    }

    if (user.isActive) {
      throw new Error('Akun Anda sudah aktif. Silakan langsung login.');
    }

    const token = await AccountActivationService.createActivationToken(user.id, user.email);
    await AccountActivationService.sendActivationEmail(user.email, user.nama, token);

    return token;
  }
}
