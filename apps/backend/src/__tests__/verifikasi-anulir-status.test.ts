import { beforeEach, describe, expect, it } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { app } from '../app';
import {
  bap,
  dosen,
  kelasKuliah,
  ketidakhadiranMahasiswa,
  mahasiswa,
  mataKuliah,
  periodeAkademik,
  presensi,
  programStudi,
} from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Verifikasi & Anulir Presensi dengan Status Sakit / Izin / Alpa (Durasi = 0)', () => {
  let adminToken: string;
  let mhsId: number;
  let kelasId: number;
  let dosenId: number;

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin-anulir@test.com', 'admin');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: 'ANL', nama: 'Prodi Anulir Test', jenjang: 'D4' })
      .returning();

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20249999',
        nama: 'Reski Ramadhan Rustam',
        email: 'reski@test.com',
        programStudiId: prodi.id,
        jenisKelamin: 'L',
        tanggalLahir: '2002-05-15',
      })
      .returning();
    mhsId = mhs.id;

    const [dsn] = await db
      .insert(dosen)
      .values({
        nip: '198801012015011001',
        nama: 'Jasman, S.S.T., M.M.',
        email: 'jasman@test.com',
        programStudiId: prodi.id,
      })
      .returning();
    dosenId = dsn.id;

    await db.insert(periodeAkademik).values({ id: '20261', nama: 'Ganjil 2026/2027', aktif: true });

    const [matkul] = await db
      .insert(mataKuliah)
      .values({ kode: 'MKE001', nama: 'Mesin konversi energi', sksTotal: 3, programStudiId: prodi.id })
      .returning();

    const [kelas] = await db
      .insert(kelasKuliah)
      .values({ mataKuliahId: matkul.id, periodeId: '20261', namaKelas: '3037PM1T-2B' })
      .returning();
    kelasId = kelas.id;
  });

  async function seedUnknownBap(tanggal: string) {
    const [bapRow] = await db
      .insert(bap)
      .values({
        kelasKuliahId: kelasId,
        tanggal,
        pertemuanKe: 1,
        materi: 'Pertemuan-1: Kontrak pembelajaran',
        durasiMenit: 100,
        dosenId,
      })
      .returning();

    const [p] = await db
      .insert(presensi)
      .values({
        bapId: bapRow.id,
        mahasiswaId: mhsId,
        status: 'unknown',
        durasiMangkir: 100,
      })
      .returning();

    const [abs] = await db
      .insert(ketidakhadiranMahasiswa)
      .values({
        mahasiswaId: mhsId,
        tanggal,
        sumber: 'BAP',
        sumberId: p.id,
        status: 'UNKNOWN',
        durasiMenit: 100,
        isVerified: false,
      })
      .returning();

    return { presensiId: p.id, absenceId: abs.id };
  }

  it('Anulir presensi dengan status SAKIT dan durasi 0 menit berhasil tersimpan dengan benar', async () => {
    const { presensiId, absenceId } = await seedUnknownBap('2026-08-10');

    const res = await app.handle(
      new Request('http://localhost/ketidakhadiran/verifikasi-unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          sumber: 'BAP',
          sumberId: presensiId,
          statusKonfirmasi: 'SAKIT',
          durasiMenit: 0,
          keterangan: 'Surat Keterangan Dokter',
        }),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('SAKIT');
    expect(body.durasiMenit).toBe(0);
    expect(body.isVerified).toBe(true);

    // 1. Cek tabel terpusat ketidakhadiran_mahasiswa
    const [abs] = await db.select().from(ketidakhadiranMahasiswa).where(eq(ketidakhadiranMahasiswa.id, absenceId));
    expect(abs.status).toBe('SAKIT');
    expect(abs.durasiMenit).toBe(0);
    expect(abs.isVerified).toBe(true);

    // 2. Cek tabel sumber presensi
    const [source] = await db.select().from(presensi).where(eq(presensi.id, presensiId));
    expect(source.status).toBe('sakit');
    expect(source.durasiMangkir).toBe(0);
    expect(source.keteranganAdmin).toContain('[terkonfirmasi] sakit — Surat Keterangan Dokter');

    // 3. Cek rekap kompensasi (harus 0 karena dianulir)
    const kompenRes = await app.handle(
      new Request(`http://localhost/presensi/kompensasi/mahasiswa/${mhsId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(kompenRes.status).toBe(200);
    const kompen = await kompenRes.json();
    expect(kompen.summary.totalKompensasi).toBe(0);
  });

  it('Anulir presensi dengan status IZIN dan durasi 0 menit berhasil tersimpan dengan benar', async () => {
    const { presensiId, absenceId } = await seedUnknownBap('2026-08-11');

    const res = await app.handle(
      new Request('http://localhost/ketidakhadiran/verifikasi-unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          sumber: 'BAP',
          sumberId: presensiId,
          statusKonfirmasi: 'IZIN',
          durasiMenit: 0,
          keterangan: 'Surat Dispensasi Kegiatan Kampus',
        }),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('IZIN');
    expect(body.durasiMenit).toBe(0);

    const [source] = await db.select().from(presensi).where(eq(presensi.id, presensiId));
    expect(source.status).toBe('izin');
    expect(source.durasiMangkir).toBe(0);
    expect(source.keteranganAdmin).toContain('[terkonfirmasi] izin — Surat Dispensasi Kegiatan Kampus');
  });

  it('Verifikasi normal dengan status ALPA dan durasi > 0 menit memperhitungkan kompensasi', async () => {
    const { presensiId, absenceId } = await seedUnknownBap('2026-08-12');

    const res = await app.handle(
      new Request('http://localhost/ketidakhadiran/verifikasi-unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          sumber: 'BAP',
          sumberId: presensiId,
          statusKonfirmasi: 'ALPA',
          durasiMenit: 100,
          keterangan: 'Tidak hadir tanpa kabar',
        }),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ALPA');
    expect(body.durasiMenit).toBe(100);

    const [source] = await db.select().from(presensi).where(eq(presensi.id, presensiId));
    expect(source.status).toBe('alpa');
    expect(source.durasiMangkir).toBe(100);
  });
});
