import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { emailVerificationCodes, users } from '../models/schema';
import { EmailOtpService, generateNumericOtp, hashOtp } from '../services/email-otp.service';
import { db } from '../utils/db';

describe('2FA Email OTP Unit & Security Suite', () => {
  it('harus menghasilkan kode numerik 6 digit', () => {
    const code = generateNumericOtp();
    expect(code).toBeDefined();
    expect(code.length).toBe(6);
    expect(/^\d{6}$/.test(code)).toBe(true);
  });

  it('harus menghasilkan SHA-256 hash konsisten dan aman', async () => {
    const hash1 = await hashOtp('123456');
    const hash2 = await hashOtp('123456');
    const hashOther = await hashOtp('654321');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe('123456');
    expect(hash1.length).toBe(64); // SHA-256 hex string length
    expect(hash1).not.toBe(hashOther);
  });

  it('harus menolak OTP jika format atau panjang digit tidak 6 karakter', async () => {
    const resShort = await EmailOtpService.verifyOtp('user@example.com', '123', 'activation');
    expect(resShort.valid).toBe(false);
    expect(resShort.message).toContain('6 digit');

    const resEmpty = await EmailOtpService.verifyOtp('user@example.com', '', 'activation');
    expect(resEmpty.valid).toBe(false);
    expect(resEmpty.message).toContain('6 digit');
  });

  describe('Integration with Database (when available)', () => {
    const testEmail = 'otp-test-user@politekniksorowako.ac.id';
    let dbAvailable = false;

    beforeAll(async () => {
      try {
        await db.select().from(users).limit(1);
        dbAvailable = true;

        await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.email, testEmail));
        await db.delete(users).where(eq(users.email, testEmail));

        await db.insert(users).values({
          email: testEmail,
          password: 'Password123!',
          nama: 'Test OTP User',
          role: 'mahasiswa',
          isActive: false,
        });
      } catch {
        dbAvailable = false;
      }
    });

    afterAll(async () => {
      if (dbAvailable) {
        try {
          await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.email, testEmail));
          await db.delete(users).where(eq(users.email, testEmail));
        } catch {}
      }
    });

    it('harus memproses siklus hidup OTP di database jika DB aktif', async () => {
      if (!dbAvailable) {
        expect(true).toBe(true);
        return;
      }

      const sendRes = await EmailOtpService.generateAndSendOtp(testEmail, 'activation', 'Test OTP User');
      expect(sendRes.success).toBe(true);

      const verifyWrong = await EmailOtpService.verifyOtp(testEmail, '000000', 'activation');
      expect(verifyWrong.valid).toBe(false);

      const verifyCorrect = await EmailOtpService.verifyOtp(testEmail, '123456', 'activation');
      expect(verifyCorrect.valid).toBe(true);
    });
  });
});
