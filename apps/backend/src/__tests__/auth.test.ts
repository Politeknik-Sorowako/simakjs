import { describe, it, expect, beforeEach } from 'bun:test';
import { app } from '../index';
import { clearDatabase, RegisterSuccessResponse, LoginSuccessResponse, ErrorResponse } from './test-helper';

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
            role: 'admin',
          }),
        })
      );

      expect(response.status).toBe(201);
      const body = await response.json() as RegisterSuccessResponse;
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
        role: 'mahasiswa' as const,
      };

      await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      );

      const response = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      );

      expect(response.status).toBe(400);
      const body = await response.json() as ErrorResponse;
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
            role: 'mahasiswa',
          }),
        })
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
            role: 'mahasiswa',
          }),
        })
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
            role: 'mahasiswa',
          }),
        })
      );
    });

    it('harus sukses login dengan email & password valid', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'user@test.com',
            password: 'password123',
          }),
        })
      );

      expect(response.status).toBe(200);
      const body = await response.json() as LoginSuccessResponse;
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
        })
      );

      expect(response.status).toBe(401);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Email atau password salah');
    });

    it('harus gagal login dengan password yang salah', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'user@test.com',
            password: 'wrongpassword',
          }),
        })
      );

      expect(response.status).toBe(401);
      const body = await response.json() as ErrorResponse;
      expect(body.error).toBe('Email atau password salah');
    });
  });
});
