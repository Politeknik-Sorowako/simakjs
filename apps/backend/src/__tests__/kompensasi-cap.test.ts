import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import {
  bap,
  cpmk,
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

const PENGALI_MANGKIR = 5;
const PENGALI_IZIN_SAKIT = 1;
const MAKS_HARIAN = 480;

describe('Kompensasi Cap 480 Menit/Hari', () => {
  let adminToken: string;
  let mhsId: number;
  let kelasId: number;
  let cpmkId: number;
  let dosenId: number;

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin-cap@test.com', 'admin');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: 'CAP', nama: 'Prodi Cap Kompensasi', jenjang: 'D4' })
      .returning();

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20239901',
        nama: 'Mahasiswa Cap',
        email: 'mhs_cap@test.com',
        programStudiId: prodi.id,
        jenisKelamin: 'L',
        tanggalLahir: '2001-01-01',
      })
      .returning();
    mhsId = mhs.id;

    const [dsn] = await db
      .insert(dosen)
      .values({ nip: 'CAPDSN001', nama: 'Dosen Cap', email: 'dsn_cap@test.com', programStudiId: prodi.id })
      .returning();
    dosenId = dsn.id;

    await db.insert(periodeAkademik).values({ id: 'CAP1', nama: 'Ganjil 2026/2027', aktif: true });

    const [matkul] = await db
      .insert(mataKuliah)
      .values({ kode: 'CAP001', nama: 'MK Cap', sksTotal: 3, programStudiId: prodi.id })
      .returning();

    const [kelas] = await db
      .insert(kelasKuliah)
      .values({ mataKuliahId: matkul.id, periodeId: 'CAP1', namaKelas: 'A' })
      .returning();
    kelasId = kelas.id;

    const [cpmkRow] = await db
      .insert(cpmk)
      .values({ mataKuliahId: matkul.id, kode: 'CPMK-CAP', deskripsi: 'Cap' })
      .returning();
    cpmkId = cpmkRow.id;
  });

  // Insert BAP + presensi rows directly so status & durasiMangkir are fully controlled.
  async function seedPresensi(
    tanggal: string,
    pertemuan: number,
    rows: Array<{ status: 'telat' | 'sakit' | 'alpa'; durasiMangkir: number }>,
  ) {
    const [bapRow] = await db
      .insert(bap)
      .values({
        kelasKuliahId: kelasId,
        tanggal,
        pertemuanKe: pertemuan,
        materi: `Materi ${pertemuan}`,
        durasiMenit: Math.max(...rows.map((r) => r.durasiMangkir)),
        cpmkId,
        dosenId,
      })
      .returning();
    for (const r of rows) {
      const [p] = await db
        .insert(presensi)
        .values({ bapId: bapRow.id, mahasiswaId: mhsId, status: r.status, durasiMangkir: r.durasiMangkir })
        .returning();
      await db.insert(ketidakhadiranMahasiswa).values({
        mahasiswaId: mhsId,
        tanggal,
        sumber: 'BAP',
        sumberId: p.id,
        status: (r.status === 'telat' ? 'TERLAMBAT' : r.status.toUpperCase()) as
          | 'SAKIT'
          | 'IZIN'
          | 'ALPA'
          | 'TERLAMBAT'
          | 'UNKNOWN',
        durasiMenit: r.durasiMangkir,
        isVerified: true,
      });
    }
  }

  async function getLaporanTotal(): Promise<number> {
    const res = await app.handle(
      new Request('http://localhost/presensi/kompensasi/laporan?search=20239901', {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.data.length).toBe(1);
    return body.data[0].totalKompensasi as number;
  }

  it('menghitung tanpa cap saat total raw di bawah 480 menit/hari', async () => {
    await seedPresensi('2026-08-10', 1, [{ status: 'telat', durasiMangkir: 100 }]);
    expect(await getLaporanTotal()).toBe(100 * PENGALI_MANGKIR); // 500
  });

  it('menerapkan cap 480 pada raw mangkir murni yang melebihi batas harian', async () => {
    // raw 600 > 480 → factor 480/600 = 0.8 → 600*5*0.8 = 2400 (bukan 3000)
    await seedPresensi('2026-08-10', 1, [{ status: 'telat', durasiMangkir: 600 }]);
    expect(await getLaporanTotal()).toBe(2400);
  });

  it('menerapkan cap proporsional pada campuran mangkir + ringan dalam sehari', async () => {
    // raw mangkir 300 + ringan 300 = 600 > 480 → factor 480/600 = 0.8
    // (300*5 + 300*1) * 0.8 = 1440
    await seedPresensi('2026-08-10', 1, [
      { status: 'telat', durasiMangkir: 300 },
      { status: 'sakit', durasiMangkir: 300 },
    ]);
    expect(await getLaporanTotal()).toBe(1440);
  });

  it('menerapkan cap per-hari, bukan akumulasi lintas tanggal', async () => {
    await seedPresensi('2026-08-11', 1, [{ status: 'telat', durasiMangkir: 600 }]); // cap 480 → 2400
    await seedPresensi('2026-08-12', 2, [{ status: 'telat', durasiMangkir: 600 }]); // cap 480 → 2400
    expect(await getLaporanTotal()).toBe(4800);
  });

  it('detail mahasiswa konsisten dengan laporan saat cap diterapkan', async () => {
    await seedPresensi('2026-08-10', 1, [
      { status: 'telat', durasiMangkir: 300 },
      { status: 'sakit', durasiMangkir: 300 },
    ]);

    const laporanTotal = await getLaporanTotal();
    const res = await app.handle(
      new Request(`http://localhost/presensi/kompensasi/mahasiswa/${mhsId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const detail = await res.json();
    expect(detail.summary.totalKompensasi).toBe(laporanTotal);
    expect(detail.summary.totalKompensasi).toBe(1440);
    expect(detail.historyKompensasi).toBeArray();
    expect(detail.historyKompensasi.length).toBe(2);
    expect(detail.summary.sisaKompensasi).toBe(1440);
  });
});
