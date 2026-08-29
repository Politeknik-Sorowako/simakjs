import { beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import {
  dosen,
  dosenPengajarKelas,
  kelasKuliah,
  krs,
  mahasiswa,
  mataKuliah,
  periodeAkademik,
  programStudi,
  tagihan,
} from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('KHS, Grade Components & Yudisium API', () => {
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

  beforeEach(async () => {
    await clearDatabase();

    adminToken = await getAuthToken('admin@test.com', 'admin');
    dosenToken = await getAuthToken('dosen@test.com', 'dosen');
    mhsToken = await getAuthToken('mhs@test.com', 'mahasiswa');

    // Seed Prodi
    const [prodi] = await db
      .insert(programStudi)
      .values({
        kode: 'TI',
        nama: 'Teknik Informatika',
        jenjang: 'D4',
      })
      .returning();
    prodiId = prodi.id;

    // Seed Dosen
    const [dsn] = await db
      .insert(dosen)
      .values({
        nidn: '12345678',
        nip: '123456789012345678',
        nama: 'Dosen Test',
        email: 'dosen@test.com',
        programStudiId: prodiId,
      })
      .returning();
    dosenId = dsn.id;

    // Seed Mahasiswa
    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20200001',
        nama: 'Mahasiswa Test',
        email: 'mhs@test.com',
        programStudiId: prodiId,
        status: 'aktif',
        namaIbuKandung: 'Ibu Test',
        nik: '1234567890123456',
        jenisKelamin: 'L',
        tanggalLahir: '2000-01-01',
      })
      .returning();
    mhsId = mhs.id;

    // Seed Active Periode
    await db.insert(periodeAkademik).values({
      id: periodeId,
      nama: 'Ganjil 2023/2024',
      aktif: true,
    });

    // Seed Mata Kuliah
    const [mk] = await db
      .insert(mataKuliah)
      .values({
        kode: 'MK001',
        nama: 'Pemrograman Web',
        sksTotal: 3,
        programStudiId: prodiId,
      })
      .returning();
    mkId = mk.id;

    // Seed Kelas
    const [kelas] = await db
      .insert(kelasKuliah)
      .values({
        mataKuliahId: mkId,
        periodeId: periodeId,
        namaKelas: 'TI-3A',
      })
      .returning();
    kelasId = kelas.id;

    await db.insert(dosenPengajarKelas).values({
      dosenId,
      kelasKuliahId: kelasId,
      rencanaTatapMuka: 16,
      realisasiTatapMuka: 0,
      jenisEvaluasi: 'UTS',
    });

    // Seed KRS (Student Contracts Class)
    const [krsRecord] = await db
      .insert(krs)
      .values({
        mahasiswaId: mhsId,
        kelasKuliahId: kelasId,
        isApproved: true,
      })
      .returning();
    krsId = krsRecord.id;
  });

  describe('KHS Blocking (Clearance Checks)', () => {
    it('mahasiswa harus terblokir melihat KHS jika memiliki tagihan SPP belum lunas', async () => {
      // Seed Unpaid Bill
      await db.insert(tagihan).values({
        mahasiswaId: mhsId,
        periodeId: periodeId,
        nominal: 5000000,
        status: 'belum_bayar',
      });

      const response = await app.handle(
        new Request(`http://localhost/khs/mahasiswa/${mhsId}/periode/${periodeId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mhsToken}`,
          },
        }),
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.blocked).toBe(true);
      expect(data.reason).toBe('SPP Belum Lunas');
    });

    it('admin/dosen harus bisa melihat KHS mahasiswa meskipun belum lunas', async () => {
      await db.insert(tagihan).values({
        mahasiswaId: mhsId,
        periodeId: periodeId,
        nominal: 5000000,
        status: 'belum_bayar',
      });

      const response = await app.handle(
        new Request(`http://localhost/khs/mahasiswa/${mhsId}/periode/${periodeId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }),
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.blocked).toBe(false);
      expect(data.krsList).toBeArray();
    });
  });

  describe('Grade Components & Recalculation', () => {
    it('dosen harus sukses menyimpan komponen nilai dengan total bobot 100%', async () => {
      const response = await app.handle(
        new Request('http://localhost/yudisium/kelas/komponen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${dosenToken}`,
          },
          body: JSON.stringify({
            kelasKuliahId: kelasId,
            komponenList: [
              { nama: 'Tugas', bobot: 20 },
              { nama: 'UTS', bobot: 30 },
              { nama: 'UAS', bobot: 50 },
            ],
          }),
        }),
      );

      expect(response.status).toBe(200);
      const list = await response.json();
      expect(list.length).toBe(3);
    });

    it('dosen gagal menyimpan komponen nilai jika total bobot bukan 100%', async () => {
      const response = await app.handle(
        new Request('http://localhost/yudisium/kelas/komponen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${dosenToken}`,
          },
          body: JSON.stringify({
            kelasKuliahId: kelasId,
            komponenList: [
              { nama: 'Tugas', bobot: 20 },
              { nama: 'UTS', bobot: 30 },
            ],
          }),
        }),
      );

      expect(response.status).toBe(400);
    });

    it('dosen harus sukses menginput nilai komponen dan sistem menghitung nilai akhir dengan benar', async () => {
      // 1. Save components first
      const compRes = await app.handle(
        new Request('http://localhost/yudisium/kelas/komponen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${dosenToken}`,
          },
          body: JSON.stringify({
            kelasKuliahId: kelasId,
            komponenList: [
              { nama: 'UTS', bobot: 40 },
              { nama: 'UAS', bobot: 60 },
            ],
          }),
        }),
      );
      const comps = await compRes.json();
      const utsCompId = comps[0].id;
      const uasCompId = comps[1].id;

      // 2. Input student grades (UTS: 80, UAS: 90 => Final: 80 * 0.4 + 90 * 0.6 = 32 + 54 = 86 => Grade A, Indeks 4.00)
      const inputRes = await app.handle(
        new Request('http://localhost/yudisium/kelas/nilai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${dosenToken}`,
          },
          body: JSON.stringify({
            kelasKuliahId: kelasId,
            nilaiList: [
              {
                krsId: krsId,
                nilaiKomponenList: [
                  { komponenNilaiId: utsCompId, nilai: 80 },
                  { komponenNilaiId: uasCompId, nilai: 90 },
                ],
              },
            ],
          }),
        }),
      );

      expect(inputRes.status).toBe(200);

      // Verify updated KRS
      const [finalKrs] = await db.select().from(krs).where(eq(krs.id, krsId));
      expect(parseFloat(finalKrs.nilaiAngka!)).toBe(86.0);
      expect(finalKrs.nilaiHuruf).toBe('A');
      expect(parseFloat(finalKrs.nilaiIndeks!)).toBe(4.0);
    });

    it('mengubah komponen nilai harus me-reset nilai akhir KRS mahasiswa terkait menjadi null', async () => {
      const compRes1 = await app.handle(
        new Request('http://localhost/yudisium/kelas/komponen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${dosenToken}`,
          },
          body: JSON.stringify({
            kelasKuliahId: kelasId,
            komponenList: [
              { nama: 'UTS', bobot: 50 },
              { nama: 'UAS', bobot: 50 },
            ],
          }),
        }),
      );
      const comps1 = await compRes1.json();

      await app.handle(
        new Request('http://localhost/yudisium/kelas/nilai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${dosenToken}`,
          },
          body: JSON.stringify({
            kelasKuliahId: kelasId,
            nilaiList: [
              {
                krsId: krsId,
                nilaiKomponenList: [
                  { komponenNilaiId: comps1[0].id, nilai: 80 },
                  { komponenNilaiId: comps1[1].id, nilai: 90 },
                ],
              },
            ],
          }),
        }),
      );

      const [krsBefore] = await db.select().from(krs).where(eq(krs.id, krsId));
      expect(krsBefore.nilaiAngka).not.toBeNull();

      await app.handle(
        new Request('http://localhost/yudisium/kelas/komponen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${dosenToken}`,
          },
          body: JSON.stringify({
            kelasKuliahId: kelasId,
            komponenList: [
              { nama: 'Tugas', bobot: 20 },
              { nama: 'UTS', bobot: 30 },
              { nama: 'UAS', bobot: 50 },
            ],
          }),
        }),
      );

      const [krsAfter] = await db.select().from(krs).where(eq(krs.id, krsId));
      expect(krsAfter.nilaiAngka).toBeNull();
      expect(krsAfter.nilaiHuruf).toBeNull();
      expect(krsAfter.nilaiIndeks).toBeNull();
    });
  });

  describe('Yudisium Wisuda Process', () => {
    it('mahasiswa harus sukses mengajukan yudisium', async () => {
      const response = await app.handle(
        new Request(`http://localhost/yudisium/mahasiswa/${mhsId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({
            judulTa: 'Rancang Bangun Aplikasi SIMAK Vokasi',
            skorToefl: 480,
            bebasPerpustakaan: true,
            bebasLab: true,
            buktiPembayaranWisuda: true,
          }),
        }),
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.judulTa).toBe('Rancang Bangun Aplikasi SIMAK Vokasi');
      expect(data.status).toBe('diajukan');
    });

    it('kaprodi/admin sukses memverifikasi dan menyetujui yudisium, merubah status mahasiswa ke LULUS', async () => {
      // 1. Submit first
      await app.handle(
        new Request(`http://localhost/yudisium/mahasiswa/${mhsId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({
            judulTa: 'Judul Wisuda',
            skorToefl: 500,
            bebasPerpustakaan: true,
            bebasLab: true,
            buktiPembayaranWisuda: true,
          }),
        }),
      );

      // 2. Admin Approve
      const response = await app.handle(
        new Request(`http://localhost/yudisium/mahasiswa/${mhsId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            status: 'disetujui',
            catatan: 'Selamat atas kelulusannya.',
          }),
        }),
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('disetujui');

      // Verify student status is updated to 'lulus'
      const [updatedMhs] = await db.select().from(mahasiswa).where(eq(mahasiswa.id, mhsId));
      expect(updatedMhs.status).toBe('lulus');
    });

    it('membatalkan/menolak yudisium yang sudah disetujui harus mengembalikan status mahasiswa ke aktif', async () => {
      // 1. Submit & Approve yudisium (mahasiswa jadi lulus)
      await db.insert(mahasiswa).values({
        id: 999,
        nim: '20200009',
        nama: 'Mahasiswa Yudisium',
        email: 'mhs-yud@test.com',
        programStudiId: prodiId,
        status: 'aktif',
        namaIbuKandung: 'Ibu Test',
        nik: '1234567890123459',
        jenisKelamin: 'L',
        tanggalLahir: '2000-01-01',
      });

      const tokenMhs2 = await getAuthToken('mhs-yud@test.com', 'mahasiswa');

      await app.handle(
        new Request('http://localhost/yudisium/mahasiswa/999', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenMhs2}`,
          },
          body: JSON.stringify({
            judulTa: 'Judul Wisuda',
            skorToefl: 500,
            bebasPerpustakaan: true,
            bebasLab: true,
            buktiPembayaranWisuda: true,
          }),
        }),
      );

      await app.handle(
        new Request('http://localhost/yudisium/mahasiswa/999/status', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            status: 'disetujui',
          }),
        }),
      );

      const [mhsLulus] = await db.select().from(mahasiswa).where(eq(mahasiswa.id, 999));
      expect(mhsLulus.status).toBe('lulus');

      // 2. Batalkan / Ubah status yudisium menjadi ditolak
      await app.handle(
        new Request('http://localhost/yudisium/mahasiswa/999/status', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            status: 'ditolak',
            catatan: 'Dokumen palsu atau tidak lengkap.',
          }),
        }),
      );

      const [mhsReverted] = await db.select().from(mahasiswa).where(eq(mahasiswa.id, 999));
      expect(mhsReverted.status).toBe('aktif');
    });
  });
});
