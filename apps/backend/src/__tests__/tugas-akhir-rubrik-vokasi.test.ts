import { beforeAll, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import {
  dosen,
  mahasiswa,
  periodeAkademik,
  programStudi,
  tugasAkhir,
  tugasAkhirAnggota,
  tugasAkhirPembimbing,
  tugasAkhirPenguji,
  tugasAkhirRubrikKriteria,
  tugasAkhirSidang,
  users,
} from '../models/schema';
import { TugasAkhirSidangService } from '../services/tugas-akhir-sidang.service';
import { db } from '../utils/db';
import { getAuthToken } from './test-helper';

describe('Tugas Akhir - Rubrik Nilai Vokasi Skala 0-10 & Standar BPA', () => {
  let dosenPengujiToken: string;
  let prodiToken: string;

  let taId: number;
  let sidangId: number;
  let mhs1Id: number;
  let mhs2Id: number;
  let dosenPengujiId: number;
  let prodiId: number;

  beforeAll(async () => {
    // 1. Periode & Prodi
    const periodeId = '20261';
    await db
      .insert(periodeAkademik)
      .values({ id: periodeId, nama: '2026/2027 Ganjil', aktif: true })
      .onConflictDoNothing();

    const [pRow] = await db
      .insert(programStudi)
      .values({ kode: 'TMI-MUTU', nama: 'Teknik Mekatronika Industri Mutu', jenjang: 'D3' })
      .onConflictDoNothing()
      .returning();
    prodiId = pRow ? pRow.id : (await db.query.programStudi.findFirst())!.id;

    // 2. Auth tokens
    await getAuthToken('mhs-rubrik1@test.com', 'mahasiswa');
    dosenPengujiToken = await getAuthToken('dosen-rubrik@test.com', 'dosen');
    prodiToken = await getAuthToken('prodi-rubrik@test.com', 'prodi');

    // 3. Dosen Penguji
    const [dRow] = await db
      .insert(dosen)
      .values({
        nip: '198501012026888',
        nama: 'Dosen Tim Penguji Rubrik',
        email: 'dosen-rubrik@test.com',
        status: 'aktif',
      })
      .onConflictDoNothing()
      .returning();
    dosenPengujiId = dRow
      ? dRow.id
      : (await db.select({ id: dosen.id }).from(dosen).where(eq(dosen.email, 'dosen-rubrik@test.com')).limit(1))[0].id;

    // 4. Mahasiswa Anggota Tim (Kelompok)
    const [m1] = await db
      .insert(mahasiswa)
      .values({
        nim: '2026881',
        nama: 'Mahasiswa Kelompok 1',
        email: 'mhs-rubrik1@test.com',
        programStudiId: prodiId,
        angkatan: '2026',
        status: 'aktif',
        jenisKelamin: 'L',
      })
      .onConflictDoNothing()
      .returning();
    mhs1Id = m1
      ? m1.id
      : (
          await db
            .select({ id: mahasiswa.id })
            .from(mahasiswa)
            .where(eq(mahasiswa.email, 'mhs-rubrik1@test.com'))
            .limit(1)
        )[0].id;

    const [m2] = await db
      .insert(mahasiswa)
      .values({
        nim: '2026882',
        nama: 'Mahasiswa Kelompok 2',
        email: 'mhs-rubrik2@test.com',
        programStudiId: prodiId,
        angkatan: '2026',
        status: 'aktif',
        jenisKelamin: 'P',
      })
      .onConflictDoNothing()
      .returning();
    mhs2Id = m2
      ? m2.id
      : (
          await db
            .select({ id: mahasiswa.id })
            .from(mahasiswa)
            .where(eq(mahasiswa.email, 'mhs-rubrik2@test.com'))
            .limit(1)
        )[0].id;

    // 5. Tugas Akhir
    const [uMhs] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, 'mhs-rubrik1@test.com'))
      .limit(1);

    const [taRow] = await db
      .insert(tugasAkhir)
      .values({
        kodeTa: `TA-VOKASI-MUTU-${Date.now()}`,
        tipe: 'kelompok',
        jenisKarya: 'prototipe',
        judul: 'Rancang Bangun Mesin Pemilah Otomatis Berbasis Vokasi',
        programStudiId: prodiId,
        periodeId,
        status: 'sidang_dijadwalkan',
        createdById: uMhs.id,
      })
      .returning();
    taId = taRow.id;

    await db.insert(tugasAkhirAnggota).values([
      { tugasAkhirId: taId, mahasiswaId: mhs1Id, peran: 'ketua', statusKonfirmasi: 'diterima' },
      { tugasAkhirId: taId, mahasiswaId: mhs2Id, peran: 'anggota', statusKonfirmasi: 'diterima' },
    ]);

    // 6. Sidang Akhir
    const [sidangRow] = await db
      .insert(tugasAkhirSidang)
      .values({
        tugasAkhirId: taId,
        jenisSidang: 'akhir',
        periodeId,
        status: 'dijadwalkan',
        tanggalSidang: '2026-10-25',
        jamMulai: '09:00',
        jamSelesai: '11:00',
        ruangan: 'Lab Mekatronika 1',
      })
      .returning();
    sidangId = sidangRow.id;

    await db.insert(tugasAkhirPenguji).values({
      sidangId,
      dosenId: dosenPengujiId,
      peranPenguji: 'penguji_1',
      kehadiran: true,
    });
  });

  describe('1. Konversi Nilai Mutu BPA (Skala 0 - 10)', () => {
    it('mengonversi nilai 8.5 - 10.0 menjadi A (4.00)', () => {
      expect(TugasAkhirSidangService.konversiNilaiBpa(8.5).huruf).toBe('A');
      expect(TugasAkhirSidangService.konversiNilaiBpa(8.5).indeks).toBe(4.0);
      expect(TugasAkhirSidangService.konversiNilaiBpa(9.2).huruf).toBe('A');
      expect(TugasAkhirSidangService.konversiNilaiBpa(10.0).huruf).toBe('A');
    });

    it('mengonversi nilai 8.0 - 8.4 menjadi A- (3.70)', () => {
      expect(TugasAkhirSidangService.konversiNilaiBpa(8.4).huruf).toBe('A-');
      expect(TugasAkhirSidangService.konversiNilaiBpa(8.0).huruf).toBe('A-');
      expect(TugasAkhirSidangService.konversiNilaiBpa(8.0).indeks).toBe(3.7);
    });

    it('mengonversi nilai 7.5 - 7.9 menjadi B+ (3.30)', () => {
      expect(TugasAkhirSidangService.konversiNilaiBpa(7.9).huruf).toBe('B+');
      expect(TugasAkhirSidangService.konversiNilaiBpa(7.5).huruf).toBe('B+');
      expect(TugasAkhirSidangService.konversiNilaiBpa(7.5).indeks).toBe(3.3);
    });

    it('mengonversi nilai 7.0 - 7.4 menjadi B (3.00)', () => {
      expect(TugasAkhirSidangService.konversiNilaiBpa(7.4).huruf).toBe('B');
      expect(TugasAkhirSidangService.konversiNilaiBpa(7.0).huruf).toBe('B');
    });

    it('mengonversi nilai 6.3 - 6.9 menjadi B- (2.70)', () => {
      expect(TugasAkhirSidangService.konversiNilaiBpa(6.9).huruf).toBe('B-');
      expect(TugasAkhirSidangService.konversiNilaiBpa(6.3).huruf).toBe('B-');
    });

    it('mengonversi nilai 5.7 - 6.2 menjadi C+ (2.30)', () => {
      expect(TugasAkhirSidangService.konversiNilaiBpa(6.2).huruf).toBe('C+');
      expect(TugasAkhirSidangService.konversiNilaiBpa(5.7).huruf).toBe('C+');
    });

    it('mengonversi nilai 5.1 - 5.6 menjadi C (2.00)', () => {
      expect(TugasAkhirSidangService.konversiNilaiBpa(5.6).huruf).toBe('C');
      expect(TugasAkhirSidangService.konversiNilaiBpa(5.1).huruf).toBe('C');
    });

    it('mengonversi nilai 4.6 - 5.0 menjadi D+ (1.50)', () => {
      expect(TugasAkhirSidangService.konversiNilaiBpa(5.0).huruf).toBe('D+');
      expect(TugasAkhirSidangService.konversiNilaiBpa(4.6).huruf).toBe('D+');
    });

    it('mengonversi nilai 4.0 - 4.5 menjadi D (1.00)', () => {
      expect(TugasAkhirSidangService.konversiNilaiBpa(4.5).huruf).toBe('D');
      expect(TugasAkhirSidangService.konversiNilaiBpa(4.0).huruf).toBe('D');
    });

    it('mengonversi nilai < 4.0 menjadi E (0.00)', () => {
      expect(TugasAkhirSidangService.konversiNilaiBpa(3.9).huruf).toBe('E');
      expect(TugasAkhirSidangService.konversiNilaiBpa(0).huruf).toBe('E');
      expect(TugasAkhirSidangService.konversiNilaiBpa(0).indeks).toBe(0.0);
    });
  });

  describe('2. Endpoint Rubrik Kriteria & Pengelompokan Kategori Vokasi', () => {
    it('mengembalikan daftar kriteria default dengan kategori pembimbingan, alat_mesin, laporan', async () => {
      const res = await app.handle(
        new Request(`http://localhost/tugas-akhir/${taId}/sidang/rubrik?jenis=akhir`, {
          headers: { Authorization: `Bearer ${dosenPengujiToken}` },
        }),
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(Array.isArray(json.data)).toBe(true);

      const items = json.data as { kategori: string; kode: string; bobot: number }[];
      const katA = items.filter((i) => i.kategori === 'pembimbingan');
      const katB = items.filter((i) => i.kategori === 'alat_mesin');
      const katC = items.filter((i) => i.kategori === 'laporan');

      expect(katA.length).toBe(5);
      expect(katB.length).toBe(3);
      expect(katC.length).toBe(10);
    });
  });

  describe('3. Input Nilai Penguji Skala 0 - 10 & Validasi Range', () => {
    it('menolak input nilai jika melebihi rentang 10 (misal 85 pada skala 0-10)', async () => {
      const res = await app.handle(
        new Request(`http://localhost/tugas-akhir/${taId}/sidang/${sidangId}/nilai`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${dosenPengujiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nilaiList: [{ kriteriaId: 201, mahasiswaId: mhs1Id, nilai: 85 }],
          }),
        }),
      );
      expect(res.status).toBe(422); // Validation error karena maximum: 10
    });

    it('berhasil menyimpan nilai penguji dalam skala 0 - 10 dan menghitung rata-rata berbobot', async () => {
      const res = await app.handle(
        new Request(`http://localhost/tugas-akhir/${taId}/sidang/${sidangId}/nilai`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${dosenPengujiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nilaiList: [
              // Kategori A (Nilai 8.0)
              { kriteriaId: 201, mahasiswaId: mhs1Id, nilai: 8.0 },
              { kriteriaId: 202, mahasiswaId: mhs1Id, nilai: 8.0 },
              { kriteriaId: 203, mahasiswaId: mhs1Id, nilai: 8.0 },
              { kriteriaId: 204, mahasiswaId: mhs1Id, nilai: 8.0 },
              { kriteriaId: 205, mahasiswaId: mhs1Id, nilai: 8.0 },
              // Kategori B (Nilai 8.5)
              { kriteriaId: 206, mahasiswaId: mhs1Id, nilai: 8.5 },
              { kriteriaId: 207, mahasiswaId: mhs1Id, nilai: 8.5 },
              { kriteriaId: 208, mahasiswaId: mhs1Id, nilai: 8.5 },
              // Kategori C (Nilai 8.0)
              { kriteriaId: 209, mahasiswaId: mhs1Id, nilai: 8.0 },
            ],
            catatanRevisi: 'Penyempurnaan kalkulasi daya motor pada Bab 4',
          }),
        }),
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.nilaiTotal).toBeDefined();
      expect(Number(json.nilaiTotal)).toBeGreaterThanOrEqual(8.0);
      expect(Number(json.nilaiTotal)).toBeLessThanOrEqual(8.5);
      expect(json.hurufMutu).toBeDefined();
    });
  });

  describe('4. Finalisasi Hasil Sidang dengan Konversi Mutu BPA', () => {
    it('memfinalisasi sidang dan menetapkan huruf mutu BPA yang tepat', async () => {
      const res = await app.handle(
        new Request(`http://localhost/tugas-akhir/${taId}/sidang/${sidangId}/finalisasi`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${prodiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            statusHasil: 'lulus_dengan_revisi',
            batasWaktuRevisi: '2026-11-05',
            catatanSidang: 'Lulus dengan revisi minor pada naskah bab 4',
          }),
        }),
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.nilaiAkhirHuruf).toBeDefined();
      expect(['A', 'A-', 'B+', 'B']).toContain(json.data.nilaiAkhirHuruf);
    });
  });
});
