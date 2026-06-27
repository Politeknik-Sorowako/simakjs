import { describe, it, expect, beforeEach } from 'bun:test';
import { app } from '../index';
import { clearDatabase, getAuthToken } from './test-helper';
import { db } from '../utils/db';
import { programStudi, dosen, mahasiswa, periodeAkademik } from '../models/schema';

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
    const [prodi] = await db.insert(programStudi).values({
      kode: 'TI',
      nama: 'Teknik Informatika',
      jenjang: 'D4',
    }).returning();
    prodiId = prodi.id;

    // Seed Dosens
    const [dsn] = await db.insert(dosen).values({
      nip: '199001012020011001',
      nama: 'Dosen Wali 1',
      email: 'dosen@test.com',
      programStudiId: prodiId,
    }).returning();
    dosenId = dsn.id;

    const [dsn2] = await db.insert(dosen).values({
      nip: '199001012020011002',
      nama: 'Dosen Wali 2',
      email: 'dosen2@test.com',
      programStudiId: prodiId,
    }).returning();
    dosen2Id = dsn2.id;

    // Seed Mahasiswas (linking to Dosen PA)
    const [mhs] = await db.insert(mahasiswa).values({
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
    }).returning();
    mhsId = mhs.id;

    const [mhs2] = await db.insert(mahasiswa).values({
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
    }).returning();
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
            'Authorization': `Bearer ${mhsToken}`,
          },
        })
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
            'Authorization': `Bearer ${mhsToken}`,
          },
        })
      );
      expect(response.status).toBe(403);
    });

    it('mahasiswa harus sukses mengirim pesan bimbingan', async () => {
      const response = await app.handle(
        new Request(`http://localhost/bimbingan/mahasiswa/${mhsId}/thread`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({ pesan: 'Halo pak PA' }),
        })
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
            'Authorization': `Bearer ${dosenToken}`,
          },
          body: JSON.stringify({ pesan: 'Silakan ajukan KRS Anda.' }),
        })
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
            'Authorization': `Bearer ${dosen2Token}`,
          },
          body: JSON.stringify({ pesan: 'Mencoba mengganggu bimbingan orang lain.' }),
        })
      );
      expect(response.status).toBe(403);
    });

    it('dosen PA harus sukses mengupdate ringkasan & memberikan persetujuan kelayakan ujian', async () => {
      const response = await app.handle(
        new Request(`http://localhost/bimbingan/mahasiswa/${mhsId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${dosenToken}`,
          },
          body: JSON.stringify({
            ringkasan: 'Mahasiswa sudah berkonsultasi mengenai kelayakan ujian.',
            isApproved: true,
          }),
        })
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
            'Authorization': `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({
            ringkasan: 'Mencoba menyetujui sendiri.',
            isApproved: true,
          }),
        })
      );
      expect(response.status).toBe(403);
    });
  });

  describe('Pelanggaran/Kedisiplinan API', () => {
    it('admin harus sukses mencatat pelanggaran mahasiswa', async () => {
      const response = await app.handle(
        new Request('http://localhost/pelanggaran', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mahasiswaId: mhsId,
            tanggal: '2023-10-15',
            jenisPelanggaran: 'Merusak Fasilitas Lab',
            bobotPoin: 15,
            keterangan: 'Memecahkan monitor kelas praktik.',
          }),
        })
      );
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.bobotPoin).toBe(15);
    });

    it('mahasiswa dilarang keras mencatat pelanggaran', async () => {
      const response = await app.handle(
        new Request('http://localhost/pelanggaran', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({
            mahasiswaId: mhs2Id,
            tanggal: '2023-10-15',
            jenisPelanggaran: 'Menuduh teman alpa',
            bobotPoin: 5,
            keterangan: 'Keterangan palsu.',
          }),
        })
      );
      expect(response.status).toBe(403);
    });

    it('mahasiswa harus sukses melihat daftar pelanggaran dan akumulasi poin miliknya sendiri', async () => {
      // Seed first
      await db.insert(mahasiswa).values; // Dummy is not needed, we have mhsId.
      await app.handle(
        new Request('http://localhost/pelanggaran', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mahasiswaId: mhsId,
            tanggal: '2023-10-15',
            jenisPelanggaran: 'Pelanggaran 1',
            bobotPoin: 10,
            keterangan: 'Keterangan 1.',
          }),
        })
      );

      const response = await app.handle(
        new Request(`http://localhost/pelanggaran/mahasiswa/${mhsId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${mhsToken}`,
          },
        })
      );
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.totalPoin).toBe(10);
      expect(data.pelanggaranList).toBeArray();
      expect(data.pelanggaranList.length).toBe(1);
    });

    it('mahasiswa dilarang melihat riwayat pelanggaran mahasiswa lain', async () => {
      const response = await app.handle(
        new Request(`http://localhost/pelanggaran/mahasiswa/${mhs2Id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${mhsToken}`,
          },
        })
      );
      expect(response.status).toBe(403);
    });
  });
});
