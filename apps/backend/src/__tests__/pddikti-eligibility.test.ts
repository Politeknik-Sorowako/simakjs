import { describe, it, expect, beforeEach } from 'bun:test';
import { app } from '../index';
import { clearDatabase, getAuthToken } from './test-helper';
import { db } from '../utils/db';
import { programStudi, mahasiswa, periodeAkademik, mataKuliah, kelasKuliah, krs, bimbingan, bap, presensi, dosen, cpmk } from '../models/schema';
import { eq } from 'drizzle-orm';

describe('PDDIKTI Feeder & Exam Eligibility API', () => {
  let adminToken: string;
  let dosenToken: string;
  let mhsToken: string;
  
  let prodiId: number;
  let mhsId: number;
  const periodeId = '20231';
  let mkId: number;
  let kelasId: number;
  let krsId: number;
  let dosenId: number;
  let cpmkId: number;

  beforeEach(async () => {
    await clearDatabase();

    adminToken = await getAuthToken('admin@test.com', 'admin');
    dosenToken = await getAuthToken('dosen@test.com', 'dosen');
    mhsToken = await getAuthToken('mhs@test.com', 'mahasiswa');

    // 1. Seed Prodi
    const [prodi] = await db.insert(programStudi).values({
      kode: 'TI',
      nama: 'Teknik Informatika',
      jenjang: 'D4',
    }).returning();
    prodiId = prodi.id;

    // Seed Dosen
    const [dsn] = await db.insert(dosen).values({
      nidn: '12345678',
      nip: '123456789012345678',
      nama: 'Dosen Test',
      email: 'dosen@test.com',
      programStudiId: prodiId,
    }).returning();
    dosenId = dsn.id;

    // 2. Seed Mahasiswa
    const [mhs] = await db.insert(mahasiswa).values({
      nim: '20200001',
      nama: 'Mahasiswa Test',
      email: 'mhs@test.com',
      programStudiId: prodiId,
      status: 'aktif',
      namaIbuKandung: 'Ibu Test',
      nik: '1234567890123456',
      jenisKelamin: 'L',
      tanggalLahir: '2000-01-01',
    }).returning();
    mhsId = mhs.id;

    // 3. Seed Active Periode
    await db.insert(periodeAkademik).values({
      id: periodeId,
      nama: 'Ganjil 2023/2024',
      aktif: true,
    });

    // 4. Seed Mata Kuliah
    const [mk] = await db.insert(mataKuliah).values({
      kode: 'IF101',
      nama: 'Pemrograman Dasar',
      sksTotal: 3,
      sksTeori: 2,
      sksPraktik: 1,
      semester: 1,
      programStudiId: prodiId,
    }).returning();
    mkId = mk.id;

    // Seed CPMK
    const [c] = await db.insert(cpmk).values({
      mataKuliahId: mkId,
      kode: 'CPMK-1',
      deskripsi: 'Mampu menjelaskan konsep dasar pemrograman',
    }).returning();
    cpmkId = c.id;

    // 5. Seed Kelas
    const [kelas] = await db.insert(kelasKuliah).values({
      mataKuliahId: mkId,
      periodeId: periodeId,
      namaKelas: 'A',
    }).returning();
    kelasId = kelas.id;

    // 6. Seed KRS
    const [k] = await db.insert(krs).values({
      mahasiswaId: mhsId,
      kelasKuliahId: kelasId,
      isApproved: true,
    }).returning();
    krsId = k.id;
  });

  describe('Exam Eligibility Checks', () => {
    it('should show student as NOT eligible if bimbingan and attendance are not met', async () => {
      const response = await app.handle(
        new Request(`http://localhost/khs/mahasiswa/${mhsId}/periode/${periodeId}/eligibility`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${mhsToken}` }
        })
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.overallEligible).toBe(false);
      expect(data.bimbingan.eligible).toBe(false);
    });

    it('should show student as eligible if bimbingan is approved and attendance is >= 80%', async () => {
      // 1. Seed approved bimbingan
      await db.insert(bimbingan).values({
        mahasiswaId: mhsId,
        periodeId: periodeId,
        isApproved: true,
      });

      // 2. Seed meetings & attendance
      const [meeting] = await db.insert(bap).values({
        kelasKuliahId: kelasId,
        pertemuanKe: 1,
        materi: 'Introduction',
        tanggal: '2023-09-01',
        durasiMenit: 100,
        cpmkId: cpmkId,
        dosenId: dosenId,
      }).returning();

      await db.insert(presensi).values({
        bapId: meeting.id,
        mahasiswaId: mhsId,
        status: 'hadir',
        durasiMangkir: 0,
      });

      const response = await app.handle(
        new Request(`http://localhost/khs/mahasiswa/${mhsId}/periode/${periodeId}/eligibility`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${mhsToken}` }
        })
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.overallEligible).toBe(true);
      expect(data.bimbingan.eligible).toBe(true);
      expect(data.classes[0].attendanceRate).toBe(100);
    });
  });

  describe('Grade Locking Process', () => {
    it('should lock grade and reject future inputs', async () => {
      // 1. Lock the class
      const lockRes = await app.handle(
        new Request(`http://localhost/yudisium/kelas/${kelasId}/lock`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${dosenToken}` }
        })
      );
      expect(lockRes.status).toBe(200);

      // 2. Try to save components
      const compRes = await app.handle(
        new Request(`http://localhost/yudisium/kelas/komponen`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${dosenToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            kelasKuliahId: kelasId,
            komponenList: [{ nama: 'Tugas', bobot: 100 }]
          })
        })
      );
      expect(compRes.status).toBe(400);
      const compData = await compRes.json();
      expect(compData.error).toContain('dikunci');
    });
  });

  describe('PDDIKTI Sync Simulation', () => {
    it('should execute PDDIKTI Sync and return statistics', async () => {
      // 1. Get initial stats
      const statsRes = await app.handle(
        new Request('http://localhost/pddikti/stats', {
          method: 'GET',
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      expect(statsRes.status).toBe(200);
      const statsData = await statsRes.json();
      expect(statsData.mahasiswa.unsynced).toBe(1);

      // 2. Trigger sync
      const syncRes = await app.handle(
        new Request('http://localhost/pddikti/sync', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      expect(syncRes.status).toBe(200);
      const syncData = await syncRes.json();
      expect(syncData.details.mahasiswaSynced).toBe(1);

      // 3. Verify updated stats
      const statsRes2 = await app.handle(
        new Request('http://localhost/pddikti/stats', {
          method: 'GET',
          headers: { Authorization: `Bearer ${adminToken}` }
        })
      );
      const statsData2 = await statsRes2.json();
      expect(statsData2.mahasiswa.unsynced).toBe(0);
    });
  });
});
