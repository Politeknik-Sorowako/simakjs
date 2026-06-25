import { describe, it, expect, beforeEach } from 'bun:test';
import { app } from '../index';
import { clearDatabase, getAuthToken, ProdiSuccessResponse } from './test-helper';

describe('2. Program Studi (/prodi)', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /prodi', () => {
    it('harus sukses menambahkan prodi baru jika diakses oleh Admin dengan payload valid', async () => {
      const adminToken = await getAuthToken('admin-prodi@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/prodi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            kode: 'TI',
            nama: 'Teknik Informatika',
            jenjang: 'D4',
          }),
        })
      );

      expect(response.status).toBe(201);
      const body = await response.json() as ProdiSuccessResponse;
      expect(body.id).toBeDefined();
      expect(body.kode).toBe('TI');
    });

    it('harus gagal menambahkan prodi jika field wajib tidak lengkap atau format salah (Validation)', async () => {
      const adminToken = await getAuthToken('admin-prodi@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/prodi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            kode: 123, // invalid type (number instead of string)
            nama: 'Teknik Informatika',
          }),
        })
      );

      expect(response.status).toBe(422);
    });

    it('harus gagal menambahkan prodi jika kode prodi duplikat (Constraint)', async () => {
      const adminToken = await getAuthToken('admin-prodi@test.com', 'admin');

      await app.handle(
        new Request('http://localhost/prodi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            kode: 'TI',
            nama: 'Teknik Informatika',
            jenjang: 'D4',
          }),
        })
      );

      const response = await app.handle(
        new Request('http://localhost/prodi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            kode: 'TI',
            nama: 'Teknik Informatika Lain',
            jenjang: 'D3',
          }),
        })
      );

      expect(response.status).toBe(409); // Conflict (23505 unique constraint)
    });

    it('harus gagal menambahkan prodi jika diakses oleh Dosen/Mahasiswa/Guest (RBAC)', async () => {
      const dosenToken = await getAuthToken('dosen-prodi@test.com', 'dosen');
      const mhsToken = await getAuthToken('mhs-prodi@test.com', 'mahasiswa');

      // Test Dosen
      const resDosen = await app.handle(
        new Request('http://localhost/prodi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${dosenToken}`,
          },
          body: JSON.stringify({ kode: 'TI-DSN', nama: 'TI Dosen', jenjang: 'D4' }),
        })
      );
      expect(resDosen.status).toBe(403);

      // Test Mahasiswa
      const resMhs = await app.handle(
        new Request('http://localhost/prodi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({ kode: 'TI-MHS', nama: 'TI Mhs', jenjang: 'D4' }),
        })
      );
      expect(resMhs.status).toBe(403);

      // Test Guest (no token)
      const resGuest = await app.handle(
        new Request('http://localhost/prodi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kode: 'TI-GST', nama: 'TI Guest', jenjang: 'D4' }),
        })
      );
      expect(resGuest.status).toBe(403);
    });
  });

  describe('GET /prodi', () => {
    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-prodi@test.com', 'admin');
      // Seed data
      const items = [
        { kode: 'TI', nama: 'Teknik Informatika', jenjang: 'D4' },
        { kode: 'TM', nama: 'Teknik Mesin', jenjang: 'D3' },
        { kode: 'TE', nama: 'Teknik Elektro', jenjang: 'D4' },
      ];
      for (const item of items) {
        await app.handle(
          new Request('http://localhost/prodi', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${adminToken}`,
            },
            body: JSON.stringify(item),
          })
        );
      }
    });

    it('harus sukses mengambil list prodi (Default)', async () => {
      const response = await app.handle(
        new Request('http://localhost/prodi', { method: 'GET' })
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBe(3);
    });

    it('harus sukses menggunakan pagination (page & limit)', async () => {
      const response = await app.handle(
        new Request('http://localhost/prodi?page=1&limit=2', { method: 'GET' })
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.length).toBe(2);
      expect(body.meta.total).toBe(3);
    });

    it('harus sukses memfilter list prodi berdasarkan keyword search', async () => {
      const response = await app.handle(
        new Request('http://localhost/prodi?search=Informatika', { method: 'GET' })
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.length).toBe(1);
      expect(body.data[0].kode).toBe('TI');
    });
  });

  describe('GET /prodi/:id', () => {
    let prodiId: number;

    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-prodi@test.com', 'admin');
      const res = await app.handle(
        new Request('http://localhost/prodi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ kode: 'TI', nama: 'Teknik Informatika', jenjang: 'D4' }),
        })
      );
      const data = await res.json() as { id: number };
      prodiId = data.id;
    });

    it('harus sukses mengambil detail prodi berdasarkan ID valid', async () => {
      const response = await app.handle(
        new Request(`http://localhost/prodi/${prodiId}`, { method: 'GET' })
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.kode).toBe('TI');
    });

    it('harus mengembalikan error 404 ketika ID prodi tidak ditemukan', async () => {
      const response = await app.handle(
        new Request('http://localhost/prodi/999999', { method: 'GET' })
      );
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /prodi/:id', () => {
    let prodiId: number;

    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-prodi@test.com', 'admin');
      const res = await app.handle(
        new Request('http://localhost/prodi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ kode: 'TI', nama: 'Teknik Informatika', jenjang: 'D4' }),
        })
      );
      const data = await res.json() as { id: number };
      prodiId = data.id;
    });

    it('harus sukses memperbarui data prodi jika diakses oleh Admin dengan payload valid', async () => {
      const adminToken = await getAuthToken('admin-prodi@test.com', 'admin');

      const response = await app.handle(
        new Request(`http://localhost/prodi/${prodiId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nama: 'Teknik Informatika Terupdate',
          }),
        })
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.nama).toBe('Teknik Informatika Terupdate');
    });

    it('harus gagal memperbarui data prodi jika ID tidak ditemukan', async () => {
      const adminToken = await getAuthToken('admin-prodi@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/prodi/999999', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nama: 'Teknik Informatika Terupdate',
          }),
        })
      );

      expect(response.status).toBe(404);
    });

    it('harus gagal memperbarui jika diakses oleh non-Admin (RBAC)', async () => {
      const mhsToken = await getAuthToken('mhs-prodi@test.com', 'mahasiswa');

      const response = await app.handle(
        new Request(`http://localhost/prodi/${prodiId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({
            nama: 'Teknik Informatika Terupdate',
          }),
        })
      );

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /prodi/:id', () => {
    let prodiId: number;

    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-prodi@test.com', 'admin');
      const res = await app.handle(
        new Request('http://localhost/prodi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ kode: 'TI', nama: 'Teknik Informatika', jenjang: 'D4' }),
        })
      );
      const data = await res.json() as { id: number };
      prodiId = data.id;
    });

    it('harus sukses menghapus prodi jika diakses oleh Admin dengan ID valid', async () => {
      const adminToken = await getAuthToken('admin-prodi@test.com', 'admin');

      const response = await app.handle(
        new Request(`http://localhost/prodi/${prodiId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
          },
        })
      );

      expect(response.status).toBe(200);

      // Verify deletion
      const checkResponse = await app.handle(
        new Request(`http://localhost/prodi/${prodiId}`, { method: 'GET' })
      );
      expect(checkResponse.status).toBe(404);
    });

    it('harus gagal menghapus prodi jika ID tidak ditemukan', async () => {
      const adminToken = await getAuthToken('admin-prodi@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/prodi/999999', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
          },
        })
      );

      expect(response.status).toBe(404);
    });

    it('harus gagal menghapus jika diakses oleh non-Admin (RBAC)', async () => {
      const mhsToken = await getAuthToken('mhs-prodi@test.com', 'mahasiswa');

      const response = await app.handle(
        new Request(`http://localhost/prodi/${prodiId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${mhsToken}`,
          },
        })
      );

      expect(response.status).toBe(403);
    });
  });
});
