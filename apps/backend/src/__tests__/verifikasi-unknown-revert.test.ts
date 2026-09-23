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

describe('Verifikasi UNKNOWN: mengembalikan ketidakhadiran ke antrean konfirmasi', () => {
  let adminToken: string;
  let mhsId: number;
  let kelasId: number;
  let dosenId: number;

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin-unknown-revert@test.com', 'admin');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: 'UNK', nama: 'Prodi Unknown Revert Test', jenjang: 'D4' })
      .returning();

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20248888',
        nama: 'Andi Revert Unknown',
        email: 'andi-revert@test.com',
        programStudiId: prodi.id,
        jenisKelamin: 'L',
        tanggalLahir: '2002-06-20',
      })
      .returning();
    mhsId = mhs.id;

    const [dsn] = await db
      .insert(dosen)
      .values({
        nip: '198801012015011009',
        nama: 'Dosen Revert Unknown',
        email: 'dosen-revert@test.com',
        programStudiId: prodi.id,
      })
      .returning();
    dosenId = dsn.id;

    await db.insert(periodeAkademik).values({ id: '20261', nama: 'Ganjil 2026/2027', aktif: true });

    const [matkul] = await db
      .insert(mataKuliah)
      .values({ kode: 'MKE002', nama: 'Sistem Kendali', sksTotal: 3, programStudiId: prodi.id })
      .returning();

    const [kelas] = await db
      .insert(kelasKuliah)
      .values({ mataKuliahId: matkul.id, periodeId: '20261', namaKelas: '3037PM1T-2C' })
      .returning();
    kelasId = kelas.id;
  });

  async function seedUnknownBap(tanggal: string, durasi = 100) {
    const [bapRow] = await db
      .insert(bap)
      .values({
        kelasKuliahId: kelasId,
        tanggal,
        pertemuanKe: 1,
        materi: 'Pertemuan-1: Kontrak pembelajaran',
        durasiMenit: durasi,
        dosenId,
      })
      .returning();

    const [p] = await db
      .insert(presensi)
      .values({
        bapId: bapRow.id,
        mahasiswaId: mhsId,
        status: 'unknown',
        durasiMangkir: durasi,
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
        durasiMenit: durasi,
        isVerified: false,
      })
      .returning();

    return { presensiId: p.id, absenceId: abs.id };
  }

  async function verify(presensiId: number, statusKonfirmasi: string, durasiMenit?: number, keterangan?: string) {
    return await app.handle(
      new Request('http://localhost/ketidakhadiran/verifikasi-unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          sumber: 'BAP',
          sumberId: presensiId,
          statusKonfirmasi,
          durasiMenit,
          keterangan,
        }),
      }),
    );
  }

  it('mengembalikan baris terverifikasi ALPA menjadi UNKNOWN belum terverifikasi (keluar kompensasi)', async () => {
    const { presensiId, absenceId } = await seedUnknownBap('2026-08-20');

    // 1. Verifikasi ALPA dengan durasi kustom 120 (berbeda dari sumber 100).
    let res = await verify(presensiId, 'ALPA', 120, 'Siswa tidak hadir');
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe('ALPA');

    // 2. Kembalikan ke UNKNOWN.
    res = await verify(presensiId, 'UNKNOWN', undefined, 'Butuh pengecekan ulang kehadiran');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('UNKNOWN');
    expect(body.isVerified).toBe(false);

    // 3. Tabel terpusat: status UNKNOWN, isVerified false, durasi kembali ke durasi sumber (bap.durasiMenit=100).
    const [abs] = await db.select().from(ketidakhadiranMahasiswa).where(eq(ketidakhadiranMahasiswa.id, absenceId));
    expect(abs.status).toBe('UNKNOWN');
    expect(abs.isVerified).toBe(false);
    expect(abs.durasiMenit).toBe(100);
    expect(abs.verifiedBy).toBeNull();
    expect(abs.verifiedAt).toBeNull();

    // 4. Sumber presensi kembali 'unknown', durasiMangkir dikembalikan, catatan revert.
    const [source] = await db.select().from(presensi).where(eq(presensi.id, presensiId));
    expect(source.status).toBe('unknown');
    expect(source.durasiMangkir).toBe(100);
    expect(source.keteranganAdmin).toContain('[dikembalikan] butuh konfirmasi — Butuh pengecekan ulang kehadiran');

    // 5. Tidak dihitung sebagai kompensasi (keluar dari rekap).
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

  it('idempoten: memanggil UNKNOWN dua kali tetap belum terverifikasi dan tidak error', async () => {
    const { presensiId, absenceId } = await seedUnknownBap('2026-08-21');

    let res = await verify(presensiId, 'ALPA', 100);
    expect(res.status).toBe(200);

    res = await verify(presensiId, 'UNKNOWN');
    expect(res.status).toBe(200);
    expect((await res.json()).isVerified).toBe(false);

    res = await verify(presensiId, 'UNKNOWN');
    expect(res.status).toBe(200);

    const [abs] = await db.select().from(ketidakhadiranMahasiswa).where(eq(ketidakhadiranMahasiswa.id, absenceId));
    expect(abs.status).toBe('UNKNOWN');
    expect(abs.isVerified).toBe(false);
  });

  it('baris yang dikembalikan ke UNKNOWN bisa diverifikasi ulang dengan benar', async () => {
    const { presensiId } = await seedUnknownBap('2026-08-22');

    let res = await verify(presensiId, 'ALPA', 100);
    expect(res.status).toBe(200);

    res = await verify(presensiId, 'UNKNOWN');
    expect(res.status).toBe(200);

    res = await verify(presensiId, 'SAKIT', 0, 'Surat dokter baru');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('SAKIT');
    expect(body.isVerified).toBe(true);

    const [source] = await db.select().from(presensi).where(eq(presensi.id, presensiId));
    expect(source.status).toBe('sakit');
    expect(source.keteranganAdmin).toContain('[terkonfirmasi] sakit — Surat dokter baru');
  });

  it('sumber MANUAL ditolak pada alur verifikasi', async () => {
    // Baris MANUAL tidak boleh lewat alur verifikasi; buktikan dengan sumberId tidak ada.
    const res = await app.handle(
      new Request('http://localhost/ketidakhadiran/verifikasi-unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          sumber: 'MANUAL',
          sumberId: 99999,
          statusKonfirmasi: 'UNKNOWN',
        }),
      }),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('tidak ditemukan');
  });

  it('durasi dari sumber dipakai saat mengembalikan UNKNOWN (tidak memakai input durasi)', async () => {
    const { presensiId, absenceId } = await seedUnknownBap('2026-08-23', 80);

    let res = await verify(presensiId, 'ALPA', 120);
    expect(res.status).toBe(200);

    res = await verify(presensiId, 'UNKNOWN', 999);
    expect(res.status).toBe(200);

    const [abs] = await db.select().from(ketidakhadiranMahasiswa).where(eq(ketidakhadiranMahasiswa.id, absenceId));
    expect(abs.status).toBe('UNKNOWN');
    expect(abs.durasiMenit).toBe(80);
  });
});
