import { beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import { ketidakhadiranMahasiswa, mahasiswa, programStudi } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

function kompensasiFormData(csvContent: string, mode?: string): FormData {
  const formData = new FormData();
  formData.append('file', new File([csvContent], 'kompensasi.csv', { type: 'text/csv' }));
  if (mode) formData.append('mode', mode);
  return formData;
}

describe('Impor Kompensasi Manual via CSV → Rekap Kompensasi', () => {
  let adminToken: string;
  let mhsId: number;

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin-kompen-import@test.com', 'admin');

    const [prodi] = await db
      .insert(programStudi)
      .values({
        kode: 'IMPORT',
        nama: 'Prodi Import Kompensasi',
        jenjang: 'D4',
      })
      .returning();

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20239999',
        nama: 'Mahasiswa Import Kompensasi',
        email: 'mhs_import_kompen@test.com',
        programStudiId: prodi.id,
        jenisKelamin: 'L',
        tanggalLahir: '2001-01-01',
      })
      .returning();
    mhsId = mhs.id;
  });

  it('harus tersinkronisasi ke ketidakhadiran_mahasiswa dan terhitung di rekap kompensasi', async () => {
    const csv = 'nim,tanggal,jenis_kompen,durasi_menit,keterangan\n20239999,2026-08-20,rusak,40,alat rusak\n';
    const res = await app.handle(
      new Request('http://localhost/kompensasi-manual/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: kompensasiFormData(csv),
      }),
    );

    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.successCount).toBe(1);
    expect(result.errors).toHaveLength(0);

    // Harus ada baris sinkron di tabel terpusat dengan sumber MANUAL & verified.
    const synced = await db.select().from(ketidakhadiranMahasiswa).where(eq(ketidakhadiranMahasiswa.sumber, 'MANUAL'));
    expect(synced).toHaveLength(1);
    expect(synced[0].mahasiswaId).toBe(mhsId);
    expect(synced[0].status).toBe('RUSAK');
    expect(synced[0].durasiMenit).toBe(40);
    expect(synced[0].isVerified).toBe(true);

    // Rekap kompensasi harus menghitung data CSV import (poin RUSAK = durasi = 40).
    const laporan = await app.handle(
      new Request('http://localhost/presensi/kompensasi/laporan?search=20239999', {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(laporan.status).toBe(200);
    const body = await laporan.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].totalKompensasi).toBe(40);
  });

  it('mode update harus menyinkronkan perubahan durasi ke ketidakhadiran_mahasiswa', async () => {
    // Import awal: rusak 40 menit.
    await app.handle(
      new Request('http://localhost/kompensasi-manual/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: kompensasiFormData(
          'nim,tanggal,jenis_kompen,durasi_menit,keterangan\n20239999,2026-08-20,rusak,40,alat rusak\n',
        ),
      }),
    );

    // Update via CSV: ubah durasi menjadi 60 menit.
    const csvUpdate =
      'nim,tanggal,jenis_kompen,durasi_menit,keterangan\n20239999,2026-08-20,rusak,60,alat rusak diperbarui\n';
    const res = await app.handle(
      new Request('http://localhost/kompensasi-manual/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: kompensasiFormData(csvUpdate, 'update'),
      }),
    );

    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.successCount).toBe(1);

    // Data terpusat ikut diperbarui.
    const synced = await db.select().from(ketidakhadiranMahasiswa).where(eq(ketidakhadiranMahasiswa.sumber, 'MANUAL'));
    expect(synced).toHaveLength(1);
    expect(synced[0].durasiMenit).toBe(60);
    expect(synced[0].keterangan).toBe('alat rusak diperbarui');

    // Rekap harus mencerminkan nilai terbaru (poin RUSAK = durasi = 60).
    const laporan = await app.handle(
      new Request('http://localhost/presensi/kompensasi/laporan?search=20239999', {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(laporan.status).toBe(200);
    const body = await laporan.json();
    expect(body.data[0].totalKompensasi).toBe(60);
  });

  it('mode skip melewati baris dengan data key (NIM+Tgl+Jenis) yang sudah ada', async () => {
    const csv = 'nim,tanggal,jenis_kompen,durasi_menit,keterangan\n20239999,2026-08-20,rusak,40,alat rusak\n';
    await app.handle(
      new Request('http://localhost/kompensasi-manual/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: kompensasiFormData(csv),
      }),
    );
    // Import ulang data key yang sama dengan mode skip → baris dilewati.
    const csv2 = 'nim,tanggal,jenis_kompen,durasi_menit,keterangan\n20239999,2026-08-20,rusak,50,alat rusak kedua\n';
    const res = await app.handle(
      new Request('http://localhost/kompensasi-manual/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: kompensasiFormData(csv2),
      }),
    );

    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.successCount).toBe(0);
    expect(result.skippedCount).toBe(1);

    // Data tidak berubah & tetap satu baris di ketidakhadiran_mahasiswa.
    const synced = await db.select().from(ketidakhadiranMahasiswa).where(eq(ketidakhadiranMahasiswa.sumber, 'MANUAL'));
    expect(synced).toHaveLength(1);
    expect(synced[0].durasiMenit).toBe(40);
  });

  it('mendukung kode singkatan A/S/I/R/T dan durasi kustom pada impor', async () => {
    const csv =
      'nim,tanggal,jenis_kompen,durasi_menit,keterangan\n' +
      '20239999,2026-08-21,A,,alpa tanpa durasi\n' +
      '20239999,2026-08-22,S,240,sakit durasi kustom\n' +
      '20239999,2026-08-23,I,,izin tanpa durasi\n' +
      '20239999,2026-08-24,R,45,alat rusak\n' +
      '20239999,2026-08-25,T,30,terlambat\n';

    const res = await app.handle(
      new Request('http://localhost/kompensasi-manual/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: kompensasiFormData(csv),
      }),
    );

    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.successCount).toBe(5);
    expect(result.errors).toHaveLength(0);

    const synced = await db.select().from(ketidakhadiranMahasiswa).where(eq(ketidakhadiranMahasiswa.sumber, 'MANUAL'));
    expect(synced).toHaveLength(5);

    const byStatus = new Map(synced.map((s) => [s.status, s.durasiMenit]));
    // A (alpa) tanpa durasi → default full-day 480.
    expect(byStatus.get('ALPA')).toBe(480);
    // S (sakit) dengan durasi kustom 240 → dipakai (bukan dipaksa 480).
    expect(byStatus.get('SAKIT')).toBe(240);
    // I (izin) tanpa durasi → default full-day 480.
    expect(byStatus.get('IZIN')).toBe(480);
    // R (rusak) durasi kustom.
    expect(byStatus.get('RUSAK')).toBe(45);
    // T (terlambat) durasi kustom.
    expect(byStatus.get('TERLAMBAT')).toBe(30);
  });

  it('harus menerima durasi 0 menit (anulir) pada impor CSV dan tersinkron dengan durasi 0', async () => {
    const csv =
      'nim,tanggal,jenis_kompen,durasi_menit,keterangan\n' +
      '20239999,2026-08-22,terlambat,0,anulir kompensasi terlambat\n' +
      '20239999,2026-08-23,sakit,0,anulir kompensasi sakit\n';

    const res = await app.handle(
      new Request('http://localhost/kompensasi-manual/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: kompensasiFormData(csv),
      }),
    );

    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.successCount).toBe(2);
    expect(result.errors).toHaveLength(0);

    const synced = await db.select().from(ketidakhadiranMahasiswa).where(eq(ketidakhadiranMahasiswa.sumber, 'MANUAL'));
    expect(synced).toHaveLength(2);
    const byStatus = new Map(synced.map((s) => [s.status, s.durasiMenit]));
    expect(byStatus.get('TERLAMBAT')).toBe(0);
    expect(byStatus.get('SAKIT')).toBe(0);
  });
});
