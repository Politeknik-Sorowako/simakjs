import { beforeEach, describe, expect, it } from 'bun:test';
import { createHmac } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import { users } from '../models/schema';
import { SystemParameterService } from '../services/system-parameter.service';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function decodePayload(token: string): Record<string, unknown> {
  const [, payload] = token.split('.');
  const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) as Record<string, unknown>;
}

function craftJwt(claims: Record<string, unknown>, expOffsetSec: number, sessEpoch: number | null = 1): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = sessEpoch === null ? { ...claims } : { ...claims, sessEpoch };
  const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + expOffsetSec }));
  const sig = createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${header}.${body}.${sig}`;
}

async function createActiveUser(email: string, password = 'Password123'): Promise<void> {
  const reg = await app.handle(
    new Request('http://localhost/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nama: 'Sesi Test', role: 'mahasiswa' }),
    }),
  );
  expect([201, 400]).toContain(reg.status);
  await db.update(users).set({ isActive: true }).where(eq(users.email, email));
}

async function login(email: string, password = 'Password123'): Promise<{ status: number; data: { token?: string } }> {
  const res = await app.handle(
    new Request('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),
  );
  return { status: res.status, data: (await res.json()) as { token?: string } };
}

describe('SESSION_DURATION_MINUTES — durasi sesi idle', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it('default parameter 480 menit bertipe number', () => {
    const def = SystemParameterService.defaults().SESSION_DURATION_MINUTES;
    expect(def.value).toBe('480');
    expect(def.type).toBe('number');
  });

  it('helper melakukan clamp ke rentang 15–10080 menit', async () => {
    await SystemParameterService.set('SESSION_DURATION_MINUTES', '14');
    expect(await SystemParameterService.getSessionDurationMinutes()).toBe(15);

    await SystemParameterService.set('SESSION_DURATION_MINUTES', '20000');
    expect(await SystemParameterService.getSessionDurationMinutes()).toBe(10080);

    await SystemParameterService.set('SESSION_DURATION_MINUTES', 'abc');
    expect(await SystemParameterService.getSessionDurationMinutes()).toBe(480);

    await SystemParameterService.set('SESSION_DURATION_MINUTES', '480');
  });

  it('token login memuat iat/exp dengan selisih = durasi sesi', async () => {
    await SystemParameterService.set('SESSION_DURATION_MINUTES', '480');
    await createActiveUser('session-exp@test.com');

    const { status, data } = await login('session-exp@test.com');
    expect(status).toBe(200);
    expect(data.token).toBeTruthy();
    const payload = decodePayload(data.token as string);
    const diff = (payload.exp as number) - (payload.iat as number);
    expect(diff).toBeGreaterThanOrEqual(480 * 60 - 2);
    expect(diff).toBeLessThanOrEqual(480 * 60);
  });

  it('X-Refresh-Token muncul saat sisa umur token < 50% durasi (sliding idle)', async () => {
    await SystemParameterService.set('SESSION_DURATION_MINUTES', '15');
    await createActiveUser('session-slide@test.com');
    const { status, data } = await login('session-slide@test.com');
    expect(status).toBe(200);
    const tokenA = data.token as string;

    // Naikkan durasi: sisa 900 detik < setengah 10080*60 detik → harus di-refresh.
    await SystemParameterService.set('SESSION_DURATION_MINUTES', '10080');

    const resp = await app.handle(
      new Request('http://localhost/settings/public', {
        method: 'GET',
        headers: { Authorization: `Bearer ${tokenA}` },
      }),
    );
    expect(resp.status).toBe(200);
    const refreshed = resp.headers.get('x-refresh-token');
    expect(refreshed).toBeTruthy();
    const payload = decodePayload(refreshed as string);
    const diff = (payload.exp as number) - (payload.iat as number);
    expect(diff).toBeGreaterThanOrEqual(10080 * 60 - 2);
    expect(diff).toBeLessThanOrEqual(10080 * 60);
  });

  it('tidak mengeluarkan X-Refresh-Token saat sisa umur masih >= 50% durasi', async () => {
    await SystemParameterService.set('SESSION_DURATION_MINUTES', '10080');
    await createActiveUser('session-norefresh@test.com');
    const { status, data } = await login('session-norefresh@test.com');
    expect(status).toBe(200);

    const resp = await app.handle(
      new Request('http://localhost/settings/public', {
        method: 'GET',
        headers: { Authorization: `Bearer ${data.token as string}` },
      }),
    );
    expect(resp.status).toBe(200);
    expect(resp.headers.get('x-refresh-token')).toBeNull();
  });

  it('endpoint background /system/version tidak memperpanjang sesi (skip-list)', async () => {
    await SystemParameterService.set('SESSION_DURATION_MINUTES', '15');
    await createActiveUser('session-skipversion@test.com');
    const { status, data } = await login('session-skipversion@test.com');
    expect(status).toBe(200);

    // Sisa 900 detik < setengah 10080*60 → tanpa skip-list harus di-refresh.
    await SystemParameterService.set('SESSION_DURATION_MINUTES', '10080');

    const resp = await app.handle(
      new Request('http://localhost/system/version', {
        method: 'GET',
        headers: { Authorization: `Bearer ${data.token as string}` },
      }),
    );
    expect(resp.status).toBe(200);
    expect(resp.headers.get('x-refresh-token')).toBeNull();
  });

  it('endpoint polling /notifications tidak memperpanjang sesi (skip-list)', async () => {
    await SystemParameterService.set('SESSION_DURATION_MINUTES', '15');
    await createActiveUser('session-skipnotif@test.com');
    const { status, data } = await login('session-skipnotif@test.com');
    expect(status).toBe(200);

    // Sisa 900 detik < setengah 10080*60 → tanpa skip-list harus di-refresh.
    await SystemParameterService.set('SESSION_DURATION_MINUTES', '10080');

    const resp = await app.handle(
      new Request('http://localhost/notifications', {
        method: 'GET',
        headers: { Authorization: `Bearer ${data.token as string}` },
      }),
    );
    expect(resp.status).toBe(200);
    expect(resp.headers.get('x-refresh-token')).toBeNull();
  });

  it('header X-Background: 1 meng-opt-out sliding refresh pada endpoint biasa', async () => {
    await SystemParameterService.set('SESSION_DURATION_MINUTES', '15');
    await createActiveUser('session-bg@test.com');
    const { status, data } = await login('session-bg@test.com');
    expect(status).toBe(200);

    // Sisa 900 detik < setengah 10080*60 → tanpa header harus di-refresh.
    await SystemParameterService.set('SESSION_DURATION_MINUTES', '10080');

    const resp = await app.handle(
      new Request('http://localhost/settings/public', {
        method: 'GET',
        headers: { Authorization: `Bearer ${data.token as string}`, 'X-Background': '1' },
      }),
    );
    expect(resp.status).toBe(200);
    expect(resp.headers.get('x-refresh-token')).toBeNull();
  });

  it('token kedaluwarsa (signature valid) ditolak middleware', async () => {
    const expired = craftJwt(
      { id: 1, role: 'admin', roles: ['admin'], email: 'admin-exp@test.com', nama: 'Admin', isGlobalScope: false },
      -60,
      1,
    );
    const resp = await app.handle(
      new Request('http://localhost/system/parameters', {
        method: 'GET',
        headers: { Authorization: `Bearer ${expired}` },
      }),
    );
    // getCurrentUser() === null → controller mengembalikan 403 (bukan akses).
    expect(resp.status).toBe(403);
    expect(resp.headers.get('x-refresh-token')).toBeNull();
  });

  it('PUT /system/parameters/SESSION_DURATION_MINUTES memvalidasi rentang', async () => {
    const adminToken = await getAuthToken('admin-session-val@test.com', 'admin');

    for (const bad of ['abc', '-5', '5', '20000']) {
      const res = await app.handle(
        new Request('http://localhost/system/parameters/SESSION_DURATION_MINUTES', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({ value: bad }),
        }),
      );
      expect(res.status).toBe(400);
    }

    const ok = await app.handle(
      new Request('http://localhost/system/parameters/SESSION_DURATION_MINUTES', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ value: '720' }),
      }),
    );
    expect(ok.status).toBe(200);
  });

  it('PUT /system/parameters/SESSION_DURATION_MINUTES menolak non-admin', async () => {
    const dosenToken = await getAuthToken('dosen-session-val@test.com', 'dosen');
    const res = await app.handle(
      new Request('http://localhost/system/parameters/SESSION_DURATION_MINUTES', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosenToken}` },
        body: JSON.stringify({ value: '480' }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it('token tanpa sessEpoch (fail-closed) ditolak middleware', async () => {
    const noEpoch = craftJwt(
      { id: 1, role: 'admin', roles: ['admin'], email: 'admin-noepoch@test.com', nama: 'Admin', isGlobalScope: false },
      3600,
      null,
    );
    const resp = await app.handle(
      new Request('http://localhost/system/parameters', {
        method: 'GET',
        headers: { Authorization: `Bearer ${noEpoch}` },
      }),
    );
    expect(resp.status).toBe(403);
    expect(resp.headers.get('x-refresh-token')).toBeNull();
  });

  it('token dengan sessEpoch basi (kill-switch) ditolak middleware', async () => {
    const stale = craftJwt(
      { id: 1, role: 'admin', roles: ['admin'], email: 'admin-stale@test.com', nama: 'Admin', isGlobalScope: false },
      3600,
      1,
    );
    await SystemParameterService.incrementSessionEpoch();
    const resp = await app.handle(
      new Request('http://localhost/system/parameters', {
        method: 'GET',
        headers: { Authorization: `Bearer ${stale}` },
      }),
    );
    expect(resp.status).toBe(403);
  });

  it('bump SESSION_EPOCH menaikkan epoch; token lama ditolak, login baru diterima', async () => {
    const before = await SystemParameterService.getSessionEpoch();
    const res = await app.handle(
      new Request('http://localhost/system/session-epoch/bump', {
        method: 'POST',
        headers: { Authorization: `Bearer ${await getAuthToken('admin-bump@test.com', 'admin')}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { sessionEpoch: number };
    expect(body.sessionEpoch).toBe(before + 1);
    expect(await SystemParameterService.getSessionEpoch()).toBe(before + 1);

    // Token lama (epoch before) kini ditolak.
    const stale = craftJwt(
      { id: 1, role: 'admin', roles: ['admin'], email: 'admin-old@test.com', nama: 'Admin', isGlobalScope: false },
      3600,
      before,
    );
    const rejected = await app.handle(
      new Request('http://localhost/system/parameters', {
        method: 'GET',
        headers: { Authorization: `Bearer ${stale}` },
      }),
    );
    expect(rejected.status).toBe(403);

    // Login baru memakai epoch terbaru → valid.
    await createActiveUser('session-newepoch@test.com');
    const { status, data } = await login('session-newepoch@test.com');
    expect(status).toBe(200);
    const payload = decodePayload(data.token as string);
    expect(payload.sessEpoch).toBe(before + 1);
    const ok = await app.handle(
      new Request('http://localhost/settings/public', {
        method: 'GET',
        headers: { Authorization: `Bearer ${data.token as string}` },
      }),
    );
    expect(ok.status).toBe(200);
  });

  it('PUT /system/parameters/SESSION_EPOCH ditolak (hanya via bump endpoint)', async () => {
    const adminToken = await getAuthToken('admin-epoch-put@test.com', 'admin');
    const res = await app.handle(
      new Request('http://localhost/system/parameters/SESSION_EPOCH', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ value: '99' }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('bump endpoint menolak non-admin', async () => {
    const dosenToken = await getAuthToken('dosen-epoch-bump@test.com', 'dosen');
    const res = await app.handle(
      new Request('http://localhost/system/session-epoch/bump', {
        method: 'POST',
        headers: { Authorization: `Bearer ${dosenToken}` },
      }),
    );
    expect(res.status).toBe(403);
  });
});
