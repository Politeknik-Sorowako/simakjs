import { beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import { users } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase } from './test-helper';

async function loginViaApi(email: string, password: string) {
  const res = await app.handle(
    new Request('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),
  );
  return res;
}

function extractCookie(res: Response): string | null {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return null;
  return setCookie.split(';')[0].trim();
}

describe('GET /auth/me', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  async function registerAndActivate(email: string, password: string) {
    await app.handle(
      new Request('http://localhost/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, nama: 'Me Test', role: 'mahasiswa' }),
      }),
    );
    await db.update(users).set({ isActive: true }).where(eq(users.email, email));
  }

  it('harus mengembalikan user + exp untuk sesi via header Authorization', async () => {
    await registerAndActivate('me@test.com', 'Password123');
    const loginRes = await loginViaApi('me@test.com', 'Password123');
    expect(loginRes.status).toBe(200);
    const loginBody = (await loginRes.json()) as { token: string };
    expect(loginBody.token).toBeDefined();

    const meRes = await app.handle(
      new Request('http://localhost/auth/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${loginBody.token}` },
      }),
    );
    expect(meRes.status).toBe(200);
    const body = (await meRes.json()) as { user: { email: string }; exp: number | null };
    expect(body.user.email).toBe('me@test.com');
    expect(body.exp).toBeGreaterThan(0);
  });

  it('harus mengembalikan user untuk sesi via cookie httpOnly', async () => {
    await registerAndActivate('me-cookie@test.com', 'Password123');
    const loginRes = await loginViaApi('me-cookie@test.com', 'Password123');
    expect(loginRes.status).toBe(200);
    const cookie = extractCookie(loginRes);
    expect(cookie).not.toBeNull();

    const meRes = await app.handle(
      new Request('http://localhost/auth/me', {
        method: 'GET',
        headers: { Cookie: cookie! },
      }),
    );
    expect(meRes.status).toBe(200);
    const body = (await meRes.json()) as { user: { email: string } };
    expect(body.user.email).toBe('me-cookie@test.com');
  });

  it('harus 401 tanpa sesi', async () => {
    const res = await app.handle(new Request('http://localhost/auth/me', { method: 'GET' }));
    expect(res.status).toBe(401);
  });
});
