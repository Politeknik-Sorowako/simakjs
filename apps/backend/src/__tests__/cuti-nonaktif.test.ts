import { beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import { dosen, mahasiswa, periodeAkademik, programStudi, users } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Modul Cuti & Mahasiswa Keluar', () => {
  let adminToken: string;
  let dosenToken: string;
  let mhsToken: string;
  let prodiId: number;
  let testPeriodId = '20241';
  let mhsId: number;
  let dosenId: number;

  beforeEach(async () => {
    await clearDatabase();

    // 1. Setup Auth tokens
    adminToken = await getAuthToken('admin@test.com', 'admin');
    dosenToken = await getAuthToken('dosen@test.com', 'dosen');
    mhsToken = await getAuthToken('mhs@test.com', 'mahasiswa');

    // 2. Setup Program Studi
    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: 'IF', nama: 'Informatika', jenjang: 'D4' })
      .returning();
    prodiId = prodi.id;

    // 3. Setup Periode Akademik
    await db.insert(periodeAkademik).values({ id: testPeriodId, nama: 'Semester Ganjil 2024/2025', aktif: true });

    // 4. Resolve Dosen PA
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

    // 5. Setup Mahasiswa record
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

  describe('Pengajuan Cuti', () => {
    it('Harus berhasil mengajukan cuti oleh Mahasiswa', async () => {
      const response = await app.handle(
        new Request('http://localhost/cuti', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({
            periodeId: testPeriodId,
            alasan: 'Ingin fokus magang mandiri',
          }),
        }),
      );

      expect(response.status).toBe(201);
      const data = (await response.json()) as Record<string, unknown>;
      expect(data.status).toBe('pending');
      expect(data.alasan).toBe('Ingin fokus magang mandiri');
    });

    it('Harus gagal jika mengajukan cuti ganda pada periode yang sama', async () => {
      // Pengajuan pertama
      await app.handle(
        new Request('http://localhost/cuti', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({
            periodeId: testPeriodId,
            alasan: 'Alasan 1',
          }),
        }),
      );

      // Pengajuan kedua
      const response2 = await app.handle(
        new Request('http://localhost/cuti', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({
            periodeId: testPeriodId,
            alasan: 'Alasan 2',
          }),
        }),
      );

      expect(response2.status).toBe(400);
      const data2 = (await response2.json()) as Record<string, unknown>;
      expect(data2.error).toContain('sudah mengajukan cuti');
    });

    it('Harus berhasil melalui seluruh alur approval cuti', async () => {
      // 1. Ajukan Cuti
      const submitRes = await app.handle(
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
      const cuti = (await submitRes.json()) as Record<string, unknown>;
      const cutiId = cuti.id;

      // 2. Approve oleh Dosen PA
      const paRes = await app.handle(
        new Request(`http://localhost/cuti/${cutiId}/approve`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${dosenToken}`,
          },
          body: JSON.stringify({
            action: 'approve',
            catatan: 'Disetujui PA',
          }),
        }),
      );
      expect(paRes.status).toBe(200);
      const paData = (await paRes.json()) as Record<string, unknown>;
      expect(paData.status).toBe('disetujui_pa');

      // 3. Approve oleh Keuangan (menggunakan admin token karena role keuangan/admin memiliki akses staff)
      const finRes = await app.handle(
        new Request(`http://localhost/cuti/${cutiId}/approve`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            action: 'approve',
            catatan: 'Lunas biaya administrasi cuti',
          }),
        }),
      );
      // Wait, let's look at the approval logic in service. Keuangan is the one approving disetujui_pa
      // Since admin token has role 'admin', let's temporarily simulate keuangan or check admin access.
      // In service, role 'admin' gets access when status is 'disetujui_keuangan' to approve finally.
      // But can admin bypass or approve as finance? Let's check service logic:
      // "else if (role === 'keuangan') { ... nextStatus = 'disetujui_keuangan' }"
      // Let's obtain a Keuangan token to be precise!
      const keuanganToken = await getAuthToken('keuangan@test.com', 'keuangan');
      const finResReal = await app.handle(
        new Request(`http://localhost/cuti/${cutiId}/approve`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${keuanganToken}`,
          },
          body: JSON.stringify({
            action: 'approve',
            catatan: 'Bebas tunggakan',
          }),
        }),
      );
      expect(finResReal.status).toBe(200);
      const finData = (await finResReal.json()) as Record<string, unknown>;
      expect(finData.status).toBe('disetujui_keuangan');

      // 4. Approve Final oleh Admin/Prodi (dengan input SK Cuti)
      const finalRes = await app.handle(
        new Request(`http://localhost/cuti/${cutiId}/approve`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            action: 'approve',
            noSuratIzin: '123/DIR/CUTI/2024',
            tanggalSuratIzin: '2024-07-04',
            catatan: 'SK terbit',
          }),
        }),
      );
      expect(finalRes.status).toBe(200);
      const finalData = (await finalRes.json()) as Record<string, unknown>;
      expect(finalData.status).toBe('disetujui_prodi');

      // 5. Cek status mahasiswa diperbarui
      const [mhsDb] = await db.select().from(mahasiswa).where(eq(mahasiswa.id, mhsId));
      expect(mhsDb.status).toBe('cuti');
    });
  });

  describe('Mahasiswa Keluar (Keluar, DO, dll.)', () => {
    it('Admin harus berhasil mencatat status Mahasiswa Keluar / DO', async () => {
      const response = await app.handle(
        new Request('http://localhost/mahasiswa-keluar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mahasiswaId: mhsId,
            periodeId: testPeriodId,
            statusBaru: 'drop_out',
            tanggalKeluar: '2024-07-04',
            alasanKeluar: 'Pelanggaran berat tata tertib',
            noSk: 'DO-001/SK/2024',
            tanggalSk: '2024-07-01',
            ipk: 2.15,
          }),
        }),
      );

      expect(response.status).toBe(201);
      const data = (await response.json()) as Record<string, unknown>;
      expect(data.statusBaru).toBe('drop_out');

      // Verifikasi status mahasiswa berubah
      const [mhsDb] = await db.select().from(mahasiswa).where(eq(mahasiswa.id, mhsId));
      expect(mhsDb.status).toBe('drop_out');
    });

    it('Admin harus berhasil membatalkan pencatatan keluar (Kembali Aktif)', async () => {
      // 1. Catat keluar terlebih dahulu
      const keluarRes = await db
        .insert(mahasiswa)
        .values({
          nim: '20240002',
          nama: 'Mahasiswa Keluar',
          email: 'mhs2@test.com',
          programStudiId: prodiId,
          status: 'aktif',
          namaIbuKandung: 'Ibu Mahasiswa',
          nik: '1234567890123455',
          jenisKelamin: 'P',
          tanggalLahir: '2004-02-02',
        })
        .returning();
      const tempMhsId = keluarRes[0].id;

      const recordRes = await app.handle(
        new Request('http://localhost/mahasiswa-keluar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mahasiswaId: tempMhsId,
            periodeId: testPeriodId,
            statusBaru: 'keluar',
            tanggalKeluar: '2024-07-04',
          }),
        }),
      );
      const record = (await recordRes.json()) as Record<string, unknown>;
      const recordId = record.id;

      // 2. Batalkan status keluar
      const deleteRes = await app.handle(
        new Request(`http://localhost/mahasiswa-keluar/${recordId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }),
      );
      expect(deleteRes.status).toBe(200);

      // 3. Verifikasi status mahasiswa kembali menjadi aktif
      const [mhsDb] = await db.select().from(mahasiswa).where(eq(mahasiswa.id, tempMhsId));
      expect(mhsDb.status).toBe('aktif');
    });
  });
});
