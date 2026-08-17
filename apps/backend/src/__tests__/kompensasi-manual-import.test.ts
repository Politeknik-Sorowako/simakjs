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

    // Rekap kompensasi harus menghitung data CSV import (40 * 5 = 200).
    const laporan = await app.handle(
      new Request('http://localhost/presensi/kompensasi/laporan?search=20239999', {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(laporan.status).toBe(200);
    const body = await laporan.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].totalKompensasi).toBe(200);
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

    // Rekap harus mencerminkan nilai terbaru (60 * 5 = 300).
    const laporan = await app.handle(
      new Request('http://localhost/presensi/kompensasi/laporan?search=20239999', {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(laporan.status).toBe(200);
    const body = await laporan.json();
    expect(body.data[0].totalKompensasi).toBe(300);
  });

  it('tidak boleh menghasilkan baris duplikat di ketidakhadiran_mahasiswa saat import berulang', async () => {
    const csv = 'nim,tanggal,jenis_kompen,durasi_menit,keterangan\n20239999,2026-08-20,rusak,40,alat rusak\n';
    await app.handle(
      new Request('http://localhost/kompensasi-manual/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: kompensasiFormData(csv),
      }),
    );
    // Import baris berbeda di tanggal/jenis yang sama untuk memicu onConflict update path.
    const csv2 = 'nim,tanggal,jenis_kompen,durasi_menit,keterangan\n20239999,2026-08-20,rusak,50,alat rusak kedua\n';
    await app.handle(
      new Request('http://localhost/kompensasi-manual/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: kompensasiFormData(csv2),
      }),
    );

    const synced = await db.select().from(ketidakhadiranMahasiswa).where(eq(ketidakhadiranMahasiswa.sumber, 'MANUAL'));
    // Dua baris kompensasi_manual terpisah → dua baris sinkron terpisah (bukan kolaps).
    expect(synced).toHaveLength(2);
    expect(new Set(synced.map((s) => s.sumberId)).size).toBe(2);
  });
});
