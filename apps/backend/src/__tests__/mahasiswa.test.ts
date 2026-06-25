import { describe, it, expect, beforeEach } from 'bun:test';
import { app } from '../index';
import { clearDatabase, getAuthToken, MahasiswaSuccessResponse } from './test-helper';

describe('3. Mahasiswa (/mahasiswa)', () => {
  let prodiId: number;

  beforeEach(async () => {
    await clearDatabase();
    // Setup prodi
    const adminToken = await getAuthToken('admin-mhs-setup@test.com', 'admin');
    const response = await app.handle(
      new Request('http://localhost/prodi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          kode: 'TI-MHS-SETUP',
          nama: 'Teknik Informatika Setup',
          jenjang: 'D4',
        }),
      })
    );
    const data = await response.json() as { id: number };
    prodiId = data.id;
  });

  describe('POST /mahasiswa', () => {
    it('harus sukses menambahkan mahasiswa baru jika diakses oleh Admin/Dosen dengan payload valid', async () => {
      const adminToken = await getAuthToken('admin-mhs@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/mahasiswa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nim: '12345678',
            nama: 'Mahasiswa Admin',
            email: 'mhs-admin@test.com',
            programStudiId: prodiId,
            namaIbuKandung: 'Ibu Kandung Admin',
            nik: '1234567890123456',
            jenisKelamin: 'L',
            tanggalLahir: '2000-01-01',
          }),
        })
      );

      expect(response.status).toBe(201);
      const body = await response.json() as MahasiswaSuccessResponse;
      expect(body.id).toBeDefined();
      expect(body.nim).toBe('12345678');
    });

    it('harus gagal menambahkan mahasiswa jika field wajib tidak lengkap atau format salah (Validation)', async () => {
      const adminToken = await getAuthToken('admin-mhs@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/mahasiswa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nim: '12345678',
            nama: 'Mahasiswa Admin',
            email: 'invalid-email',
            programStudiId: prodiId,
          }),
        })
      );

      expect(response.status).toBe(422);
    });

    it('harus gagal menambahkan mahasiswa jika NIM duplikat (Constraint)', async () => {
      const adminToken = await getAuthToken('admin-mhs@test.com', 'admin');
      const payload = {
        nim: '12345678',
        nama: 'Mahasiswa Admin',
        email: 'mhs-admin@test.com',
        programStudiId: prodiId,
        namaIbuKandung: 'Ibu Kandung Admin',
        nik: '1234567890123456',
        jenisKelamin: 'L' as const,
        tanggalLahir: '2000-01-01',
      };

      await app.handle(
        new Request('http://localhost/mahasiswa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify(payload),
        })
      );

      const response = await app.handle(
        new Request('http://localhost/mahasiswa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            ...payload,
            email: 'other-email@test.com',
            nik: '1234567890123457',
          }),
        })
      );

      expect(response.status).toBe(409);
    });

    it('harus gagal menambahkan mahasiswa jika diakses oleh Mahasiswa/Guest (RBAC)', async () => {
      const mhsToken = await getAuthToken('mhs-mhs@test.com', 'mahasiswa');

      const response = await app.handle(
        new Request('http://localhost/mahasiswa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({
            nim: '12345680',
            nama: 'Mahasiswa Gagal',
            email: 'mhs-gagal@test.com',
            programStudiId: prodiId,
            namaIbuKandung: 'Ibu Kandung Gagal',
            nik: '1234567890123458',
            jenisKelamin: 'L',
            tanggalLahir: '2000-03-03',
          }),
        })
      );

      expect(response.status).toBe(403);
    });
  });

  describe('GET /mahasiswa', () => {
    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-mhs@test.com', 'admin');
      const items = [
        { nim: '12345678', nama: 'Budi Santoso', email: 'budi@test.com', programStudiId: prodiId, namaIbuKandung: 'Ibu Budi', nik: '1234567890123451', jenisKelamin: 'L', tanggalLahir: '2000-01-01' },
        { nim: '12345679', nama: 'Ani Lestari', email: 'ani@test.com', programStudiId: prodiId, namaIbuKandung: 'Ibu Ani', nik: '1234567890123452', jenisKelamin: 'P', tanggalLahir: '2001-02-02' },
      ];
      for (const item of items) {
        await app.handle(
          new Request('http://localhost/mahasiswa', {
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

    it('harus sukses mengambil list mahasiswa (Default)', async () => {
      const response = await app.handle(
        new Request('http://localhost/mahasiswa', { method: 'GET' })
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBe(2);
    });

    it('harus sukses menggunakan pagination (page & limit)', async () => {
      const response = await app.handle(
        new Request('http://localhost/mahasiswa?page=1&limit=1', { method: 'GET' })
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.length).toBe(1);
    });

    it('harus sukses mencari mahasiswa berdasarkan keyword search', async () => {
      const response = await app.handle(
        new Request('http://localhost/mahasiswa?search=Budi', { method: 'GET' })
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.length).toBe(1);
      expect(body.data[0].nim).toBe('12345678');
    });
  });

  describe('GET /mahasiswa/:id', () => {
    let mhsId: number;

    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-mhs@test.com', 'admin');
      const res = await app.handle(
        new Request('http://localhost/mahasiswa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nim: '12345678',
            nama: 'Mahasiswa Admin',
            email: 'mhs-admin@test.com',
            programStudiId: prodiId,
            namaIbuKandung: 'Ibu Kandung Admin',
            nik: '1234567890123456',
            jenisKelamin: 'L',
            tanggalLahir: '2000-01-01',
          }),
        })
      );
      const data = await res.json() as { id: number };
      mhsId = data.id;
    });

    it('harus sukses mengambil detail mahasiswa berdasarkan ID valid', async () => {
      const response = await app.handle(
        new Request(`http://localhost/mahasiswa/${mhsId}`, { method: 'GET' })
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.nim).toBe('12345678');
    });

    it('harus mengembalikan error 404 ketika ID mahasiswa tidak ditemukan', async () => {
      const response = await app.handle(
        new Request('http://localhost/mahasiswa/999999', { method: 'GET' })
      );
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /mahasiswa/:id', () => {
    let mhsId: number;

    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-mhs@test.com', 'admin');
      const res = await app.handle(
        new Request('http://localhost/mahasiswa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nim: '12345678',
            nama: 'Mahasiswa Admin',
            email: 'mhs-admin@test.com',
            programStudiId: prodiId,
            namaIbuKandung: 'Ibu Kandung Admin',
            nik: '1234567890123456',
            jenisKelamin: 'L',
            tanggalLahir: '2000-01-01',
          }),
        })
      );
      const data = await res.json() as { id: number };
      mhsId = data.id;
    });

    it('harus sukses memperbarui data mahasiswa jika diakses oleh Admin dengan payload valid', async () => {
      const adminToken = await getAuthToken('admin-mhs@test.com', 'admin');

      const response = await app.handle(
        new Request(`http://localhost/mahasiswa/${mhsId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nama: 'Budi Terupdate',
          }),
        })
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.nama).toBe('Budi Terupdate');
    });

    it('harus gagal memperbarui data mahasiswa jika ID tidak ditemukan', async () => {
      const adminToken = await getAuthToken('admin-mhs@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/mahasiswa/999999', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nama: 'Budi Terupdate',
          }),
        })
      );

      expect(response.status).toBe(404);
    });

    it('harus gagal memperbarui jika diakses oleh non-authorized role (RBAC)', async () => {
      const mhsToken = await getAuthToken('mhs-mhs@test.com', 'mahasiswa');

      const response = await app.handle(
        new Request(`http://localhost/mahasiswa/${mhsId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({
            nama: 'Budi Terupdate',
          }),
        })
      );

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /mahasiswa/:id', () => {
    let mhsId: number;

    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-mhs@test.com', 'admin');
      const res = await app.handle(
        new Request('http://localhost/mahasiswa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nim: '12345678',
            nama: 'Mahasiswa Admin',
            email: 'mhs-admin@test.com',
            programStudiId: prodiId,
            namaIbuKandung: 'Ibu Kandung Admin',
            nik: '1234567890123456',
            jenisKelamin: 'L',
            tanggalLahir: '2000-01-01',
          }),
        })
      );
      const data = await res.json() as { id: number };
      mhsId = data.id;
    });

    it('harus sukses menghapus mahasiswa jika diakses oleh Admin dengan ID valid', async () => {
      const adminToken = await getAuthToken('admin-mhs@test.com', 'admin');

      const response = await app.handle(
        new Request(`http://localhost/mahasiswa/${mhsId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
          },
        })
      );

      expect(response.status).toBe(200);

      // Verify deletion
      const checkResponse = await app.handle(
        new Request(`http://localhost/mahasiswa/${mhsId}`, { method: 'GET' })
      );
      expect(checkResponse.status).toBe(404);
    });

    it('harus gagal menghapus mahasiswa jika ID tidak ditemukan', async () => {
      const adminToken = await getAuthToken('admin-mhs@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/mahasiswa/999999', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
          },
        })
      );

      expect(response.status).toBe(404);
    });

    it('harus gagal menghapus jika diakses oleh non-Admin (RBAC)', async () => {
      const mhsToken = await getAuthToken('mhs-mhs@test.com', 'mahasiswa');

      const response = await app.handle(
        new Request(`http://localhost/mahasiswa/${mhsId}`, {
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
