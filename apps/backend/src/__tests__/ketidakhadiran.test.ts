import { beforeEach, describe, expect, it } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { app } from '../app';
import {
  bap,
  dosen,
  kelasKuliah,
  kelompokApel,
  kelompokApelAnggota,
  ketidakhadiranMahasiswa,
  mahasiswa,
  mataKuliah,
  periodeAkademik,
  presensi,
  presensiApel,
  programStudi,
  sesiApel,
} from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

const MAKS_HARIAN = 480;

describe('Ketidakhadiran Terpusat & Verifikasi Unknown', () => {
  let adminToken: string;
  let mhsId: number;
  let kelasId: number;
  let dosenId: number;

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin-ketid@test.com', 'admin');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: 'KET', nama: 'Prodi Ketidakhadiran', jenjang: 'D4' })
      .returning();

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20239001',
        nama: 'Mahasiswa Ketid',
        email: 'mhs_ketid@test.com',
        programStudiId: prodi.id,
        jenisKelamin: 'L',
        tanggalLahir: '2001-01-01',
      })
      .returning();
    mhsId = mhs.id;

    const [dsn] = await db
      .insert(dosen)
      .values({ nip: 'KETDSN001', nama: 'Dosen Ketid', email: 'dsn_ketid@test.com', programStudiId: prodi.id })
      .returning();
    dosenId = dsn.id;

    await db.insert(periodeAkademik).values({ id: 'KET1', nama: 'Ganjil 2026/2027', aktif: true });

    const [matkul] = await db
      .insert(mataKuliah)
      .values({ kode: 'KET001', nama: 'MK Ketid', sksTotal: 3, programStudiId: prodi.id })
      .returning();

    const [kelas] = await db
      .insert(kelasKuliah)
      .values({ mataKuliahId: matkul.id, periodeId: 'KET1', namaKelas: 'A' })
      .returning();
    kelasId = kelas.id;
  });

  // Simulasikan saveBulk BAP -> source presensi + sinkron ke ketidakhadiran.
  async function seedBapPresensi(tanggal: string, status: string, durasi: number, keterangan?: string) {
    const [bapRow] = await db
      .insert(bap)
      .values({ kelasKuliahId: kelasId, tanggal, pertemuanKe: 1, materi: 'Materi', durasiMenit: durasi, dosenId })
      .returning();

    const [p] = await db
      .insert(presensi)
      .values({
        bapId: bapRow.id,
        mahasiswaId: mhsId,
        status: status as never,
        durasiMangkir: durasi,
        keterangan,
      })
      .returning();

    const [abs] = await db
      .insert(ketidakhadiranMahasiswa)
      .values({
        mahasiswaId: mhsId,
        tanggal,
        sumber: 'BAP',
        sumberId: p.id,
        status: status.toUpperCase() as never,
        durasiMenit: durasi,
        isVerified: status !== 'unknown',
      })
      .returning();
    return { presensiId: p.id, absenceId: abs.id };
  }

  // Simulasikan alur presensi apel -> sinkron ke ketidakhadiran (sumber='APEL').
  async function seedApelPresensi(tanggal: string, status: string, durasi: number, keterangan?: string) {
    const [kelompok] = await db
      .insert(kelompokApel)
      .values({ namaKelompok: 'Kelompok A', dosenId, shift: 'pagi' })
      .returning();
    await db.insert(kelompokApelAnggota).values({ kelompokApelId: kelompok.id, mahasiswaId: mhsId }).returning();
    const [sesi] = await db
      .insert(sesiApel)
      .values({ kelompokApelId: kelompok.id, tanggal, shift: 'pagi', dosenId, jamMulai: '06:30:00' })
      .returning();

    const [p] = await db
      .insert(presensiApel)
      .values({
        sesiApelId: sesi.id,
        mahasiswaId: mhsId,
        status: 'unknown' as never,
        menitTerlambat: durasi,
        keterangan,
      })
      .returning();

    const [abs] = await db
      .insert(ketidakhadiranMahasiswa)
      .values({
        mahasiswaId: mhsId,
        tanggal,
        sumber: 'APEL',
        sumberId: p.id,
        status: status.toUpperCase() as never,
        durasiMenit: durasi,
        isVerified: status !== 'unknown',
      })
      .returning();
    return { presensiId: p.id, absenceId: abs.id };
  }

  it('menolak akses verifikasi untuk non-admin', async () => {
    const token = await getAuthToken('mhs_ketid2@test.com', 'mahasiswa');
    const res = await app.handle(
      new Request('http://localhost/ketidakhadiran/verifikasi-unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sumber: 'BAP',
          sumberId: 1,
          statusKonfirmasi: 'ALPA',
          durasiMenit: 100,
        }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it('verifikasi UNKNOWN BAP mengubah status sumber + menandai terkonfirmasi', async () => {
    const { presensiId } = await seedBapPresensi('2026-08-01', 'unknown', 0);

    const res = await app.handle(
      new Request('http://localhost/ketidakhadiran/verifikasi-unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ sumber: 'BAP', sumberId: presensiId, statusKonfirmasi: 'ALPA', durasiMenit: 100 }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ALPA');
    expect(body.isVerified).toBe(true);
    expect(body.durasiMenit).toBe(100);

    const [source] = await db.select().from(presensi).where(eq(presensi.id, presensiId));
    expect(source.status).toBe('alpa');
    expect(source.durasiMangkir).toBe(100);
    expect(source.keteranganAdmin).toContain('[terkonfirmasi]');
    expect(source.resolvedAt).not.toBeNull();
  });

  it('anulir (durasi 0) tetap mencatat status namun tanpa denda kompensasi', async () => {
    const { presensiId } = await seedBapPresensi('2026-08-02', 'unknown', 0);

    const res = await app.handle(
      new Request('http://localhost/ketidakhadiran/verifikasi-unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ sumber: 'BAP', sumberId: presensiId, statusKonfirmasi: 'SAKIT', durasiMenit: 0 }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isVerified).toBe(true);
    expect(body.durasiMenit).toBe(0);

    // Rekap kompensasi mahasiswa tidak terhitung untuk baris durasi 0.
    const detailRes = await app.handle(
      new Request(`http://localhost/presensi/kompensasi/mahasiswa/${mhsId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(detailRes.status).toBe(200);
    const detail = await detailRes.json();
    expect(detail.summary.totalKompensasi).toBe(0);
  });

  it('rekap kompensasi hanya merekap dari tabel terpusat (tidak dobel hitung)', async () => {
    // 1. UNKNOWN belum diverifikasi -> tidak terhitung.
    const { presensiId } = await seedBapPresensi('2026-08-03', 'unknown', 100);
    let detailRes = await app.handle(
      new Request(`http://localhost/presensi/kompensasi/mahasiswa/${mhsId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect((await detailRes.json()).summary.totalKompensasi).toBe(0);

    // 2. Verifikasi -> terhitung 100 * 5 = 500.
    await app.handle(
      new Request('http://localhost/ketidakhadiran/verifikasi-unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ sumber: 'BAP', sumberId: presensiId, statusKonfirmasi: 'ALPA', durasiMenit: 100 }),
      }),
    );
    detailRes = await app.handle(
      new Request(`http://localhost/presensi/kompensasi/mahasiswa/${mhsId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    const detail = await detailRes.json();
    expect(detail.summary.totalKompensasi).toBe(500);
    expect(detail.historyKompensasi.length).toBe(1);
  });

  it('re-verifikasi (Koreksi) memperbarui baris dan sumber tanpa baris ganda', async () => {
    const { presensiId } = await seedBapPresensi('2026-08-04', 'unknown', 0);

    await app.handle(
      new Request('http://localhost/ketidakhadiran/verifikasi-unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ sumber: 'BAP', sumberId: presensiId, statusKonfirmasi: 'ALPA', durasiMenit: 100 }),
      }),
    );
    await app.handle(
      new Request('http://localhost/ketidakhadiran/verifikasi-unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ sumber: 'BAP', sumberId: presensiId, statusKonfirmasi: 'SAKIT', durasiMenit: 60 }),
      }),
    );

    const rows = await db
      .select()
      .from(ketidakhadiranMahasiswa)
      .where(and(eq(ketidakhadiranMahasiswa.sumber, 'BAP'), eq(ketidakhadiranMahasiswa.sumberId, presensiId)));
    expect(rows.length).toBe(1);
    expect(rows[0].status).toBe('SAKIT');
    expect(rows[0].durasiMenit).toBe(60);

    const [source] = await db.select().from(presensi).where(eq(presensi.id, presensiId));
    expect(source.status).toBe('sakit');
    expect(source.keteranganAdmin).toContain('[terkonfirmasi]');
  });

  it('menolak verifikasi melebihi batas durasi harian (480 menit)', async () => {
    const a = await seedBapPresensi('2026-08-05', 'unknown', 0);
    await app.handle(
      new Request('http://localhost/ketidakhadiran/verifikasi-unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          sumber: 'BAP',
          sumberId: a.presensiId,
          statusKonfirmasi: 'ALPA',
          durasiMenit: MAKS_HARIAN,
        }),
      }),
    );

    const b = await seedBapPresensi('2026-08-05', 'unknown', 0);
    const res = await app.handle(
      new Request('http://localhost/ketidakhadiran/verifikasi-unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ sumber: 'BAP', sumberId: b.presensiId, statusKonfirmasi: 'ALPA', durasiMenit: 60 }),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('melebihi batas');
  });

  it('konfirmasi HADIR mempertahankan baris terpusat (is_verified, durasi 0) dan menandai sumber hadir', async () => {
    const { presensiId } = await seedBapPresensi('2026-08-06', 'unknown', 0);

    const res = await app.handle(
      new Request('http://localhost/ketidakhadiran/verifikasi-unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ sumber: 'BAP', sumberId: presensiId, statusKonfirmasi: 'HADIR' }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('HADIR');

    const rows = await db
      .select()
      .from(ketidakhadiranMahasiswa)
      .where(and(eq(ketidakhadiranMahasiswa.sumber, 'BAP'), eq(ketidakhadiranMahasiswa.sumberId, presensiId)));
    expect(rows.length).toBe(1);
    expect(rows[0].isVerified).toBe(true);
    expect(rows[0].durasiMenit).toBe(0);
    expect(rows[0].status).toBe('UNKNOWN');

    const [source] = await db.select().from(presensi).where(eq(presensi.id, presensiId));
    expect(source.status).toBe('hadir');
    expect(source.durasiMangkir).toBe(0);
    expect(source.keteranganAdmin).toContain('[terkonfirmasi]');

    const detailRes = await app.handle(
      new Request(`http://localhost/presensi/kompensasi/mahasiswa/${mhsId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(detailRes.status).toBe(200);
    const detail = await detailRes.json();
    expect(detail.summary.totalKompensasi).toBe(0);
  });

  it('koreksi setelah konfirmasi HADIR tetap berhasil (tidak 404)', async () => {
    const { presensiId } = await seedBapPresensi('2026-08-07', 'unknown', 0);

    const hadirRes = await app.handle(
      new Request('http://localhost/ketidakhadiran/verifikasi-unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ sumber: 'BAP', sumberId: presensiId, statusKonfirmasi: 'HADIR' }),
      }),
    );
    expect(hadirRes.status).toBe(200);

    const koreksiRes = await app.handle(
      new Request('http://localhost/ketidakhadiran/verifikasi-unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ sumber: 'BAP', sumberId: presensiId, statusKonfirmasi: 'ALPA', durasiMenit: 120 }),
      }),
    );
    expect(koreksiRes.status).toBe(200);

    const rows = await db
      .select()
      .from(ketidakhadiranMahasiswa)
      .where(and(eq(ketidakhadiranMahasiswa.sumber, 'BAP'), eq(ketidakhadiranMahasiswa.sumberId, presensiId)));
    expect(rows.length).toBe(1);
    expect(rows[0].status).toBe('ALPA');
    expect(rows[0].durasiMenit).toBe(120);
  });

  it('detail kompensasi mengekspos kolom keterangan dari sumber presensi', async () => {
    await seedBapPresensi('2026-08-10', 'alpa', 100, 'Izin karena kecelakaan');

    const detailRes = await app.handle(
      new Request(`http://localhost/presensi/kompensasi/mahasiswa/${mhsId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(detailRes.status).toBe(200);
    const detail = await detailRes.json();
    expect(detail.historyKompensasi.length).toBe(1);
    expect(detail.historyKompensasi[0].keterangan).toBe('Izin karena kecelakaan');
  });

  it('verifikasi UNKNOWN APEL dengan status IZIN (10 menit) menyinkronkan presensi_apel', async () => {
    const { presensiId } = await seedApelPresensi('2026-09-02', 'unknown', 10, 'tes');

    const res = await app.handle(
      new Request('http://localhost/ketidakhadiran/verifikasi-unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ sumber: 'APEL', sumberId: presensiId, statusKonfirmasi: 'IZIN', durasiMenit: 10 }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('IZIN');
    expect(body.isVerified).toBe(true);
    expect(body.durasiMenit).toBe(10);

    const [source] = await db.select().from(presensiApel).where(eq(presensiApel.id, presensiId));
    expect(source.status).toBe('izin');
    expect(source.verifiedStatus).toBe('izin');
    expect(source.menitTerlambat).toBe(10);
    expect(source.verificationNote).toContain('[terkonfirmasi]');
    expect(source.verifiedAt).not.toBeNull();
  });

  it('verifikasi UNKNOWN APEL dengan status SAKIT', async () => {
    const { presensiId } = await seedApelPresensi('2026-09-03', 'unknown', 0);

    const res = await app.handle(
      new Request('http://localhost/ketidakhadiran/verifikasi-unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ sumber: 'APEL', sumberId: presensiId, statusKonfirmasi: 'SAKIT', durasiMenit: 60 }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('SAKIT');
    expect(body.isVerified).toBe(true);
    expect(body.durasiMenit).toBe(60);

    const [source] = await db.select().from(presensiApel).where(eq(presensiApel.id, presensiId));
    expect(source.status).toBe('sakit');
    expect(source.verifiedStatus).toBe('sakit');
    expect(source.menitTerlambat).toBe(60);
  });

  it('verifikasi UNKNOWN APEL dengan status ALPA', async () => {
    const { presensiId } = await seedApelPresensi('2026-09-04', 'unknown', 0);

    const res = await app.handle(
      new Request('http://localhost/ketidakhadiran/verifikasi-unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ sumber: 'APEL', sumberId: presensiId, statusKonfirmasi: 'ALPA', durasiMenit: 120 }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ALPA');

    const [source] = await db.select().from(presensiApel).where(eq(presensiApel.id, presensiId));
    expect(source.status).toBe('alpa');
    expect(source.verifiedStatus).toBe('alpa');
  });

  it('verifikasi UNKNOWN APEL dengan status HADIR mempertahankan baris & menandai hadir', async () => {
    const { presensiId } = await seedApelPresensi('2026-09-05', 'unknown', 10);

    const res = await app.handle(
      new Request('http://localhost/ketidakhadiran/verifikasi-unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ sumber: 'APEL', sumberId: presensiId, statusKonfirmasi: 'HADIR' }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('HADIR');
    expect(body.isVerified).toBe(true);
    expect(body.durasiMenit).toBe(0);

    const rows = await db
      .select()
      .from(ketidakhadiranMahasiswa)
      .where(and(eq(ketidakhadiranMahasiswa.sumber, 'APEL'), eq(ketidakhadiranMahasiswa.sumberId, presensiId)));
    expect(rows.length).toBe(1);
    expect(rows[0].status).toBe('UNKNOWN');
    expect(rows[0].isVerified).toBe(true);
    expect(rows[0].durasiMenit).toBe(0);

    const [source] = await db.select().from(presensiApel).where(eq(presensiApel.id, presensiId));
    expect(source.status).toBe('hadir');
    expect(source.verifiedStatus).toBe('hadir');
    expect(source.menitTerlambat).toBe(0);
    expect(source.verificationNote).toContain('[terkonfirmasi]');
  });

  it('verifikasi dengan adminUserId tidak ada (user terhapus) tetap berhasil dengan verifiedBy null', async () => {
    const { presensiId } = await seedApelPresensi('2026-09-06', 'unknown', 10, 'tes stale user');
    // Panggil service langsung dengan adminUserId yang tidak ada di tabel users
    const { VerifikasiUnknownService: Svc } = await import('../services/verifikasi-unknown.service');
    const result = await Svc.verify({
      sumber: 'APEL',
      sumberId: presensiId,
      statusKonfirmasi: 'IZIN',
      durasiMenit: 10,
      keterangan: 'tes',
      adminUserId: 999999,
    });
    expect(result.status).toBe('IZIN');
    expect(result.isVerified).toBe(true);

    const [row] = await db
      .select()
      .from(ketidakhadiranMahasiswa)
      .where(and(eq(ketidakhadiranMahasiswa.sumber, 'APEL'), eq(ketidakhadiranMahasiswa.sumberId, presensiId)));
    expect(row.verifiedBy).toBeNull();

    const [source] = await db.select().from(presensiApel).where(eq(presensiApel.id, presensiId));
    expect(source.verifiedBy).toBeNull();
  });
});
