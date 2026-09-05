import { eq } from 'drizzle-orm';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { users } from '../models/schema';
import { db } from '../utils/db';

async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code.trim().toUpperCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export class TwoFactorService {
  static generateSecret(userEmail: string): { secret: string; otpauthUri: string } {
    const secret = new OTPAuth.Secret({ size: 20 });
    const secretBase32 = secret.base32;

    const totp = new OTPAuth.TOTP({
      issuer: 'SIMAK Vokasi',
      label: userEmail,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });

    return {
      secret: secretBase32,
      otpauthUri: totp.toString(),
    };
  }

  static async generateQrCode(otpauthUri: string): Promise<string> {
    return await QRCode.toDataURL(otpauthUri, {
      margin: 2,
      width: 240,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  }

  static verifyTotp(token: string, secretBase32: string): boolean {
    try {
      const totp = new OTPAuth.TOTP({
        issuer: 'SIMAK Vokasi',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secretBase32),
      });

      // Window of 1 means delta can be -1, 0, or 1 (allows 30-second clock skew)
      const delta = totp.validate({ token: token.trim(), window: 1 });
      return delta !== null;
    } catch (_) {
      return false;
    }
  }

  static async generateRecoveryCodes(count = 8): Promise<{ plainCodes: string[]; hashedCodes: string[] }> {
    const plainCodes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < count; i++) {
      const p1 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const p2 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = `${p1}-${p2}`;
      plainCodes.push(code);
      hashedCodes.push(await hashCode(code));
    }

    return { plainCodes, hashedCodes };
  }

  static async verifyAndConsumeRecoveryCode(userId: number, inputCode: string): Promise<boolean> {
    const [user] = await db
      .select({ recoveryCodes: users.twoFactorRecoveryCodes })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.recoveryCodes || user.recoveryCodes.length === 0) {
      return false;
    }

    const hashedInput = await hashCode(inputCode);
    const index = user.recoveryCodes.indexOf(hashedInput);

    if (index === -1) {
      return false;
    }

    // Code matches: remove consumed recovery code
    const updatedCodes = [...user.recoveryCodes];
    updatedCodes.splice(index, 1);

    await db.update(users).set({ twoFactorRecoveryCodes: updatedCodes }).where(eq(users.id, userId));
    return true;
  }
}
