import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import { dosen, mahasiswa, periodeAkademik, programStudi, statusMahasiswaLampiran } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Modul Status Mahasiswa (Edit & Lampiran)', () => {
  let adminToken: string;
  let dosenToken: string;
  let otherDosenToken: string;
  let mhsToken: string;
  let prodiId: number;
  let testPeriodId = '20241';
  let nextPeriodId = '20242';
  let mhsId: number;
  let dosenId: number;

  beforeEach(async () => {
    await clearDatabase();

    adminToken = await getAuthToken('admin@test.com', 'admin');
    dosenToken = await getAuthToken('dosen@test.com', 'dosen');
    otherDosenToken = await getAuthToken('other.dosen@test.com', 'dosen');
    mhsToken = await getAuthToken('mhs@test.com', 'mahasiswa');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: 'IF', nama: 'Informatika', jenjang: 'D4' })
      .returning();
    prodiId = prodi.id;

    await db.insert(periodeAkademik).values([
      { id: testPeriodId, nama: 'Semester Ganjil 2024/2025', aktif: true },
      { id: nextPeriodId, nama: 'Semester Genap 2024/2025', aktif: false },
    ]);

    const [dsn] = await db
      .insert(dosen)
      .values({
        nip: '1987654321',
        nama: 'Dosen Wali PA',
        email: 'dosen@test.com',
        programStudiId: prodiId,
        jenisKelamin: 'L',
        nik: '9876543210987654',
        tanggalLahir: '1980-01-01',
      })
      .returning();
    dosenId = dsn.id;

    await db.insert(dosen).values({
      nip: '1987654322',
      nama: 'Dosen Lain',
      email: 'other.dosen@test.com',
      programStudiId: prodiId,
      jenisKelamin: 'L',
      nik: '9876543210987655',
      tanggalLahir: '1981-01-01',
    });

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20240001',
        nama: 'Mahasiswa Cuti',
        email: 'mhs@test.com',
        programStudiId: prodiId,
        dosenPaId: dosenId,
        status: 'aktif',
        namaIbuKandung: 'Ibu Mahasiswa',
        nik: '1234567890123456',
        jenisKelamin: 'L',
        tanggalLahir: '2004-01-01',
      })
      .returning();
    mhsId = mhs.id;
  });

  afterAll(() => {
    try {
      rmSync(join(process.cwd(), 'storage/status-mahasiswa'), { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('Pengajuan Cuti - Edit & Lampiran', () => {
    it('Admin dapat mengedit data pengajuan cuti', async () => {
      // 1. Mahasiswa submit cuti
      const createRes = await app.handle(
        new Request('http://localhost/cuti', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({
            periodeId: testPeriodId,
            alasan: 'Alasan Awal',
          }),
        }),
      );
      expect(createRes.status).toBe(201);
      const created = (await createRes.json()) as { id: number };

      // 2. Admin edit cuti
      const updateRes = await app.handle(
        new Request(`http://localhost/cuti/${created.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            alasan: 'Alasan Diedit oleh Admin',
            noSuratIzin: 'SK/CUTI/001',
            tanggalSuratIzin: '2024-09-01',
            catatan: 'Catatan tambahan admin',
          }),
        }),
      );
      expect(updateRes.status).toBe(200);
      const updated = (await updateRes.json()) as {
        alasan: string;
        noSuratIzin: string;
        catatan: string;
        status: string;
      };
      expect(updated.alasan).toBe('Alasan Diedit oleh Admin');
      expect(updated.noSuratIzin).toBe('SK/CUTI/001');
      expect(updated.catatan).toBe('Catatan tambahan admin');
      // Status approval tidak boleh terganggu oleh edit
      expect(updated.status).toBe('pending');
    });

    it('Mahasiswa tidak boleh mengedit cuti via PUT endpoint', async () => {
      const createRes = await app.handle(
        new Request('http://localhost/cuti', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({
            periodeId: testPeriodId,
            alasan: 'Alasan Cuti',
          }),
        }),
      );
      const created = (await createRes.json()) as { id: number };

      const updateRes = await app.handle(
        new Request(`http://localhost/cuti/${created.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({
            alasan: 'Mahasiswa coba edit sendiri',
          }),
        }),
      );
      expect(updateRes.status).toBe(403);
    });

    it('Upload lampiran SK menggantikan SK sebelumnya secara otomatis', async () => {
      const createRes = await app.handle(
        new Request('http://localhost/cuti', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({
            periodeId: testPeriodId,
            alasan: 'Alasan Cuti',
          }),
        }),
      );
      const cutiId = ((await createRes.json()) as { id: number }).id;

      // Upload SK #1
      const formData1 = new FormData();
      const file1 = new File(['%PDF-1.4 SK 1 content'], 'sk_cuti_v1.pdf', { type: 'application/pdf' });
      formData1.append('file', file1);
      formData1.append('jenis', 'sk');
      formData1.append('keterangan', 'SK Versi 1');

      const upload1 = await app.handle(
        new Request(`http://localhost/cuti/${cutiId}/lampiran`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
          body: formData1,
        }),
      );
      expect(upload1.status).toBe(201);
      const item1 = (await upload1.json()) as { id: number; fileName: string };
      expect(item1.fileName).toBe('sk_cuti_v1.pdf');

      // Upload SK #2 (harus me-replace SK #1)
      const formData2 = new FormData();
      const file2 = new File(['%PDF-1.4 SK 2 content'], 'sk_cuti_v2.pdf', { type: 'application/pdf' });
      formData2.append('file', file2);
      formData2.append('jenis', 'sk');
      formData2.append('keterangan', 'SK Versi 2');

      const upload2 = await app.handle(
        new Request(`http://localhost/cuti/${cutiId}/lampiran`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
          body: formData2,
        }),
      );
      expect(upload2.status).toBe(201);
      const item2 = (await upload2.json()) as { id: number; fileName: string };
      expect(item2.fileName).toBe('sk_cuti_v2.pdf');

      // List lampiran -> hanya ada 1 SK
      const listRes = await app.handle(
        new Request(`http://localhost/cuti/${cutiId}/lampiran`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      );
      expect(listRes.status).toBe(200);
      const list = (await listRes.json()) as Array<{ id: number; jenis: string; fileName: string }>;
      const skItems = list.filter((l) => l.jenis === 'sk');
      expect(skItems.length).toBe(1);
      expect(skItems[0].fileName).toBe('sk_cuti_v2.pdf');
    });

    it('Hak akses download lampiran: Dosen PA & Mahasiswa bersangkutan diizinkan, Dosen lain ditolak', async () => {
      const createRes = await app.handle(
        new Request('http://localhost/cuti', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({
            periodeId: testPeriodId,
            alasan: 'Alasan Cuti',
          }),
        }),
      );
      const cutiId = ((await createRes.json()) as { id: number }).id;

      // Admin upload berkas pendukung
      const formData = new FormData();
      const file = new File(['%PDF-1.4 Berkas pendukung'], 'surat_dokter.pdf', { type: 'application/pdf' });
      formData.append('file', file);
      formData.append('jenis', 'pendukung');

      const uploadRes = await app.handle(
        new Request(`http://localhost/cuti/${cutiId}/lampiran`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
          body: formData,
        }),
      );
      const lampiran = (await uploadRes.json()) as { id: number };

      // 1. Mahasiswa bersangkutan boleh unduh
      const mhsDl = await app.handle(
        new Request(`http://localhost/cuti/${cutiId}/lampiran/${lampiran.id}/file`, {
          headers: { Authorization: `Bearer ${mhsToken}` },
        }),
      );
      expect(mhsDl.status).toBe(200);

      // 2. Dosen PA boleh unduh
      const paDl = await app.handle(
        new Request(`http://localhost/cuti/${cutiId}/lampiran/${lampiran.id}/file`, {
          headers: { Authorization: `Bearer ${dosenToken}` },
        }),
      );
      expect(paDl.status).toBe(200);

      // 3. Dosen lain (bukan PA) ditolak 403
      const otherPaDl = await app.handle(
        new Request(`http://localhost/cuti/${cutiId}/lampiran/${lampiran.id}/file`, {
          headers: { Authorization: `Bearer ${otherDosenToken}` },
        }),
      );
      expect(otherPaDl.status).toBe(403);
    });
  });

  describe('Mahasiswa Keluar (Penonaktifan) - Edit & Lampiran', () => {
    it('Admin dapat mengedit penonaktifan dan otomatis sinkronisasi status mahasiswa', async () => {
      // 1. Admin mencatat mahasiswa keluar (status: pindah)
      const createRes = await app.handle(
        new Request('http://localhost/mahasiswa-keluar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mahasiswaId: mhsId,
            periodeId: testPeriodId,
            statusBaru: 'pindah',
            tanggalKeluar: '2024-09-10',
            alasanKeluar: 'Pindah kampus luar kota',
            noSk: 'SK/PINDAH/001',
          }),
        }),
      );
      expect(createRes.status).toBe(201);
      const created = (await createRes.json()) as { id: number };

      // Verifikasi status mahasiswa menjadi pindah
      const mhsBefore = await db.query.mahasiswa.findFirst({
        where: eq(mahasiswa.id, mhsId),
      });
      expect(mhsBefore?.status).toBe('pindah');

      // 2. Admin mengedit menjadi drop_out
      const updateRes = await app.handle(
        new Request(`http://localhost/mahasiswa-keluar/${created.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            statusBaru: 'drop_out',
            noSk: 'SK/DO/002',
            alasanKeluar: 'Koreksi: Mahasiswa berstatus Drop Out',
          }),
        }),
      );
      expect(updateRes.status).toBe(200);
      const updated = (await updateRes.json()) as { statusBaru: string; noSk: string };
      expect(updated.statusBaru).toBe('drop_out');
      expect(updated.noSk).toBe('SK/DO/002');

      // Verifikasi sinkronisasi mahasiswa.status menjadi drop_out
      const mhsAfter = await db.query.mahasiswa.findFirst({
        where: eq(mahasiswa.id, mhsId),
      });
      expect(mhsAfter?.status).toBe('drop_out');
    });

    it('Hapus data penonaktifan membersihkan seluruh lampiran terkait di database', async () => {
      const createRes = await app.handle(
        new Request('http://localhost/mahasiswa-keluar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mahasiswaId: mhsId,
            periodeId: testPeriodId,
            statusBaru: 'keluar',
            tanggalKeluar: '2024-09-10',
            alasanKeluar: 'Mengundurkan diri',
          }),
        }),
      );
      const keluarId = ((await createRes.json()) as { id: number }).id;

      // Upload 1 lampiran SK
      const formData = new FormData();
      const file = new File(['%PDF-1.4 SK Keluar'], 'sk_keluar.pdf', { type: 'application/pdf' });
      formData.append('file', file);
      formData.append('jenis', 'sk');

      const uploadRes = await app.handle(
        new Request(`http://localhost/mahasiswa-keluar/${keluarId}/lampiran`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
          body: formData,
        }),
      );
      expect(uploadRes.status).toBe(201);

      // Verifikasi lampiran ada di DB
      const countBefore = await db.query.statusMahasiswaLampiran.findMany({
        where: eq(statusMahasiswaLampiran.mahasiswaKeluarId, keluarId),
      });
      expect(countBefore.length).toBe(1);

      // Delete record penonaktifan
      const delRes = await app.handle(
        new Request(`http://localhost/mahasiswa-keluar/${keluarId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      );
      expect(delRes.status).toBe(200);

      // Verifikasi lampiran ter-cascade delete
      const countAfter = await db.query.statusMahasiswaLampiran.findMany({
        where: eq(statusMahasiswaLampiran.mahasiswaKeluarId, keluarId),
      });
      expect(countAfter.length).toBe(0);
    });
  });
});
