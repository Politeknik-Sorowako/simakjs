import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
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
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          kode: 'TI-MHS-SETUP',
          nama: 'Teknik Informatika Setup',
          jenjang: 'D4',
        }),
      }),
    );
    const data = (await response.json()) as { id: number };
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
            Authorization: `Bearer ${adminToken}`,
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
        }),
      );

      expect(response.status).toBe(201);
      const body = (await response.json()) as MahasiswaSuccessResponse;
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
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nim: '12345678',
            nama: 'Mahasiswa Admin',
            email: 'invalid-email',
            programStudiId: prodiId,
          }),
        }),
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
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(payload),
        }),
      );

      const response = await app.handle(
        new Request('http://localhost/mahasiswa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            ...payload,
            email: 'other-email@test.com',
            nik: '1234567890123457',
          }),
        }),
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
            Authorization: `Bearer ${mhsToken}`,
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
        }),
      );

      expect(response.status).toBe(403);
    });
  });

  describe('GET /mahasiswa', () => {
    let token: string;
    beforeEach(async () => {
      token = await getAuthToken('admin-mhs@test.com', 'admin');
      const items = [
        {
          nim: '12345678',
          nama: 'Budi Santoso',
          email: 'budi@test.com',
          programStudiId: prodiId,
          namaIbuKandung: 'Ibu Budi',
          nik: '1234567890123451',
          jenisKelamin: 'L',
          tanggalLahir: '2000-01-01',
        },
        {
          nim: '12345679',
          nama: 'Ani Lestari',
          email: 'ani@test.com',
          programStudiId: prodiId,
          namaIbuKandung: 'Ibu Ani',
          nik: '1234567890123452',
          jenisKelamin: 'P',
          tanggalLahir: '2001-02-02',
        },
      ];
      for (const item of items) {
        await app.handle(
          new Request('http://localhost/mahasiswa', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(item),
          }),
        );
      }
    });

    it('harus sukses mengambil list mahasiswa (Default)', async () => {
      const response = await app.handle(
        new Request('http://localhost/mahasiswa', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBe(2);
    });

    it('harus sukses menggunakan pagination (page & limit)', async () => {
      const response = await app.handle(
        new Request('http://localhost/mahasiswa?page=1&limit=1', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.length).toBe(1);
    });

    it('harus sukses mencari mahasiswa berdasarkan keyword search', async () => {
      const response = await app.handle(
        new Request('http://localhost/mahasiswa?search=Budi', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.length).toBe(1);
      expect(body.data[0].nim).toBe('12345678');
    });

    it('harus gagal mengambil list mahasiswa jika diakses oleh Guest (RBAC)', async () => {
      // Guest is not supported directly by getAuthToken type definition helper but since we updated the enum and schemas it will register and authenticate correctly
      const guestToken = await getAuthToken('guest-mhs@test.com', 'guest' as Parameters<typeof getAuthToken>[1]);
      const response = await app.handle(
        new Request('http://localhost/mahasiswa', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${guestToken}`,
          },
        }),
      );
      expect(response.status).toBe(403);
    });

    it('harus gagal mengambil list mahasiswa jika tanpa token (Guest)', async () => {
      const response = await app.handle(new Request('http://localhost/mahasiswa', { method: 'GET' }));
      expect(response.status).toBe(403);
    });

    it('harus hanya mengembalikan profil sendiri jika diakses oleh Mahasiswa (IDOR)', async () => {
      const mhsToken = await getAuthToken('budi@test.com', 'mahasiswa');
      const response = await app.handle(
        new Request('http://localhost/mahasiswa', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mhsToken}`,
          },
        }),
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.length).toBe(1);
      expect(body.data[0].email).toBe('budi@test.com');
    });
  });

  describe('GET /mahasiswa/:id', () => {
    let mhsId: number;
    let token: string;

    beforeEach(async () => {
      token = await getAuthToken('admin-mhs@test.com', 'admin');
      const res = await app.handle(
        new Request('http://localhost/mahasiswa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
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
        }),
      );
      const data = (await res.json()) as { id: number };
      mhsId = data.id;
    });

    it('harus sukses mengambil detail mahasiswa berdasarkan ID valid', async () => {
      const response = await app.handle(
        new Request(`http://localhost/mahasiswa/${mhsId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.nim).toBe('12345678');
    });

    it('harus mengembalikan error 404 ketika ID mahasiswa tidak ditemukan', async () => {
      const response = await app.handle(
        new Request('http://localhost/mahasiswa/999999', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );
      expect(response.status).toBe(404);
    });

    it('harus gagal mengambil profil mahasiswa lain jika diakses oleh Mahasiswa (IDOR)', async () => {
      const mhsToken = await getAuthToken('other-student@test.com', 'mahasiswa');
      await app.handle(
        new Request('http://localhost/mahasiswa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            nim: '87654321',
            nama: 'Other Student',
            email: 'other-student@test.com',
            programStudiId: prodiId,
            namaIbuKandung: 'Ibu Other',
            nik: '8765432109876543',
            jenisKelamin: 'L',
            tanggalLahir: '2001-01-01',
          }),
        }),
      );

      const response = await app.handle(
        new Request(`http://localhost/mahasiswa/${mhsId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mhsToken}`,
          },
        }),
      );
      expect(response.status).toBe(403);
    });

    it('harus sukses mengambil profil sendiri jika diakses oleh Mahasiswa (IDOR)', async () => {
      const mhsToken = await getAuthToken('other-student-2@test.com', 'mahasiswa');
      const res = await app.handle(
        new Request('http://localhost/mahasiswa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            nim: '87654322',
            nama: 'Other Student 2',
            email: 'other-student-2@test.com',
            programStudiId: prodiId,
            namaIbuKandung: 'Ibu Other 2',
            nik: '8765432109876544',
            jenisKelamin: 'L',
            tanggalLahir: '2001-01-01',
          }),
        }),
      );
      const data = (await res.json()) as { id: number };
      const myId = data.id;

      const response = await app.handle(
        new Request(`http://localhost/mahasiswa/${myId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mhsToken}`,
          },
        }),
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.email).toBe('other-student-2@test.com');
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
            Authorization: `Bearer ${adminToken}`,
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
        }),
      );
      const data = (await res.json()) as { id: number };
      mhsId = data.id;
    });

    it('harus sukses memperbarui data mahasiswa jika diakses oleh Admin dengan payload valid', async () => {
      const adminToken = await getAuthToken('admin-mhs@test.com', 'admin');

      const response = await app.handle(
        new Request(`http://localhost/mahasiswa/${mhsId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nama: 'Budi Terupdate',
          }),
        }),
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
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nama: 'Budi Terupdate',
          }),
        }),
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
            Authorization: `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({
            nama: 'Budi Terupdate',
          }),
        }),
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
            Authorization: `Bearer ${adminToken}`,
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
        }),
      );
      const data = (await res.json()) as { id: number };
      mhsId = data.id;
    });

    it('harus sukses menghapus mahasiswa jika diakses oleh Admin dengan ID valid', async () => {
      const adminToken = await getAuthToken('admin-mhs@test.com', 'admin');

      const response = await app.handle(
        new Request(`http://localhost/mahasiswa/${mhsId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }),
      );

      expect(response.status).toBe(200);

      // Verify deletion
      const checkResponse = await app.handle(
        new Request(`http://localhost/mahasiswa/${mhsId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }),
      );
      expect(checkResponse.status).toBe(404);
    });

    it('harus gagal menghapus mahasiswa jika ID tidak ditemukan', async () => {
      const adminToken = await getAuthToken('admin-mhs@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/mahasiswa/999999', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }),
      );

      expect(response.status).toBe(404);
    });

    it('harus membatasi akses Dosen PA hanya untuk melihat mahasiswa bimbingannya', async () => {
      // 1. Setup Dosen A & Dosen B
      const adminToken = await getAuthToken('admin-mhs@test.com', 'admin');

      const dsnResA = await app.handle(
        new Request('http://localhost/dosen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({
            nip: 'DSN-PA-A',
            nama: 'Dosen PA A',
            email: 'dosen-a@test.com',
            programStudiId: prodiId,
          }),
        }),
      );
      const dosenA = (await dsnResA.json()) as { id: number };

      const dsnResB = await app.handle(
        new Request('http://localhost/dosen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({
            nip: 'DSN-PA-B',
            nama: 'Dosen PA B',
            email: 'dosen-b@test.com',
            programStudiId: prodiId,
            nidn: '000101870B',
            nik: '1234567890123452',
          }),
        }),
      );
      const dosenB = (await dsnResB.json()) as { id: number };

      // 2. Tambah Mahasiswa X (bimbingan Dosen A) & Mahasiswa Y (bimbingan Dosen B)
      const mhsResX = await app.handle(
        new Request('http://localhost/mahasiswa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({
            nim: '88880001',
            nama: 'Mhs Binaan A',
            email: 'mhs-a@test.com',
            programStudiId: prodiId,
            dosenPaId: dosenA.id,
            namaIbuKandung: 'Ibu A',
            nik: '1234567890123451',
            jenisKelamin: 'L',
            tanggalLahir: '2000-01-01',
          }),
        }),
      );
      const mhsX = (await mhsResX.json()) as { id: number };

      const mhsResY = await app.handle(
        new Request('http://localhost/mahasiswa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({
            nim: '88880002',
            nama: 'Mhs Binaan B',
            email: 'mhs-b@test.com',
            programStudiId: prodiId,
            dosenPaId: dosenB.id,
            namaIbuKandung: 'Ibu B',
            nik: '1234567890123452',
            jenisKelamin: 'P',
            tanggalLahir: '2000-01-01',
          }),
        }),
      );
      const mhsY = (await mhsResY.json()) as { id: number };

      // 3. Login sebagai Dosen A
      const dosenAToken = await getAuthToken('dosen-a@test.com', 'dosen');

      // 4. Dosen A GET list mahasiswa -> Hanya boleh mendapat Mahasiswa X (Mhs Binaan A)
      const listRes = await app.handle(
        new Request('http://localhost/mahasiswa', {
          method: 'GET',
          headers: { Authorization: `Bearer ${dosenAToken}` },
        }),
      );
      expect(listRes.status).toBe(200);
      const listData = (await listRes.json()) as { data: Record<string, unknown>[] };
      expect(listData.data.length).toBe(1);
      expect(listData.data[0].id).toBe(mhsX.id);

      // 5. Dosen A GET detail Mahasiswa X -> Sukses 200
      const detailXRes = await app.handle(
        new Request(`http://localhost/mahasiswa/${mhsX.id}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${dosenAToken}` },
        }),
      );
      expect(detailXRes.status).toBe(200);

      // 6. Dosen A GET detail Mahasiswa Y -> Gagal 403
      const detailYRes = await app.handle(
        new Request(`http://localhost/mahasiswa/${mhsY.id}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${dosenAToken}` },
        }),
      );
      expect(detailYRes.status).toBe(403);

      // 7. Dosen A update Mahasiswa X mengubah dosenPaId -> Gagal 403
      const updatePaRes = await app.handle(
        new Request(`http://localhost/mahasiswa/${mhsX.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosenAToken}` },
          body: JSON.stringify({ dosenPaId: dosenB.id }),
        }),
      );
      expect(updatePaRes.status).toBe(403);
    });

    it('harus sukses mengimpor relasi pembimbing akademik mahasiswa via CSV', async () => {
      const adminToken = await getAuthToken('admin-mhs@test.com', 'admin');

      // 1. Tambah Dosen
      const dsnRes = await app.handle(
        new Request('http://localhost/dosen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({
            nip: 'DSN-PA-IMPORT',
            nama: 'Dosen Import PA',
            email: 'dosen-import-pa@test.com',
            programStudiId: prodiId,
          }),
        }),
      );
      const dosenData = (await dsnRes.json()) as { id: number };

      // 2. Tambah Mahasiswa
      const mhsRes = await app.handle(
        new Request('http://localhost/mahasiswa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({
            nim: '99990001',
            nama: 'Mhs Import PA',
            email: 'mhs-import-pa@test.com',
            programStudiId: prodiId,
            namaIbuKandung: 'Ibu Import',
            nik: '1234567890123459',
            jenisKelamin: 'L',
            tanggalLahir: '2000-01-01',
          }),
        }),
      );
      const mhsData = (await mhsRes.json()) as { id: number };

      // 3. Impor CSV Relasi
      const csvContent = 'nim,nip_dosen_pa\n99990001,DSN-PA-IMPORT\n';
      const formData = new FormData();
      const file = new File([csvContent], 'import-pa.csv', { type: 'text/csv' });
      formData.append('file', file);

      const importRes = await app.handle(
        new Request('http://localhost/mahasiswa/import-pa', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
          body: formData,
        }),
      );

      expect(importRes.status).toBe(200);
      const importResult = (await importRes.json()) as { successCount: number; errors: Record<string, unknown>[] };
      expect(importResult.successCount).toBe(1);
      expect(importResult.errors.length).toBe(0);

      // 4. Verifikasi relasi ter-update
      const checkRes = await app.handle(
        new Request(`http://localhost/mahasiswa/${mhsData.id}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      );
      const checkedMhs = (await checkRes.json()) as { dosenPaId: number };
      expect(checkedMhs.dosenPaId).toBe(dosenData.id);
    });
  });
});
