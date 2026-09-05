import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { users } from '../models/schema';
import { AccountActivationService } from '../services/account-activation.service';
import { SsoService } from '../services/sso.service';
import { TwoFactorService } from '../services/two-factor.service';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Autentikasi Lanjutan: SSO, Aktivasi Email & 2FA', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('1. Aktivasi Akun via Email Link', () => {
    it('harus berhasil membuat token aktivasi dan mengaktifkan akun', async () => {
      // 1. Register new user (default isActive = false)
      const regRes = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'mahasiswa@politekniksorowako.ac.id',
            password: 'password123',
            nama: 'Mahasiswa Test',
            role: 'mahasiswa',
          }),
        }),
      );
      expect(regRes.status).toBe(201);

      // 2. Fetch created user
      const user = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.email, 'mahasiswa@politekniksorowako.ac.id'),
      });
      expect(user).toBeDefined();
      expect(user?.isActive).toBe(false);

      // 3. Create activation token
      const token = await AccountActivationService.createActivationToken(user!.id, user!.email);
      expect(token).toBeDefined();

      // 4. Verify activation token via endpoint
      const actRes = await app.handle(
        new Request('http://localhost/auth/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        }),
      );
      expect(actRes.status).toBe(200);

      // 5. Verify user is now active in DB
      const updatedUser = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.id, user!.id),
      });
      expect(updatedUser?.isActive).toBe(true);
    });

    it('harus gagal mengaktifkan akun dengan token yang salah', async () => {
      const actRes = await app.handle(
        new Request('http://localhost/auth/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: 'invalid-token-12345' }),
        }),
      );
      expect(actRes.status).toBe(400);
    });

    it('harus sukses mengirim ulang email aktivasi', async () => {
      const regRes = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'resend@politekniksorowako.ac.id',
            password: 'password123',
            nama: 'Resend Test',
            role: 'mahasiswa',
          }),
        }),
      );
      expect(regRes.status).toBe(201);

      const resendRes = await app.handle(
        new Request('http://localhost/auth/resend-activation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'resend@politekniksorowako.ac.id' }),
        }),
      );
      expect(resendRes.status).toBe(200);
    });
  });

  describe('2. Two-Factor Authentication (2FA TOTP)', () => {
    it('harus sukses inisialisasi setup 2FA untuk user terautentikasi', async () => {
      const token = await getAuthToken('user2fa@politekniksorowako.ac.id', 'mahasiswa', true);

      const setupRes = await app.handle(
        new Request('http://localhost/auth/2fa/setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }),
      );

      expect(setupRes.status).toBe(200);
      const body = (await setupRes.json()) as { secret: string; qrCodeUrl: string; otpauthUri: string };
      expect(body.secret).toBeDefined();
      expect(body.qrCodeUrl).toContain('data:image/png;base64');
      expect(body.otpauthUri).toContain('otpauth://totp/');
    });

    it('harus sukses mengaktifkan 2FA, login dengan 2FA challenge, dan verifikasi TOTP', async () => {
      // 1. Create active user & auth token
      const authToken = await getAuthToken('active2fa@politekniksorowako.ac.id', 'dosen', true);

      // 2. Generate secret
      const { secret } = TwoFactorService.generateSecret('active2fa@politekniksorowako.ac.id');

      // 3. Generate valid 6-digit TOTP code
      const totpCode = new (await import('otpauth')).TOTP({
        issuer: 'SIMAK Vokasi',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: (await import('otpauth')).Secret.fromBase32(secret),
      }).generate();

      // 4. Enable 2FA
      const enableRes = await app.handle(
        new Request('http://localhost/auth/2fa/enable', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ secret, code: totpCode }),
        }),
      );

      expect(enableRes.status).toBe(200);
      const enableData = (await enableRes.json()) as { recoveryCodes: string[] };
      expect(enableData.recoveryCodes.length).toBe(8);

      // 5. Attempt normal login -> Should trigger 2FA challenge
      const loginRes = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'active2fa@politekniksorowako.ac.id',
            password: 'password123',
          }),
        }),
      );

      expect(loginRes.status).toBe(200);
      const loginData = (await loginRes.json()) as { requires2FA: boolean; twoFactorToken: string };
      expect(loginData.requires2FA).toBe(true);
      expect(loginData.twoFactorToken).toBeDefined();

      // 6. Complete 2FA login with 6-digit code
      const validCode = new (await import('otpauth')).TOTP({
        issuer: 'SIMAK Vokasi',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: (await import('otpauth')).Secret.fromBase32(secret),
      }).generate();

      const verifyRes = await app.handle(
        new Request('http://localhost/auth/2fa/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            twoFactorToken: loginData.twoFactorToken,
            code: validCode,
          }),
        }),
      );

      expect(verifyRes.status).toBe(200);
      const verifyData = (await verifyRes.json()) as { token: string; user: { email: string } };
      expect(verifyData.token).toBeDefined();
      expect(verifyData.user.email).toBe('active2fa@politekniksorowako.ac.id');
    });

    it('harus sukses login menggunakan backup recovery code', async () => {
      const authToken = await getAuthToken('recovery2fa@politekniksorowako.ac.id', 'mahasiswa', true);
      const { secret } = TwoFactorService.generateSecret('recovery2fa@politekniksorowako.ac.id');

      const totpCode = new (await import('otpauth')).TOTP({
        issuer: 'SIMAK Vokasi',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: (await import('otpauth')).Secret.fromBase32(secret),
      }).generate();

      const enableRes = await app.handle(
        new Request('http://localhost/auth/2fa/enable', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ secret, code: totpCode }),
        }),
      );

      const enableData = (await enableRes.json()) as { recoveryCodes: string[] };
      const sampleRecoveryCode = enableData.recoveryCodes[0];

      // Login step 1
      const loginRes = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'recovery2fa@politekniksorowako.ac.id',
            password: 'password123',
          }),
        }),
      );

      const loginData = (await loginRes.json()) as { twoFactorToken: string };

      // Verify step 2 using recovery code
      const verifyRes = await app.handle(
        new Request('http://localhost/auth/2fa/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            twoFactorToken: loginData.twoFactorToken,
            code: sampleRecoveryCode,
            isRecovery: true,
          }),
        }),
      );

      expect(verifyRes.status).toBe(200);

      // Re-using the same recovery code must fail
      const reuseRes = await app.handle(
        new Request('http://localhost/auth/2fa/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            twoFactorToken: loginData.twoFactorToken,
            code: sampleRecoveryCode,
            isRecovery: true,
          }),
        }),
      );
      expect(reuseRes.status).toBe(400);
    });
  });

  describe('3. Google Workspace SSO Login', () => {
    it('harus mengembalikan URL autentikasi Google OAuth', async () => {
      const urlRes = await app.handle(new Request('http://localhost/auth/google/url'));
      expect(urlRes.status).toBe(200);
      const data = (await urlRes.json()) as { url: string };
      expect(data.url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(data.url).toContain('hd=politekniksorowako.ac.id');
    });

    it('harus sukses menyinkronkan & membuat pengguna berdomain @politekniksorowako.ac.id', async () => {
      const profile = {
        id: 'google-uid-12345',
        email: 'dosen.sso@politekniksorowako.ac.id',
        name: 'Dosen SSO',
        hd: 'politekniksorowako.ac.id',
        email_verified: true,
      };

      const user = await SsoService.findOrCreateGoogleUser(profile);
      expect(user).toBeDefined();
      expect(user.email).toBe('dosen.sso@politekniksorowako.ac.id');
      expect(user.isActive).toBe(true);

      // Verify Google ID linked in DB
      const dbUser = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.email, 'dosen.sso@politekniksorowako.ac.id'),
      });
      expect(dbUser?.googleId).toBe('google-uid-12345');
      expect(dbUser?.authProvider).toBe('google');
    });

    it('harus menolak pengguna dari domain di luar @politekniksorowako.ac.id', async () => {
      // Mock exchange code to return external domain
      const originalExchange = SsoService.exchangeCodeForGoogleUser;
      SsoService.exchangeCodeForGoogleUser = async () => ({
        id: 'google-uid-67890',
        email: 'attacker@gmail.com',
        name: 'Attacker',
        hd: 'gmail.com',
      });

      try {
        const callbackRes = await app.handle(
          new Request('http://localhost/auth/google/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: 'mock-code' }),
          }),
        );
        expect(callbackRes.status).toBe(400);
        const data = (await callbackRes.json()) as { error: string };
        expect(data.error).toContain('tidak diizinkan');
      } finally {
        SsoService.exchangeCodeForGoogleUser = originalExchange;
      }
    });
  });
});
