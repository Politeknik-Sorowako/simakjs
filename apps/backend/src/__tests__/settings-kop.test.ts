import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { SystemParameterService } from '../services/system-parameter.service';
import { clearDatabase, getAuthToken } from './test-helper';

/** Magic bytes PNG valid (8 byte) + dummy isi. */
function pngBytes(size = 64): Uint8Array {
  const buf = new Uint8Array(size);
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return buf;
}

async function api(token: string, method: string, path: string, body?: unknown) {
  const response = await app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
  return { status: response.status, data: (await response.json()) as Record<string, unknown> };
}

async function apiMultipart(
  token: string,
  method: string,
  path: string,
  file?: { name: string; type: string; bytes: Uint8Array },
) {
  const form = new FormData();
  if (file) {
    form.append('file', new File([file.bytes], file.name, { type: file.type }));
  }
  const response = await app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }),
  );
  return { status: response.status, data: (await response.json()) as Record<string, unknown> };
}

describe('Pengaturan — Kop surat global', () => {
  let adminToken: string;
  let prodiToken: string;
  let mhsToken: string;

  beforeEach(async () => {
    await clearDatabase();
    // Bersihkan cache module-level + kunci yang mungkin ter-set test lain.
    await SystemParameterService.set('surat_kop_global', JSON.stringify({}));
    adminToken = await getAuthToken('admin@test.com', 'admin');
    prodiToken = await getAuthToken('prodi@test.com', 'prodi');
    mhsToken = await getAuthToken('mhs@test.com', 'mahasiswa');
  });

  it('GET /settings/kop memberi default lengkap (role apapun terautentikasi)', async () => {
    const res = await api(mhsToken, 'GET', '/settings/kop');
    expect(res.status).toBe(200);
    const data = res.data.data as Record<string, unknown>;
    expect(data.nama).toBe('POLITEKNIK SOROWAKO');
    expect(Array.isArray(data.alamat)).toBe(true);
    expect((data.alamat as string[]).length).toBeGreaterThan(0);
    expect(data.tampilkanLogo).toBe(true);
    expect(data.logoCustom).toBe(false);
    expect(data.logoUrl).toBeNull();
  });

  it('GET tanpa token → 401', async () => {
    const response = await app.handle(new Request('http://localhost/settings/kop'));
    expect(response.status).toBe(401);
  });

  it('PUT sebagai prodi → 403; sebagai admin → 200 dan tersimpan', async () => {
    const deny = await api(prodiToken, 'PUT', '/settings/kop', { nama: 'X' });
    expect(deny.status).toBe(403);

    const ok = await api(adminToken, 'PUT', '/settings/kop', { nama: 'POLITEKNIK UJI' });
    expect(ok.status).toBe(200);
    const check = await api(mhsToken, 'GET', '/settings/kop');
    expect((check.data.data as Record<string, unknown>).nama).toBe('POLITEKNIK UJI');
    // Field yang tidak dikirim dipertahankan (merge patch).
    expect(((check.data.data as Record<string, unknown>).alamat as string[]).length).toBeGreaterThan(0);
  });

  it('PUT validasi TypeBox → 422 (nama kosong / alamat >4 baris)', async () => {
    const a = await api(adminToken, 'PUT', '/settings/kop', { nama: '' });
    expect(a.status).toBe(422);
    const b = await api(adminToken, 'PUT', '/settings/kop', {
      alamat: ['a', 'b', 'c', 'd', 'e'],
    });
    expect(b.status).toBe(422);
  });

  it('Unggah logo valid → logoCustom true + logoUrl; GET /kop-logo 200 PNG; DELETE → 404', async () => {
    const up = await apiMultipart(adminToken, 'POST', '/settings/kop-logo', {
      name: 'logo.png',
      type: 'image/png',
      bytes: pngBytes(),
    });
    expect(up.status).toBe(200);
    const kop = await api(mhsToken, 'GET', '/settings/kop');
    const data = kop.data.data as Record<string, unknown>;
    expect(data.logoCustom).toBe(true);
    expect(typeof data.logoUrl).toBe('string');

    const file = await app.handle(
      new Request('http://localhost/settings/kop-logo', {
        headers: { Authorization: `Bearer ${mhsToken}` },
      }),
    );
    expect(file.status).toBe(200);
    expect(file.headers.get('content-type')).toBe('image/png');

    const del = await api(adminToken, 'DELETE', '/settings/kop-logo');
    expect(del.status).toBe(200);
    const after = await api(mhsToken, 'GET', '/settings/kop');
    expect((after.data.data as Record<string, unknown>).logoCustom).toBe(false);

    const gone = await app.handle(
      new Request('http://localhost/settings/kop-logo', {
        headers: { Authorization: `Bearer ${mhsToken}` },
      }),
    );
    expect(gone.status).toBe(404);
  });

  it('Unggah logo: format salah → 400; tanpa magic PNG → 400; prodi → 403', async () => {
    const wrongExt = await apiMultipart(adminToken, 'POST', '/settings/kop-logo', {
      name: 'logo.gif',
      type: 'image/gif',
      bytes: pngBytes(),
    });
    expect(wrongExt.status).toBe(400);

    const fakePng = await apiMultipart(adminToken, 'POST', '/settings/kop-logo', {
      name: 'logo.png',
      type: 'image/png',
      bytes: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
    });
    expect(fakePng.status).toBe(400);

    const denied = await apiMultipart(prodiToken, 'POST', '/settings/kop-logo', {
      name: 'logo.png',
      type: 'image/png',
      bytes: pngBytes(),
    });
    expect(denied.status).toBe(403);
  });
});
