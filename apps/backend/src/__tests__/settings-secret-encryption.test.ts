import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import { systemSettings } from '../models/schema';
import { SystemParameterService } from '../services/system-parameter.service';
import { db } from '../utils/db';
import { decryptSecret, encryptSecret, isSecretEncrypted } from '../utils/secret-crypto';
import { clearDatabase, getAuthToken } from './test-helper';

const TEST_KEY = 'a'.repeat(64); // 32 byte hex

/**
 * Parameter rahasia (mis. FEEDER_PASSWORD) tidak boleh lagi tersimpan plaintext
 * di `system_settings`. Semua jalur tulis (`PUT /system/parameters/:key` dan legacy
 * `PUT /settings`) mengenkripsi nilai, seluruh endpoint baca tetap meng-mask, dan
 * nilai plaintext historis tetap terbaca (kompatibel mundur).
 */
describe('System Settings — Enkripsi Nilai Rahasia', () => {
  let adminToken: string;
  const originalKey = process.env.SETTINGS_SECRET_KEY;

  beforeAll(() => {
    process.env.SETTINGS_SECRET_KEY = TEST_KEY;
  });

  afterAll(() => {
    if (originalKey === undefined) delete process.env.SETTINGS_SECRET_KEY;
    else process.env.SETTINGS_SECRET_KEY = originalKey;
  });

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin@test.com', 'admin');
  });

  afterEach(() => {
    SystemParameterService.clearCache();
    delete process.env.SETTINGS_SECRET_KEY;
    process.env.SETTINGS_SECRET_KEY = TEST_KEY;
  });

  it('mengenkripsi & mendekripsi nilai rahasia (roundtrip)', async () => {
    await SystemParameterService.set('FEEDER_PASSWORD', 'rahasia-kampus-2026', 1);
    // Nilai di DB terenkripsi — bukan plaintext.
    const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, 'FEEDER_PASSWORD')).limit(1);
    expect(row.value.startsWith('enc:v1:')).toBe(true);
    expect(row.value).not.toContain('rahasia-kampus-2026');
    // getRaw men-dekripsi kembali.
    expect(await SystemParameterService.getRaw('FEEDER_PASSWORD')).toBe('rahasia-kampus-2026');
  });

  it('tetap membaca nilai plaintext historis (kompatibel mundur)', async () => {
    await db.insert(systemSettings).values({
      key: 'FEEDER_PASSWORD',
      value: 'password-lama-plain',
      paramType: 'string',
    });
    SystemParameterService.clearCache();
    expect(await SystemParameterService.getRaw('FEEDER_PASSWORD')).toBe('password-lama-plain');
  });

  it('parameter non-rahasia tidak dienkripsi', async () => {
    await SystemParameterService.set('FEEDER_URL', 'https://feeder.politekniksorowako.ac.id/ws/live2.php', 1);
    const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, 'FEEDER_URL')).limit(1);
    expect(row.value).toBe('https://feeder.politekniksorowako.ac.id/ws/live2.php');
  });

  it('legacy PUT /settings menyimpan password Feeder terenkripsi, respons di-mask', async () => {
    const putRes = await app.handle(
      new Request('http://localhost/settings', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'FEEDER_PASSWORD', value: 'password-legacy-2026' }),
      }),
    );
    expect(putRes.status).toBe(200);
    const putBody = (await putRes.json()) as { data: { key: string; value: string } };
    expect(putBody.data.value).toBe(''); // tidak pernah mengembalikan nilai/ciphertext
    const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, 'FEEDER_PASSWORD')).limit(1);
    expect(row.value.startsWith('enc:v1:')).toBe(true);
    SystemParameterService.clearCache();
    expect(await SystemParameterService.getRaw('FEEDER_PASSWORD')).toBe('password-legacy-2026');
  });

  it('legacy PUT /settings memvalidasi parameter Feeder', async () => {
    const cases: Array<{ key: string; value: string; errorPart: string }> = [
      { key: 'FEEDER_URL', value: 'ftp://feeder', errorPart: 'http(s)' },
      { key: 'FEEDER_USERNAME', value: '', errorPart: 'wajib diisi' },
      { key: 'FEEDER_TIMEOUT_MS', value: '999', errorPart: '5000 dan 60000' },
      { key: 'FEEDER_PAGE_SIZE', value: '1000', errorPart: '50 dan 500' },
      { key: 'FEEDER_WRITE_GUARD', value: 'yes', errorPart: 'true atau false' },
      { key: 'FEEDER_AUTO_APPROVE_KRS', value: 'mungkin', errorPart: 'true atau false' },
      { key: 'feeder-url', value: 'https://x', errorPart: 'huruf, angka' },
      { key: 'SESSION_DURATION_MINUTES', value: '5', errorPart: '15 dan 10080' },
    ];
    for (const c of cases) {
      const res = await app.handle(
        new Request('http://localhost/settings', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: c.key, value: c.value }),
        }),
      );
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toContain(c.errorPart);
    }
  });

  it('legacy PUT /settings: password kosong mempertahankan nilai lama', async () => {
    await SystemParameterService.set('FEEDER_PASSWORD', 'tetap-ini', 1);
    const putRes = await app.handle(
      new Request('http://localhost/settings', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'FEEDER_PASSWORD', value: '' }),
      }),
    );
    expect(putRes.status).toBe(200);
    SystemParameterService.clearCache();
    expect(await SystemParameterService.getRaw('FEEDER_PASSWORD')).toBe('tetap-ini');
  });

  it('endpoint utama PUT /system/parameters/settings tetap mask & konsisten dengan legacy', async () => {
    const mainRes = await app.handle(
      new Request('http://localhost/system/parameters/FEEDER_TIMEOUT_MS', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: '15000' }),
      }),
    );
    expect(mainRes.status).toBe(200);
    expect(await SystemParameterService.getRaw('FEEDER_TIMEOUT_MS')).toBe('15000');
  });

  it('menolak penulisan kunci env-only lewat endpoint utama maupun legacy PUT /settings', async () => {
    const kunciEnvOnly = ['SETTINGS_SECRET_KEY', 'JWT_SECRET', 'SIGN_HMAC_KEYS', 'SIGN_ACTIVE_KID', 'VERIFY_BASE_URL'];

    for (const key of kunciEnvOnly) {
      const mainRes = await app.handle(
        new Request(`http://localhost/system/parameters/${key}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: 'nilai-akali-13243546' }),
        }),
      );
      expect(mainRes.status).toBe(400);
      const mainBody = (await mainRes.json()) as { error: string };
      expect(mainBody.error).toContain('environment server');

      const legacyRes = await app.handle(
        new Request('http://localhost/settings', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value: 'nilai-akali-13243546' }),
        }),
      );
      expect(legacyRes.status).toBe(400);
      const legacyBody = (await legacyRes.json()) as { error: string };
      expect(legacyBody.error).toContain('environment server');
    }

    // Tidak ada baris yang tersimpan untuk key tersebut.
    const rows = await db.select().from(systemSettings);
    expect(rows.some((r) => kunciEnvOnly.includes(r.key))).toBe(false);
  });

  it('env yang sudah diset tidak berubah lewat aplikasi', async () => {
    const sebelum = process.env.SETTINGS_SECRET_KEY;
    const res = await app.handle(
      new Request('http://localhost/system/parameters/SETTINGS_SECRET_KEY', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 'a'.repeat(64) }),
      }),
    );
    expect(res.status).toBe(400);
    expect(process.env.SETTINGS_SECRET_KEY).toBe(sebelum);
  });

  it('GET /system/settings tidak pernah mengembalikan nilai rahasia', async () => {
    await SystemParameterService.set('FEEDER_PASSWORD', 'jangan-ditampilkan', 1);
    const res = await app.handle(
      new Request('http://localhost/system/settings', {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const raw = await res.text();
    expect(raw).not.toContain('jangan-ditampilkan');
    expect(raw).not.toContain('enc:v1:');
    const body = (await JSON.parse(raw)) as { data: Array<{ key: string; value: string; masked?: boolean }> };
    const secret = body.data.find((r) => r.key === 'FEEDER_PASSWORD');
    expect(secret?.masked).toBe(true);
    expect(secret?.value).toBe('');
  });

  it('dekripsi gagal (kunci berubah) mengembalikan string kosong, bukan ciphertext', async () => {
    const encrypted = encryptSecret('nilai-rahasia');
    expect(isSecretEncrypted(encrypted)).toBe(true);
    const savedKey = process.env.SETTINGS_SECRET_KEY;
    process.env.SETTINGS_SECRET_KEY = 'b'.repeat(64);
    expect(decryptSecret(encrypted)).toBe('');
    process.env.SETTINGS_SECRET_KEY = savedKey;
    expect(decryptSecret(encrypted)).toBe('nilai-rahasia');
  });

  it('tanpa SETTINGS_SECRET_KEY nilai disimpan plaintext (fail-open) dan tetap terbaca', async () => {
    delete process.env.SETTINGS_SECRET_KEY;
    await SystemParameterService.set('FEEDER_PASSWORD', 'tanpa-kunci', 1);
    const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, 'FEEDER_PASSWORD')).limit(1);
    expect(row.value).toBe('tanpa-kunci');
    expect(await SystemParameterService.getRaw('FEEDER_PASSWORD')).toBe('tanpa-kunci');
  });
});
