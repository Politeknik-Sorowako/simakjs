import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { dosen, mahasiswa, periodeAkademik, programStudi } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Bimbingan & Pelanggaran API', () => {
  let adminToken: string;
  let dosenToken: string;
  let dosen2Token: string;
  let mhsToken: string;
  let mhs2Token: string;

  let prodiId: number;
  let dosenId: number;
  let dosen2Id: number;
  let mhsId: number;
  let mhs2Id: number;
  const periodeId = '20231';

  beforeEach(async () => {
    await clearDatabase();

    // Register users & get tokens
    adminToken = await getAuthToken('admin@test.com', 'admin');
    dosenToken = await getAuthToken('dosen@test.com', 'dosen');
    dosen2Token = await getAuthToken('dosen2@test.com', 'dosen');
    mhsToken = await getAuthToken('mhs@test.com', 'mahasiswa');
    mhs2Token = await getAuthToken('mhs2@test.com', 'mahasiswa');

    // Seed Prodi
    const uniqueKode = `TI_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const [prodi] = await db
      .insert(programStudi)
      .values({
        kode: uniqueKode,
        nama: 'Teknik Informatika',
        jenjang: 'D4',
      })
      .returning();
    prodiId = prodi.id;

    // Seed Dosens
    const [dsn] = await db
      .insert(dosen)
      .values({
        nip: '199001012020011001',
        nama: 'Dosen Wali 1',
        email: 'dosen@test.com',
        programStudiId: prodiId,
      })
      .returning();
    dosenId = dsn.id;

    const [dsn2] = await db
      .insert(dosen)
      .values({
        nip: '199001012020011002',
        nama: 'Dosen Wali 2',
        email: 'dosen2@test.com',
        programStudiId: prodiId,
      })
      .returning();
    dosen2Id = dsn2.id;

    // Seed Mahasiswas (linking to Dosen PA)
    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20200001',
        nama: 'Mahasiswa Bimbingan 1',
        email: 'mhs@test.com',
        programStudiId: prodiId,
        dosenPaId: dosenId,
        status: 'aktif',
        namaIbuKandung: 'Ibu Test',
        nik: '1234567890123456',
        jenisKelamin: 'L',
        tanggalLahir: '2000-01-01',
      })
      .returning();
    mhsId = mhs.id;

    const [mhs2] = await db
      .insert(mahasiswa)
      .values({
        nim: '20200002',
        nama: 'Mahasiswa Bimbingan 2',
        email: 'mhs2@test.com',
        programStudiId: prodiId,
        dosenPaId: dosen2Id,
        status: 'aktif',
        namaIbuKandung: 'Ibu Test 2',
        nik: '1234567890123457',
        jenisKelamin: 'P',
        tanggalLahir: '2000-02-02',
      })
      .returning();
    mhs2Id = mhs2.id;

    // Seed active periode
    await db.insert(periodeAkademik).values({
      id: periodeId,
      nama: 'Ganjil 2023/2024',
      aktif: true,
    });
  });

  describe('Bimbingan API', () => {
    it('mahasiswa harus sukses mengambil/membuat bimbingan miliknya sendiri', async () => {
      const response = await app.handle(
        new Request(`http://localhost/bimbingan/mahasiswa/${mhsId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mhsToken}`,
          },
        }),
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.mahasiswaId).toBe(mhsId);
      expect(data.isApproved).toBe(false);
      expect(data.thread).toBeArray();
    });

    it('mahasiswa tidak boleh mengambil bimbingan mahasiswa lain', async () => {
      const response = await app.handle(
        new Request(`http://localhost/bimbingan/mahasiswa/${mhs2Id}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mhsToken}`,
          },
        }),
      );
      expect(response.status).toBe(403);
    });

    it('mahasiswa harus sukses mengirim pesan bimbingan', async () => {
      const response = await app.handle(
        new Request(`http://localhost/bimbingan/mahasiswa/${mhsId}/thread`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({ pesan: 'Halo pak PA' }),
        }),
      );
      expect(response.status).toBe(201);
      const msg = await response.json();
      expect(msg.pesan).toBe('Halo pak PA');
      expect(msg.senderRole).toBe('mahasiswa');
    });

    it('dosen PA harus sukses membalas pesan bimbingan mahasiswa binaannya', async () => {
      const response = await app.handle(
        new Request(`http://localhost/bimbingan/mahasiswa/${mhsId}/thread`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${dosenToken}`,
          },
          body: JSON.stringify({ pesan: 'Silakan ajukan KRS Anda.' }),
        }),
      );
      expect(response.status).toBe(201);
      const msg = await response.json();
      expect(msg.pesan).toBe('Silakan ajukan KRS Anda.');
      expect(msg.senderRole).toBe('dosen');
    });

    it('dosen lain yang bukan PA tidak boleh membalas pesan bimbingan', async () => {
      const response = await app.handle(
        new Request(`http://localhost/bimbingan/mahasiswa/${mhsId}/thread`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${dosen2Token}`,
          },
          body: JSON.stringify({ pesan: 'Mencoba mengganggu bimbingan orang lain.' }),
        }),
      );
      expect(response.status).toBe(403);
    });

    it('dosen PA harus sukses mengupdate ringkasan & memberikan persetujuan kelayakan ujian', async () => {
      const response = await app.handle(
        new Request(`http://localhost/bimbingan/mahasiswa/${mhsId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${dosenToken}`,
          },
          body: JSON.stringify({
            ringkasan: 'Mahasiswa sudah berkonsultasi mengenai kelayakan ujian.',
            isApproved: true,
          }),
        }),
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.isApproved).toBe(true);
      expect(data.ringkasan).toBe('Mahasiswa sudah berkonsultasi mengenai kelayakan ujian.');
    });

    it('mahasiswa dilarang mengupdate status kelayakan bimbingannya sendiri', async () => {
      const response = await app.handle(
        new Request(`http://localhost/bimbingan/mahasiswa/${mhsId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({
            ringkasan: 'Mencoba menyetujui sendiri.',
            isApproved: true,
          }),
        }),
      );
      expect(response.status).toBe(403);
    });

    it('dosen PA harus sukses mencatat riwayat bimbingan BKD (permasalahan, solusi, tanggal, status BKD)', async () => {
      const response = await app.handle(
        new Request(`http://localhost/bimbingan/mahasiswa/${mhsId}/sesi`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${dosenToken}`,
          },
          body: JSON.stringify({
            pertemuanKe: 1,
            permasalahan: 'Kesulitan memahami materi Pemrograman Web.',
            solusi: 'Disarankan mengikuti bimbingan tambahan dengan asisten lab.',
            tanggalBimbingan: '2023-10-10',
            statusBkd: true,
          }),
        }),
      );
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.permasalahan).toBe('Kesulitan memahami materi Pemrograman Web.');
      expect(data.solusi).toBe('Disarankan mengikuti bimbingan tambahan dengan asisten lab.');
      expect(data.statusBkd).toBe(true);

      // Verify the BKD report endpoint returns this record
      const rekapRes = await app.handle(
        new Request(`http://localhost/bimbingan/rekap-bkd?periodeId=${periodeId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${dosenToken}`,
          },
        }),
      );
      expect(rekapRes.status).toBe(200);
      const rekapBody = await rekapRes.json();
      expect(rekapBody.data.length).toBe(1);
      expect(rekapBody.data[0].mahasiswa.nim).toBe('20200001');
      expect(rekapBody.data[0].statusBkd).toBe(true);
    });
  });

  describe('Pelanggaran/Kedisiplinan API', () => {
    it('admin harus sukses mencatat pelanggaran mahasiswa', async () => {
      const response = await app.handle(
        new Request('http://localhost/pelanggaran', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mahasiswaId: mhsId,
            tanggal: '2023-10-15',
            jenisPelanggaran: 'Merusak Fasilitas Lab',
            keterangan: 'Memecahkan monitor kelas praktik.',
          }),
        }),
      );
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.jenisSanksi).toBe(1);
    });

    it('mahasiswa dilarang keras mencatat pelanggaran', async () => {
      const response = await app.handle(
        new Request('http://localhost/pelanggaran', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({
            mahasiswaId: mhs2Id,
            tanggal: '2023-10-15',
            jenisPelanggaran: 'Menuduh teman alpa',
            keterangan: 'Keterangan palsu.',
          }),
        }),
      );
      expect(response.status).toBe(403);
    });

    it('mahasiswa harus sukses melihat daftar pelanggaran dan akumulasi poin miliknya sendiri', async () => {
      // Seed first
      await app.handle(
        new Request('http://localhost/pelanggaran', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mahasiswaId: mhsId,
            tanggal: '2023-10-15',
            jenisPelanggaran: 'Pelanggaran 1',
            jenisSanksi: 4,
            keterangan: 'Keterangan 1.',
          }),
        }),
      );

      const response = await app.handle(
        new Request(`http://localhost/pelanggaran/mahasiswa/${mhsId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mhsToken}`,
          },
        }),
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.totalPoin).toBe(4);
      expect(data.pelanggaranList).toBeArray();
      expect(data.pelanggaranList.length).toBe(1);
    });

    it('mahasiswa dilarang melihat riwayat pelanggaran mahasiswa lain', async () => {
      const response = await app.handle(
        new Request(`http://localhost/pelanggaran/mahasiswa/${mhs2Id}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mhsToken}`,
          },
        }),
      );
      expect(response.status).toBe(403);
    });

    it('pencatatan pelanggaran dengan pelapor harus otomatis mengirim notifikasi ke Dosen PA', async () => {
      const response = await app.handle(
        new Request('http://localhost/pelanggaran', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mahasiswaId: mhsId,
            tanggal: '2023-10-16',
            jenisPelanggaran: 'Merokok di Gedung Kuliah',
            keterangan: 'Tertangkap merokok di koridor lantai 2.',
            jenisSanksi: 4,
            pelapor: 'Satpam Irwan',
          }),
        }),
      );
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.pelapor).toBe('Satpam Irwan');

      // Verify Mahasiswa view contains pelapor & degradasi nilai sikap
      const mhsViewRes = await app.handle(
        new Request(`http://localhost/pelanggaran/mahasiswa/${mhsId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mhsToken}`,
          },
        }),
      );
      expect(mhsViewRes.status).toBe(200);
      const mhsData = await mhsViewRes.json();
      expect(mhsData.pelanggaranList[0].pelapor).toBe('Satpam Irwan');
      expect(mhsData.degradasiNilaiSikap).toBe(1.0);

      // Verify notification created in db for Dosen PA
      const dsnUserRes = await app.handle(
        new Request('http://localhost/notifications', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${dosenToken}`,
          },
        }),
      );
      expect(dsnUserRes.status).toBe(200);
      const notifData = await dsnUserRes.json();
      expect(notifData.length).toBeGreaterThan(0);
      const targetNotif = notifData.find((n: { title: string }) =>
        n.title.includes('Notifikasi Peringatan Pelanggaran'),
      );
      expect(targetNotif).toBeDefined();
      expect(targetNotif.message).toContain('Satpam Irwan');
    });

    it('admin/staff harus sukses mengambil daftar semua pelanggaran (GET /pelanggaran)', async () => {
      // Seed violation first
      const createRes = await app.handle(
        new Request('http://localhost/pelanggaran', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mahasiswaId: mhsId,
            tanggal: '2023-10-18',
            jenisPelanggaran: 'Pelanggaran Disiplin Bengkel',
            keterangan: 'Tidak memakai APD lengkap di bengkel mesin.',
            jenisSanksi: 1,
            pasalId: null,
            pelapor: 'Instruktur Budi',
          }),
        }),
      );
      expect(createRes.status).toBe(201);

      const response = await app.handle(
        new Request('http://localhost/pelanggaran', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }),
      );
      expect(response.status).toBe(200);
      const list = await response.json();
      expect(list).toBeArray();
      expect(list.length).toBeGreaterThan(0);
      expect(list[0].namaMahasiswa).toBeDefined();
      expect(list[0].tanggal).toBeDefined();
      expect(list[0].pelapor).toBe('Instruktur Budi');
    });

    it('pasalId 0 / falsy harus disanitasi menjadi null saat menyimpan pelanggaran', async () => {
      const response = await app.handle(
        new Request('http://localhost/pelanggaran', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mahasiswaId: mhsId,
            tanggal: '2023-10-19',
            jenisPelanggaran: 'Terlambat masuk kelas tanpa alasan sah',
            keterangan: 'Keterangan untuk kasus pasalId 0.',
            pasalId: 0,
          }),
        }),
      );
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.pasalId).toBeNull();
    });

    it('pasalId yang tidak valid (tidak ada di master) harus ditolak dengan 400', async () => {
      const response = await app.handle(
        new Request('http://localhost/pelanggaran', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mahasiswaId: mhsId,
            tanggal: '2023-10-19',
            jenisPelanggaran: 'Pelanggaran dengan pasal tidak dikenal',
            keterangan: 'Keterangan untuk kasus pasalId tidak valid.',
            pasalId: 999999,
          }),
        }),
      );
      expect(response.status).toBe(400);
      const errData = await response.json();
      expect(errData.error).toContain('Pasal pelanggaran tidak ditemukan');
    });
  });

  describe('Pasal Pelanggaran & Bulk Delete API', () => {
    it('admin harus sukses membuat dan menghapus massal butir pasal (bulk delete)', async () => {
      // 1. Create 3 pasals
      const p1Res = await app.handle(
        new Request('http://localhost/pasal-pelanggaran', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nomorPasal: 'Pasal 25A',
            bunyiPasal: 'Mengabaikan instruksi K3L.',
            jenisSanksi: 1,
          }),
        }),
      );
      const p1 = await p1Res.json();

      const p2Res = await app.handle(
        new Request('http://localhost/pasal-pelanggaran', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nomorPasal: 'Pasal 25B',
            bunyiPasal: 'Makan di ruang laboratorium.',
            jenisSanksi: 1,
          }),
        }),
      );
      const p2 = await p2Res.json();

      // 2. Bulk delete both pasals
      const bulkRes = await app.handle(
        new Request('http://localhost/pasal-pelanggaran/bulk-delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            ids: [p1.id, p2.id],
          }),
        }),
      );
      expect(bulkRes.status).toBe(200);
      const bulkData = await bulkRes.json();
      expect(bulkData.success).toBe(true);
      expect(bulkData.deletedCount).toBe(2);
    });

    it('single delete harus menolak pasal terpakai, bulk delete melewatinya tanpa menghapus apa pun', async () => {
      // 1. Create pasal
      const pRes = await app.handle(
        new Request('http://localhost/pasal-pelanggaran', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nomorPasal: 'Pasal 26',
            bunyiPasal: 'Merusak alat ukur.',
            jenisSanksi: 4,
          }),
        }),
      );
      const pasal = await pRes.json();

      // 2. Reference in pelanggaran
      await app.handle(
        new Request('http://localhost/pelanggaran', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mahasiswaId: mhsId,
            tanggal: '2023-10-18',
            jenisPelanggaran: 'Merusak Alat',
            keterangan: 'Jatuh saat praktikum',
            pasalId: pasal.id,
          }),
        }),
      );

      // 3. Try single delete -> 400
      const singleDeleteRes = await app.handle(
        new Request(`http://localhost/pasal-pelanggaran/${pasal.id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }),
      );
      expect(singleDeleteRes.status).toBe(400);

      // 4. Bulk delete with only the used pasal -> 200, nothing deleted, pasal skipped
      const bulkDeleteRes = await app.handle(
        new Request('http://localhost/pasal-pelanggaran/bulk-delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            ids: [pasal.id],
          }),
        }),
      );
      expect(bulkDeleteRes.status).toBe(200);
      const bulkData = await bulkDeleteRes.json();
      expect(bulkData.success).toBe(true);
      expect(bulkData.deletedCount).toBe(0);
      expect(bulkData.skippedCount).toBe(1);
      expect(bulkData.skippedPasal).toContain('Pasal 26');
    });

    it('bulk delete harus melewati pasal terpakai dan menghapus sisanya (partial delete)', async () => {
      // 1. Create 3 pasals
      const createPasal = async (nomorPasal: string, bunyiPasal: string, jenisSanksi: number) => {
        const res = await app.handle(
          new Request('http://localhost/pasal-pelanggaran', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({ nomorPasal, bunyiPasal, jenisSanksi }),
          }),
        );
        expect(res.status).toBe(201);
        return (await res.json()) as { id: number };
      };

      const p1 = await createPasal('Pasal 27', 'Melanggar kebersihan laboratorium.', 1);
      const p2 = await createPasal('Pasal 28', 'Menggunakan gawai saat praktikum.', 1);
      const p3 = await createPasal('Pasal 29', 'Berada di area terlarang tanpa izin.', 4);

      // 2. Reference p2 in a violation (so it cannot be deleted)
      await app.handle(
        new Request('http://localhost/pelanggaran', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mahasiswaId: mhsId,
            tanggal: '2023-10-20',
            jenisPelanggaran: 'Menggunakan gawai saat praktikum',
            keterangan: 'Keterangan pelanggaran p2.',
            pasalId: p2.id,
          }),
        }),
      );

      // 3. Bulk delete all 3 -> only p1 & p3 deleted, p2 skipped
      const bulkRes = await app.handle(
        new Request('http://localhost/pasal-pelanggaran/bulk-delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ ids: [p1.id, p2.id, p3.id] }),
        }),
      );
      expect(bulkRes.status).toBe(200);
      const data = await bulkRes.json();
      expect(data.success).toBe(true);
      expect(data.deletedCount).toBe(2);
      expect(data.skippedCount).toBe(1);
      expect(data.skippedPasal).toContain('Pasal 28');
    });
  });
});
