import { describe, it, expect, beforeEach } from 'bun:test';
import { app } from '../index';
import { clearDatabase, getAuthToken } from './test-helper';

describe('5. Periode Akademik (/periode-akademik)', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('POST /periode-akademik', () => {
    it('harus sukses menambahkan periode akademik baru jika diakses oleh Admin dengan payload valid', async () => {
      const adminToken = await getAuthToken('admin-periode@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/periode-akademik', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            id: '20251',
            nama: '2025/2026 Ganjil',
            aktif: true,
          }),
        })
      );

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.id).toBe('20251');
    });

    it('harus gagal menambahkan jika payload tidak valid (Validation)', async () => {
      const adminToken = await getAuthToken('admin-periode@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/periode-akademik', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            id: 12345, // invalid type (number instead of string)
            nama: '2025/2026 Ganjil',
          }),
        })
      );

      expect(response.status).toBe(422);
    });

    it('harus gagal menambahkan jika ID/Kode duplikat (Constraint)', async () => {
      const adminToken = await getAuthToken('admin-periode@test.com', 'admin');

      await app.handle(
        new Request('http://localhost/periode-akademik', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            id: '20251',
            nama: '2025/2026 Ganjil',
            aktif: true,
          }),
        })
      );

      const response = await app.handle(
        new Request('http://localhost/periode-akademik', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            id: '20251',
            nama: '2025/2026 Ganjil Duplikat',
            aktif: false,
          }),
        })
      );

      expect(response.status).toBe(409); // Conflict unique ID
    });

    it('harus gagal jika diakses oleh non-Admin (RBAC)', async () => {
      const mhsToken = await getAuthToken('mhs-periode@test.com', 'mahasiswa');

      const response = await app.handle(
        new Request('http://localhost/periode-akademik', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({
            id: '20251',
            nama: '2025/2026 Ganjil',
            aktif: true,
          }),
        })
      );

      expect(response.status).toBe(403);
    });
  });

  describe('GET /periode-akademik', () => {
    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-periode@test.com', 'admin');
      await app.handle(
        new Request('http://localhost/periode-akademik', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ id: '20251', nama: '2025/2026 Ganjil', aktif: true }),
        })
      );
    });

    it('harus sukses mengambil list periode akademik', async () => {
      const response = await app.handle(
        new Request('http://localhost/periode-akademik', { method: 'GET' })
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /periode-akademik/:id', () => {
    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-periode@test.com', 'admin');
      await app.handle(
        new Request('http://localhost/periode-akademik', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ id: '20251', nama: '2025/2026 Ganjil', aktif: true }),
        })
      );
    });

    it('harus sukses mengambil detail periode berdasarkan ID valid', async () => {
      const response = await app.handle(
        new Request('http://localhost/periode-akademik/20251', { method: 'GET' })
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.nama).toBe('2025/2026 Ganjil');
    });

    it('harus mengembalikan error 404 jika ID tidak ditemukan', async () => {
      const response = await app.handle(
        new Request('http://localhost/periode-akademik/99999', { method: 'GET' })
      );
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /periode-akademik/:id', () => {
    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-periode@test.com', 'admin');
      await app.handle(
        new Request('http://localhost/periode-akademik', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ id: '20251', nama: '2025/2026 Ganjil', aktif: true }),
        })
      );
    });

    it('harus sukses memperbarui periode jika diakses oleh Admin dengan payload valid', async () => {
      const adminToken = await getAuthToken('admin-periode@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/periode-akademik/20251', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nama: '2025/2026 Ganjil Terupdate',
          }),
        })
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.nama).toBe('2025/2026 Ganjil Terupdate');
    });

    it('harus gagal memperbarui jika ID tidak ditemukan', async () => {
      const adminToken = await getAuthToken('admin-periode@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/periode-akademik/99999', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nama: 'Terupdate',
          }),
        })
      );

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /periode-akademik/:id', () => {
    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-periode@test.com', 'admin');
      await app.handle(
        new Request('http://localhost/periode-akademik', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ id: '20251', nama: '2025/2026 Ganjil', aktif: true }),
        })
      );
    });

    it('harus sukses menghapus periode jika diakses oleh Admin dengan ID valid', async () => {
      const adminToken = await getAuthToken('admin-periode@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/periode-akademik/20251', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
          },
        })
      );

      expect(response.status).toBe(200);
    });

    it('harus gagal menghapus jika ID tidak ditemukan', async () => {
      const adminToken = await getAuthToken('admin-periode@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/periode-akademik/99999', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
          },
        })
      );

      expect(response.status).toBe(404);
    });
  });
});
