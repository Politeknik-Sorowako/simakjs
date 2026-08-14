import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { dosen, dosenPengajarKelas, kelasKuliah, mataKuliah, periodeAkademik, programStudi } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Dosen Pengajar & Kelas Kuliah Scoping (/dosen-pengajar & /kelas-kuliah)', () => {
  let dosenAId: number;
  let dosenBId: number;
  let kelas1Id: number;
  let kelas2Id: number;
  let adminToken: string;
  let dosenAToken: string;
  let dosenBToken: string;
  let dosenUnlinkedToken: string;

  beforeEach(async () => {
    await clearDatabase();

    // 1. Setup Tokens
    adminToken = await getAuthToken('admin-scope@test.com', 'admin');
    dosenAToken = await getAuthToken('dosenA@test.com', 'dosen');
    dosenBToken = await getAuthToken('dosenB@test.com', 'dosen');
    dosenUnlinkedToken = await getAuthToken('dosen-unlinked@test.com', 'dosen');

    // 2. Setup Master Data
    const [prodi] = await db
      .insert(programStudi)
      .values({
        kode: 'TI-SCOPE',
        nama: 'Teknik Informatika Scope',
        jenjang: 'D4',
      })
      .returning();

    await db.insert(periodeAkademik).values({
      id: '20241',
      nama: '2024/2025 Ganjil',
      aktif: true,
    });

    const [mk1] = await db
      .insert(mataKuliah)
      .values({
        kode: 'MK001',
        nama: 'Pemrograman Web',
        sksTotal: 3,
        programStudiId: prodi.id,
      })
      .returning();

    const [mk2] = await db
      .insert(mataKuliah)
      .values({
        kode: 'MK002',
        nama: 'Kecerdasan Buatan',
        sksTotal: 3,
        programStudiId: prodi.id,
      })
      .returning();

    // 3. Setup Dosen Records matching tokens
    const [dA] = await db
      .insert(dosen)
      .values({
        nip: '198001012005011001',
        nama: 'Dr. Dosen A',
        email: 'dosenA@test.com',
        programStudiId: prodi.id,
      })
      .returning();
    dosenAId = dA.id;

    const [dB] = await db
      .insert(dosen)
      .values({
        nip: '198502022010011002',
        nama: 'Dr. Dosen B',
        email: 'dosenB@test.com',
        programStudiId: prodi.id,
      })
      .returning();
    dosenBId = dB.id;

    // 4. Setup Kelas Kuliah
    const [k1] = await db
      .insert(kelasKuliah)
      .values({
        mataKuliahId: mk1.id,
        periodeId: '20241',
        namaKelas: 'TI-Web-A',
      })
      .returning();
    kelas1Id = k1.id;

    const [k2] = await db
      .insert(kelasKuliah)
      .values({
        mataKuliahId: mk2.id,
        periodeId: '20241',
        namaKelas: 'TI-AI-B',
      })
      .returning();
    kelas2Id = k2.id;

    // 5. Map Dosen A -> Kelas 1, Dosen B -> Kelas 2
    await db.insert(dosenPengajarKelas).values([
      {
        dosenId: dosenAId,
        kelasKuliahId: kelas1Id,
        sksBebanMengajar: 3,
      },
      {
        dosenId: dosenBId,
        kelasKuliahId: kelas2Id,
        sksBebanMengajar: 3,
      },
    ]);
  });

  describe('GET /dosen-pengajar scoping', () => {
    it('Dosen A hanya mendapatkan kelas yang diampunya (Kelas 1)', async () => {
      const res = await app.handle(
        new Request('http://localhost/dosen-pengajar', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${dosenAToken}`,
          },
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.length).toBe(1);
      expect(body.data[0].kelasKuliahId).toBe(kelas1Id);
      expect(body.data[0].dosenId).toBe(dosenAId);
    });

    it('Dosen B hanya mendapatkan kelas yang diampunya (Kelas 2)', async () => {
      const res = await app.handle(
        new Request('http://localhost/dosen-pengajar', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${dosenBToken}`,
          },
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.length).toBe(1);
      expect(body.data[0].kelasKuliahId).toBe(kelas2Id);
      expect(body.data[0].dosenId).toBe(dosenBId);
    });

    it('Dosen A tidak dapat membobol data Dosen B dengan mengirim ?dosenId=dosenBId', async () => {
      const res = await app.handle(
        new Request(`http://localhost/dosen-pengajar?dosenId=${dosenBId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${dosenAToken}`,
          },
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      // Tetap ter-scope ke Dosen A saja
      expect(body.data.length).toBe(1);
      expect(body.data[0].dosenId).toBe(dosenAId);
    });

    it('Admin dapat melihat semua mapping dosen pengajar atau memfilter berdasarkan dosenId', async () => {
      // All
      const resAll = await app.handle(
        new Request('http://localhost/dosen-pengajar', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }),
      );
      expect(resAll.status).toBe(200);
      const bodyAll = await resAll.json();
      expect(bodyAll.data.length).toBe(2);

      // Filtered
      const resFiltered = await app.handle(
        new Request(`http://localhost/dosen-pengajar?dosenId=${dosenAId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }),
      );
      expect(resFiltered.status).toBe(200);
      const bodyFiltered = await resFiltered.json();
      expect(bodyFiltered.data.length).toBe(1);
      expect(bodyFiltered.data[0].dosenId).toBe(dosenAId);
    });

    it('Dosen dengan akun yang belum ditautkan profilnya mengembalikan list kosong (bukan seluruh data)', async () => {
      const res = await app.handle(
        new Request('http://localhost/dosen-pengajar', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${dosenUnlinkedToken}`,
          },
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.length).toBe(0);
      expect(body.meta.total).toBe(0);
    });
  });

  describe('GET /kelas-kuliah scoping', () => {
    it('Dosen A yang memanggil /kelas-kuliah hanya mendapatkan Kelas 1', async () => {
      const res = await app.handle(
        new Request('http://localhost/kelas-kuliah', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${dosenAToken}`,
          },
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.length).toBe(1);
      expect(body.data[0].id).toBe(kelas1Id);
    });

    it('Dosen unlinked yang memanggil /kelas-kuliah mengembalikan list kosong', async () => {
      const res = await app.handle(
        new Request('http://localhost/kelas-kuliah', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${dosenUnlinkedToken}`,
          },
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.length).toBe(0);
      expect(body.meta.total).toBe(0);
    });
  });
});
