import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import {
  dosen,
  dosenPengajarKelas,
  kelasKuliah,
  mahasiswa,
  mataKuliah,
  periodeAkademik,
  programStudi,
  rps,
  rpsTopik,
} from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('BAP, Presensi & Kompensasi API', () => {
  let adminToken: string;
  let dosenToken: string;
  let mhsToken: string;

  let prodiId: number;
  let dosenId: number;
  let mhsId: number;
  let matkulId: number;
  let kelasId: number;
  const periodeId = '20231';

  beforeEach(async () => {
    await clearDatabase();

    adminToken = await getAuthToken('admin@test.com', 'admin');
    dosenToken = await getAuthToken('dosen@test.com', 'dosen');
    mhsToken = await getAuthToken('mhs@test.com', 'mahasiswa');

    // Seed master data
    const [prodi] = await db
      .insert(programStudi)
      .values({
        kode: 'TI',
        nama: 'Teknik Informatika',
        jenjang: 'D4',
      })
      .returning();
    prodiId = prodi.id;

    const [dsn] = await db
      .insert(dosen)
      .values({
        nip: '199001012020011001',
        nama: 'Dosen Test',
        email: 'dosen@test.com',
        programStudiId: prodiId,
      })
      .returning();
    dosenId = dsn.id;

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

    await db.insert(periodeAkademik).values({
      id: periodeId,
      nama: 'Ganjil 2023/2024',
      aktif: true,
    });

    const [matkul] = await db
      .insert(mataKuliah)
      .values({
        kode: 'MK001',
        nama: 'Pemrograman Web',
        sksTotal: 3,
        programStudiId: prodiId,
      })
      .returning();
    matkulId = matkul.id;

    const [kelas] = await db
      .insert(kelasKuliah)
      .values({
        mataKuliahId: matkulId,
        periodeId: periodeId,
        namaKelas: 'A',
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
  });

  describe('CPMK API', () => {
    it('harus sukses menambah CPMK dan mengambil CPMK per mata kuliah', async () => {
      const response = await app.handle(
        new Request('http://localhost/cpmk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mataKuliahId: matkulId,
            kode: 'CPMK-1',
            deskripsi: 'Mampu membangun web interaktif',
          }),
        }),
      );
      expect(response.status).toBe(201);
      const cpmkObj = await response.json();
      expect(cpmkObj.id).toBeDefined();

      const getRes = await app.handle(
        new Request(`http://localhost/cpmk/mata-kuliah/${matkulId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${dosenToken}`,
          },
        }),
      );
      expect(getRes.status).toBe(200);
      const list = await getRes.json();
      expect(list.length).toBe(1);
      expect(list[0].kode).toBe('CPMK-1');
    });
  });

  describe('BAP & Presensi & Kompensasi Flow', () => {
    let cpmkId: number;

    beforeEach(async () => {
      // Setup a CPMK first
      const response = await app.handle(
        new Request('http://localhost/cpmk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mataKuliahId: matkulId,
            kode: 'CPMK-1',
            deskripsi: 'Mampu membangun web interaktif',
          }),
        }),
      );
      const cpmkObj = await response.json();
      cpmkId = cpmkObj.id;
    });

    it('harus sukses mencatat BAP, presensi, dan menghitung kompensasi dengan multiplier yang benar', async () => {
      // 1. Dosen membuat BAP (durasi kelas 100 menit)
      const bapRes = await app.handle(
        new Request('http://localhost/bap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${dosenToken}`,
          },
          body: JSON.stringify({
            kelasKuliahId: kelasId,
            tanggal: '2023-09-01',
            pertemuanKe: 1,
            materi: 'Dasar HTML & CSS',
            durasiMenit: 100,
            cpmkId: cpmkId,
            dosenId: dosenId,
          }),
        }),
      );
      expect(bapRes.status).toBe(201);
      const bapObj = await bapRes.json();
      const bapId = bapObj.id;

      // 2. Dosen menyimpan presensi mahasiswa: status 'telat' (durasiMangkir = 20 menit)
      const presRes1 = await app.handle(
        new Request('http://localhost/presensi/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${dosenToken}`,
          },
          body: JSON.stringify({
            bapId: bapId,
            presensiList: [
              {
                mahasiswaId: mhsId,
                status: 'telat',
                durasiMangkir: 20,
              },
            ],
          }),
        }),
      );
      expect(presRes1.status).toBe(200);

      // Verifikasi kompensasi detail mahasiswa (telat 20 menit * 5 = 100 menit)
      let mhsCompRes = await app.handle(
        new Request(`http://localhost/presensi/kompensasi/mahasiswa/${mhsId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mhsToken}`,
          },
        }),
      );
      expect(mhsCompRes.status).toBe(200);
      let compDetail = await mhsCompRes.json();
      expect(compDetail.summary.totalKompensasi).toBe(100); // 20 * 5
      expect(compDetail.summary.sisaKompensasi).toBe(100);

      // 3. Admin mengubah presensi mahasiswa: status 'alpa' (durasiMangkir = class duration = 100 menit)
      const presRes2 = await app.handle(
        new Request('http://localhost/presensi/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            bapId: bapId,
            presensiList: [
              {
                mahasiswaId: mhsId,
                status: 'alpa',
              },
            ],
          }),
        }),
      );
      expect(presRes2.status).toBe(200);

      // Verifikasi kompensasi detail mahasiswa (alpa 100 menit * 5 = 500 menit)
      mhsCompRes = await app.handle(
        new Request(`http://localhost/presensi/kompensasi/mahasiswa/${mhsId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mhsToken}`,
          },
        }),
      );
      compDetail = await mhsCompRes.json();
      expect(compDetail.summary.totalKompensasi).toBe(500); // 100 * 5
      expect(compDetail.summary.sisaKompensasi).toBe(500);

      // 4. Admin mengubah presensi mahasiswa: status 'sakit' (durasiMangkir = class duration = 100 menit, multiplier = 1x)
      const presRes3 = await app.handle(
        new Request('http://localhost/presensi/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            bapId: bapId,
            presensiList: [
              {
                mahasiswaId: mhsId,
                status: 'sakit',
              },
            ],
          }),
        }),
      );
      expect(presRes3.status).toBe(200);

      // Verifikasi kompensasi detail mahasiswa (sakit 100 menit * 1 = 100 menit)
      mhsCompRes = await app.handle(
        new Request(`http://localhost/presensi/kompensasi/mahasiswa/${mhsId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mhsToken}`,
          },
        }),
      );
      compDetail = await mhsCompRes.json();
      expect(compDetail.summary.totalKompensasi).toBe(100); // 100 * 1
      expect(compDetail.summary.sisaKompensasi).toBe(100);

      // 5. Admin menginput pembayaran kompensasi sebesar 60 menit
      const payRes = await app.handle(
        new Request('http://localhost/presensi/kompensasi/bayar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mahasiswaId: mhsId,
            jumlahMenit: 60,
            tanggal: '2023-09-02',
            keterangan: 'Menyapu lab jaringan',
          }),
        }),
      );
      expect(payRes.status).toBe(201);

      // Verifikasi sisa kompensasi (100 - 60 = 40 menit)
      mhsCompRes = await app.handle(
        new Request(`http://localhost/presensi/kompensasi/mahasiswa/${mhsId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mhsToken}`,
          },
        }),
      );
      compDetail = await mhsCompRes.json();
      expect(compDetail.summary.totalKompensasi).toBe(100);
      expect(compDetail.summary.totalDibayar).toBe(60);
      expect(compDetail.summary.sisaKompensasi).toBe(40);

      // Verifikasi laporan kompensasi di sisi admin
      const reportRes = await app.handle(
        new Request('http://localhost/presensi/kompensasi/laporan', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }),
      );
      expect(reportRes.status).toBe(200);
      const reportResponse = await reportRes.json();
      const reportList = (reportResponse as Record<string, unknown>).data as Record<string, unknown>[];
      const mhsReport = reportList.find((r: Record<string, unknown>) => r.id === mhsId);
      expect(mhsReport).toBeDefined();
      expect(mhsReport.sisaKompensasi).toBe(40);

      // 6. Admin mengedit pembayaran kompensasi dari 60 menit menjadi 80 menit
      const payData = await payRes.json();
      const payId = payData.id;
      const editPayRes = await app.handle(
        new Request(`http://localhost/presensi/kompensasi/bayar/${payId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            jumlahMenit: 80,
            keterangan: 'Revisi kerja bakti perpustakaan',
          }),
        }),
      );
      expect(editPayRes.status).toBe(200);

      // Verifikasi sisa kompensasi terupdate (100 - 80 = 20 menit)
      const updatedMhsCompRes = await app.handle(
        new Request(`http://localhost/presensi/kompensasi/mahasiswa/${mhsId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mhsToken}`,
          },
        }),
      );
      const updatedCompDetail = await updatedMhsCompRes.json();
      expect(updatedCompDetail.summary.totalDibayar).toBe(80);
      expect(updatedCompDetail.summary.sisaKompensasi).toBe(20);
    });

    it('harus sukses menyimpan dan mengambil catatan BAP serta keterangan presensi mahasiswa', async () => {
      // 1. Buat BAP dengan catatan
      const bapRes = await app.handle(
        new Request('http://localhost/bap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${dosenToken}`,
          },
          body: JSON.stringify({
            kelasKuliahId: kelasId,
            tanggal: '2023-09-02',
            pertemuanKe: 2,
            materi: 'Lanjutan CSS Grid & Flexbox',
            catatan: 'Kuis singkat diadakan di 15 menit pertama',
            durasiMenit: 100,
            cpmkId: cpmkId,
            dosenId: dosenId,
          }),
        }),
      );
      expect(bapRes.status).toBe(201);
      const bapObj = await bapRes.json();
      expect(bapObj.catatan).toBe('Kuis singkat diadakan di 15 menit pertama');

      // 2. Simpan presensi dengan keterangan per mahasiswa
      const presRes = await app.handle(
        new Request('http://localhost/presensi/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            bapId: bapObj.id,
            presensiList: [
              {
                mahasiswaId: mhsId,
                status: 'izin',
                keterangan: 'Izin dispensasi mengikuti kejuaraan sains',
              },
            ],
          }),
        }),
      );
      expect(presRes.status).toBe(200);

      // 3. Ambil presensi berdasarkan ID BAP dan verifikasi keterangan
      const getPresRes = await app.handle(
        new Request(`http://localhost/presensi/bap/${bapObj.id}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${dosenToken}`,
          },
        }),
      );
      expect(getPresRes.status).toBe(200);
      const presList = await getPresRes.json();
      expect(presList.length).toBe(1);
      expect(presList[0].keterangan).toBe('Izin dispensasi mengikuti kejuaraan sains');
    });

    it('harus sukses menambah BAP dengan multi-topik RPS dari form tanpa CPMK khusus (seperti di screenshot)', async () => {
      // 1. Buat RPS dan Topik RPS
      const [rpsEntry] = await db
        .insert(rps)
        .values({
          mataKuliahId: matkulId,
          periodeId: periodeId,
          revisiKe: 1,
          pengembang: 'Dosen Test',
        })
        .returning();

      const [topik1] = await db
        .insert(rpsTopik)
        .values({
          rpsId: rpsEntry.id,
          pertemuanKe: 1,
          topik: 'topik 1',
        })
        .returning();

      const [topik2] = await db
        .insert(rpsTopik)
        .values({
          rpsId: rpsEntry.id,
          pertemuanKe: 2,
          topik: 'topik 1',
          subTopik: 'sub topik 2',
        })
        .returning();

      const [topik3] = await db
        .insert(rpsTopik)
        .values({
          rpsId: rpsEntry.id,
          pertemuanKe: 3,
          topik: 'topik 2',
        })
        .returning();

      // 2. Submit BAP dengan topik1 dan topik3 tercentang
      const bapRes = await app.handle(
        new Request('http://localhost/bap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${dosenToken}`,
          },
          body: JSON.stringify({
            kelasKuliahId: kelasId,
            tanggal: '2026-04-08',
            pertemuanKe: 1,
            materi: 'P1: topik 1, P3: topik 2',
            durasiMenit: 100,
            topikIds: [topik1.id, topik3.id],
            dosenId: dosenId,
          }),
        }),
      );

      const resJson = await bapRes.json();
      expect(bapRes.status).toBe(201);
      expect(resJson.id).toBeDefined();
      expect(resJson.topikIds).toEqual([topik1.id, topik3.id]);

      // 3. Test menyimpan presensi mahasiswa dengan status 'unknown'
      const presUnknownRes = await app.handle(
        new Request('http://localhost/presensi/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${dosenToken}`,
          },
          body: JSON.stringify({
            bapId: resJson.id,
            presensiList: [
              {
                mahasiswaId: mhsId,
                status: 'unknown',
                keterangan: 'Mahasiswa tidak hadir tanpa keterangan',
              },
            ],
          }),
        }),
      );
      expect(presUnknownRes.status).toBe(200);

      // Verifikasi data presensi 'unknown' tersimpan di DB
      const getUnknownRes = await app.handle(
        new Request(`http://localhost/presensi/bap/${resJson.id}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${dosenToken}`,
          },
        }),
      );
      expect(getUnknownRes.status).toBe(200);
      const listUnknown = await getUnknownRes.json();
      expect(listUnknown.length).toBe(1);
      expect(listUnknown[0].status).toBe('unknown');
    });

    it('getPresensiByBap mengembalikan daftar presensi terurut berdasarkan NIM (asc)', async () => {
      const { PresensiService } = await import('../services/presensi.service');
      const { krs } = await import('../models/schema');

      // Seed 2 mahasiswa tambahan dengan NIM acak
      const [mhsB] = await db
        .insert(mahasiswa)
        .values({
          nim: '202309002',
          nama: 'Budi Santoso',
          email: 'budi@test.com',
          programStudiId: prodiId,
          jenisKelamin: 'L',
        })
        .returning();

      const [mhsA] = await db
        .insert(mahasiswa)
        .values({
          nim: '202309001',
          nama: 'Andi Wijaya',
          email: 'andi@test.com',
          programStudiId: prodiId,
          jenisKelamin: 'L',
        })
        .returning();

      // Seed BAP
      const bapRes = await app.handle(
        new Request('http://localhost/bap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosenToken}` },
          body: JSON.stringify({ kelasKuliahId: kelasId, pertemuanKe: 2, tanggal: '2026-09-01', materi: 'Materi 2' }),
        }),
      );
      const bapData = await bapRes.json();

      // Save presensi untuk mhsB lalu mhsA (sengaja urutan insert dibalik)
      await app.handle(
        new Request('http://localhost/presensi/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosenToken}` },
          body: JSON.stringify({
            bapId: bapData.id,
            presensiList: [
              { mahasiswaId: mhsB.id, status: 'hadir', durasiMangkir: 0 },
              { mahasiswaId: mhsA.id, status: 'hadir', durasiMangkir: 0 },
            ],
          }),
        }),
      );

      const rows = await PresensiService.getPresensiByBap(bapData.id);
      expect(rows.length).toBe(2);
      expect(rows[0].mahasiswaNim).toBe('202309001');
      expect(rows[1].mahasiswaNim).toBe('202309002');
    });
  });
});
