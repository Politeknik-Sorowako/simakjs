import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { clearDatabase, getAuthToken } from './test-helper';

describe('System Settings & Kategori Bimbingan API', () => {
  let adminToken: string;
  let dosenToken: string;
  let mhsToken: string;

  beforeEach(async () => {
    await clearDatabase();

    adminToken = await getAuthToken('admin@test.com', 'admin');
    dosenToken = await getAuthToken('dosen@test.com', 'dosen');
    mhsToken = await getAuthToken('mhs@test.com', 'mahasiswa');
  });

  describe('Settings API', () => {
    it('endpoint publik /settings/public harus mengembalikan status feature_feedback_enabled tanpa token auth', async () => {
      const res = await app.handle(
        new Request('http://localhost/settings/public', {
          method: 'GET',
        }),
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(json.data.featureFeedbackEnabled).toBeBoolean();
    });

    it('admin harus sukses mengambil dan mengubah pengaturan system_settings', async () => {
      const updateRes = await app.handle(
        new Request('http://localhost/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            key: 'feature_feedback_enabled',
            value: 'false',
            description: 'Disable feedback module for maintenance',
          }),
        }),
      );
      expect(updateRes.status).toBe(200);
      const json = await updateRes.json();
      expect(json.data.value).toBe('false');

      const pubRes = await app.handle(
        new Request('http://localhost/settings/public', {
          method: 'GET',
        }),
      );
      const pubJson = await pubRes.json();
      expect(pubJson.data.featureFeedbackEnabled).toBe(false);
    });

    it('non-admin dilarang memperbarui pengaturan system_settings', async () => {
      const res = await app.handle(
        new Request('http://localhost/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${dosenToken}`,
          },
          body: JSON.stringify({ key: 'feature_feedback_enabled', value: 'false' }),
        }),
      );
      expect(res.status).toBe(403);
    });
  });

  describe('Kategori Bimbingan API', () => {
    it('pengguna terautentikasi harus dapat mengambil daftar kategori bimbingan', async () => {
      const res = await app.handle(
        new Request('http://localhost/kategori-bimbingan', {
          method: 'GET',
          headers: { Authorization: `Bearer ${mhsToken}` },
        }),
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toBeArray();
    });

    it('admin dan dosen harus dapat membuat kategori bimbingan baru', async () => {
      const res = await app.handle(
        new Request('http://localhost/kategori-bimbingan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nama: 'Bimbingan Lomba / Prestasi',
            deskripsi: 'Bimbingan persiapaan lomba akademik & non-akademik',
          }),
        }),
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.nama).toBe('Bimbingan Lomba / Prestasi');

      const listRes = await app.handle(
        new Request('http://localhost/kategori-bimbingan', {
          method: 'GET',
          headers: { Authorization: `Bearer ${dosenToken}` },
        }),
      );
      const listJson = await listRes.json();
      expect(listJson.data.some((k: { nama: string }) => k.nama === 'Bimbingan Lomba / Prestasi')).toBe(true);
    });

    it('mahasiswa dilarang membuat atau menghapus kategori bimbingan', async () => {
      const createRes = await app.handle(
        new Request('http://localhost/kategori-bimbingan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({ nama: 'Kategori Mahasiswa' }),
        }),
      );
      expect(createRes.status).toBe(403);
    });
  });
});
