import { beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import { passwordResets, users } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, ErrorResponse, LoginSuccessResponse, RegisterSuccessResponse } from './test-helper';

describe('1. Autentikasi (/auth)', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /auth/register', () => {
    it('harus sukses registrasi user baru dengan data valid', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'admin@test.com',
            password: 'password123',
            nama: 'Admin Test',
            role: 'admin',
          }),
        }),
      );

      expect(response.status).toBe(201);
      const body = (await response.json()) as RegisterSuccessResponse;
      expect(body.message).toBe('Registrasi berhasil');
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe('admin@test.com');
      expect(body.user.role).toBe('admin');
      expect((body.user as any).password).toBeUndefined();
    });

    it('harus gagal registrasi jika email sudah terdaftar', async () => {
      const payload = {
        email: 'duplicate@test.com',
        password: 'password123',
        nama: 'Duplicate Test',
        role: 'mahasiswa' as const,
      };

      await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
      );

      const response = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
      );

      expect(response.status).toBe(400);
      const body = (await response.json()) as ErrorResponse;
      expect(body.error).toBe('Email sudah terdaftar');
    });

    it('harus gagal registrasi jika format email tidak valid', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'invalid-email-format',
            password: 'password123',
            nama: 'Invalid Test',
            role: 'mahasiswa',
          }),
        }),
      );

      expect(response.status).toBe(422);
    });

    it('harus gagal registrasi jika password kurang dari 6 karakter', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'shortpass@test.com',
            password: '12345',
            nama: 'Short Test',
            role: 'mahasiswa',
          }),
        }),
      );

      expect(response.status).toBe(422);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'user@test.com',
            password: 'password123',
            nama: 'User Test',
            role: 'mahasiswa',
          }),
        }),
      );
    });

    it('harus gagal login jika akun belum diaktifkan (inactive)', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'user@test.com',
            password: 'password123',
          }),
        }),
      );

      expect(response.status).toBe(403);
      const body = (await response.json()) as ErrorResponse;
      expect(body.error).toBe('Akun Anda belum diaktifkan oleh Admin');
    });

    it('harus sukses login jika akun sudah diaktifkan (active)', async () => {
      // Activate user directly in database
      await db.update(users).set({ isActive: true }).where(eq(users.email, 'user@test.com'));

      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'user@test.com',
            password: 'password123',
          }),
        }),
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as LoginSuccessResponse;
      expect(body.message).toBe('Login berhasil');
      expect(body.token).toBeDefined();
      expect(body.user.email).toBe('user@test.com');
    });

    it('harus gagal login jika email belum terdaftar', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'unregistered@test.com',
            password: 'password123',
          }),
        }),
      );

      expect(response.status).toBe(401);
      const body = (await response.json()) as ErrorResponse;
      expect(body.error).toBe('Email atau password salah');
    });

    it('harus gagal login dengan password yang salah', async () => {
      // Activate user first
      await db.update(users).set({ isActive: true }).where(eq(users.email, 'user@test.com'));

      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'user@test.com',
            password: 'wrongpassword',
          }),
        }),
      );

      expect(response.status).toBe(401);
      const body = (await response.json()) as ErrorResponse;
      expect(body.error).toBe('Email atau password salah');
    });
  });

  describe('Password Reset Flow', () => {
    beforeEach(async () => {
      await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'reset@test.com',
            password: 'oldpassword123',
            nama: 'Reset Test',
            role: 'mahasiswa',
          }),
        }),
      );
    });

    it('harus sukses membuat token reset password untuk email terdaftar', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'reset@test.com' }),
        }),
      );

      expect(response.status).toBe(200);
      const body = (await response.json()) as any;
      expect(body.message).toContain('berhasil dibuat');
    });

    it('harus gagal membuat token jika email tidak terdaftar', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'nonexistent@test.com' }),
        }),
      );

      expect(response.status).toBe(404);
    });

    it('harus sukses mereset password dengan token valid', async () => {
      const forgotResponse = await app.handle(
        new Request('http://localhost/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'reset@test.com' }),
        }),
      );
      expect(forgotResponse.status).toBe(200);

      // Get token from database
      const [resetRecord] = await db
        .select()
        .from(passwordResets)
        .where(eq(passwordResets.email, 'reset@test.com'))
        .limit(1);
      const token = resetRecord.token;

      const resetResponse = await app.handle(
        new Request('http://localhost/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password: 'newpassword123' }),
        }),
      );

      expect(resetResponse.status).toBe(200);
      const resetBody = (await resetResponse.json()) as any;
      expect(resetBody.message).toBe('Password Anda berhasil diubah. Silakan login kembali.');

      // Try logging in with new password (activate first)
      await db.update(users).set({ isActive: true }).where(eq(users.email, 'reset@test.com'));
      const loginResponse = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'reset@test.com', password: 'newpassword123' }),
        }),
      );
      expect(loginResponse.status).toBe(200);
    });
  });
});
