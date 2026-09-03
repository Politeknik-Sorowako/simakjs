import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { dosen } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('7. Kelas Kuliah (/kelas-kuliah)', () => {
  let prodiId: number;
  let mkId: number;

  beforeEach(async () => {
    await clearDatabase();
    const adminToken = await getAuthToken('admin-kelas-setup@test.com', 'admin');

    const prodiRes = await app.handle(
      new Request('http://localhost/prodi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          kode: 'TI-KELAS-SETUP',
          nama: 'Teknik Informatika Kelas Setup',
          jenjang: 'D4',
        }),
      }),
    );
    const prodiData = (await prodiRes.json()) as { id: number };
    prodiId = prodiData.id;

    const mkRes = await app.handle(
      new Request('http://localhost/mata-kuliah', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          kode: 'MKKELAS001',
          nama: 'Basis Data',
          sksTotal: 3,
          programStudiId: prodiId,
        }),
      }),
    );
    const mkData = (await mkRes.json()) as { id: number };
    mkId = mkData.id;

    await app.handle(
      new Request('http://localhost/periode-akademik', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          id: '20232',
          nama: '2023/2024 Genap',
          aktif: true,
        }),
      }),
    );
  });

  describe('POST /kelas-kuliah', () => {
    it('harus sukses menambahkan kelas kuliah baru jika diakses oleh Admin dengan payload valid', async () => {
      const adminToken = await getAuthToken('admin-kelas@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/kelas-kuliah', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mataKuliahId: mkId,
            periodeId: '20232',
            namaKelas: 'TI-4A',
          }),
        }),
      );

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.id).toBeDefined();
      expect(body.namaKelas).toBe('TI-4A');
    });

    it('harus gagal menambahkan jika payload tidak lengkap (Validation)', async () => {
      const adminToken = await getAuthToken('admin-kelas@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/kelas-kuliah', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mataKuliahId: 'invalid', // should be number
            periodeId: '20232',
          }),
        }),
      );

      expect(response.status).toBe(422);
    });

    it('harus gagal jika diakses oleh non-Admin (RBAC)', async () => {
      const mhsToken = await getAuthToken('mhs-kelas@test.com', 'mahasiswa');

      const response = await app.handle(
        new Request('http://localhost/kelas-kuliah', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({
            mataKuliahId: mkId,
            periodeId: '20232',
            namaKelas: 'TI-4A',
          }),
        }),
      );

      expect(response.status).toBe(403);
    });
  });

  describe('GET /kelas-kuliah', () => {
    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-kelas@test.com', 'admin');
      await app.handle(
        new Request('http://localhost/kelas-kuliah', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mataKuliahId: mkId,
            periodeId: '20232',
            namaKelas: 'TI-4A',
          }),
        }),
      );
    });

    it('harus sukses mengambil list kelas kuliah', async () => {
      const response = await app.handle(new Request('http://localhost/kelas-kuliah', { method: 'GET' }));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.length).toBeGreaterThan(0);
    });

    it('harus sukses memfilter list kelas berdasarkan mataKuliahId', async () => {
      const response = await app.handle(
        new Request(`http://localhost/kelas-kuliah?mataKuliahId=${mkId}`, { method: 'GET' }),
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0].mataKuliahId).toBe(mkId);

      const nonExistentResponse = await app.handle(
        new Request('http://localhost/kelas-kuliah?mataKuliahId=999999', { method: 'GET' }),
      );
      expect(nonExistentResponse.status).toBe(200);
      const nonExistentBody = await nonExistentResponse.json();
      expect(nonExistentBody.data.length).toBe(0);
    });
  });

  describe('GET /kelas-kuliah/:id', () => {
    let kelasId: number;

    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-kelas@test.com', 'admin');
      const res = await app.handle(
        new Request('http://localhost/kelas-kuliah', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mataKuliahId: mkId,
            periodeId: '20232',
            namaKelas: 'TI-4A',
          }),
        }),
      );
      const data = (await res.json()) as { id: number };
      kelasId = data.id;
    });

    it('harus sukses mengambil detail kelas kuliah berdasarkan ID valid', async () => {
      const response = await app.handle(new Request(`http://localhost/kelas-kuliah/${kelasId}`, { method: 'GET' }));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.namaKelas).toBe('TI-4A');
    });

    it('harus mengembalikan error 404 jika ID tidak ditemukan', async () => {
      const response = await app.handle(new Request('http://localhost/kelas-kuliah/999999', { method: 'GET' }));
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /kelas-kuliah/:id', () => {
    let kelasId: number;

    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-kelas@test.com', 'admin');
      const res = await app.handle(
        new Request('http://localhost/kelas-kuliah', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mataKuliahId: mkId,
            periodeId: '20232',
            namaKelas: 'TI-4A',
          }),
        }),
      );
      const data = (await res.json()) as { id: number };
      kelasId = data.id;
    });

    it('harus sukses memperbarui kelas kuliah jika diakses oleh Admin dengan payload valid', async () => {
      const adminToken = await getAuthToken('admin-kelas@test.com', 'admin');

      const response = await app.handle(
        new Request(`http://localhost/kelas-kuliah/${kelasId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            namaKelas: 'TI-4A-Terupdate',
          }),
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.namaKelas).toBe('TI-4A-Terupdate');
    });

    it('harus gagal memperbarui jika ID tidak ditemukan', async () => {
      const adminToken = await getAuthToken('admin-kelas@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/kelas-kuliah/999999', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            namaKelas: 'Terupdate',
          }),
        }),
      );

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /kelas-kuliah/:id', () => {
    let kelasId: number;

    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-kelas@test.com', 'admin');
      const res = await app.handle(
        new Request('http://localhost/kelas-kuliah', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mataKuliahId: mkId,
            periodeId: '20232',
            namaKelas: 'TI-4A',
          }),
        }),
      );
      const data = (await res.json()) as { id: number };
      kelasId = data.id;
    });

    it('harus sukses menghapus kelas kuliah jika diakses oleh Admin dengan ID valid', async () => {
      const adminToken = await getAuthToken('admin-kelas@test.com', 'admin');

      const response = await app.handle(
        new Request(`http://localhost/kelas-kuliah/${kelasId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }),
      );

      expect(response.status).toBe(200);
    });

    it('harus gagal menghapus jika ID tidak ditemukan', async () => {
      const adminToken = await getAuthToken('admin-kelas@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/kelas-kuliah/999999', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }),
      );

      expect(response.status).toBe(404);
    });
  });

  describe('GET /kelas-kuliah/template & POST /kelas-kuliah/import', () => {
    it('harus mengembalikan template CSV dengan kolom kode_prodi', async () => {
      const adminToken = await getAuthToken('admin-kelas@test.com', 'admin');
      const response = await app.handle(
        new Request('http://localhost/kelas-kuliah/template/csv', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }),
      );

      expect(response.status).toBe(200);
      const csvText = await response.text();
      expect(csvText).toContain(
        'kode_prodi,kode_mata_kuliah,periode_id,nama_kelas,nip_dosen,sks_beban_mengajar,id_pddikti',
      );
    });

    it('harus sukses mengimpor kelas kuliah dengan kodeProdi dan tim dosen (multi-dosen)', async () => {
      const adminToken = await getAuthToken('admin-kelas@test.com', 'admin');

      // Create dosen for testing
      await db.insert(dosen).values([
        {
          nip: '199001012020011001',
          nama: 'Dosen Pengampu A',
          email: 'dosenA@test.com',
          programStudiId: prodiId,
        },
        {
          nip: '199001012020011002',
          nama: 'Dosen Pengampu B',
          email: 'dosenB@test.com',
          programStudiId: prodiId,
        },
      ]);

      const importResponse = await app.handle(
        new Request('http://localhost/kelas-kuliah/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            items: [
              {
                kodeProdi: 'TI-KELAS-SETUP',
                kodeMataKuliah: 'MKKELAS001',
                periodeId: '20232',
                namaKelas: 'TI-1A',
                nipDosen: '199001012020011001; 199001012020011002',
                sksBebanMengajar: '2; 1',
              },
            ],
          }),
        }),
      );

      expect(importResponse.status).toBe(200);
      const result = await importResponse.json();
      if (result.failed > 0) {
        console.log('importResult details:', JSON.stringify(result));
      }
      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
    });
  });
});
