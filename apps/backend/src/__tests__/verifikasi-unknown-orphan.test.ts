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

describe('Self-healing Verifikasi Unknown saat baris ketidakhadiran hilang (orphan)', () => {
  let adminToken: string;
  let mhsId: number;
  let kelasId: number;
  let dosenId: number;

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin-orphan@test.com', 'admin');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: 'ORP', nama: 'Prodi Orphan Test', jenjang: 'D4' })
      .returning();

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '22501057',
        nama: 'Nabilah Rihdatul Aisya',
        email: 'nabilah@test.com',
        programStudiId: prodi.id,
        jenisKelamin: 'P',
        tanggalLahir: '2004-01-01',
      })
      .returning();
    mhsId = mhs.id;

    const [dsn] = await db
      .insert(dosen)
      .values({
        nip: '198801012015011002',
        nama: 'Jasman, S.S.T., M.M.',
        email: 'jasman-orphan@test.com',
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
      .values({ mataKuliahId: matkul.id, periodeId: '20261', namaKelas: '3037PM1T-2A' })
      .returning();
    kelasId = kelas.id;
  });

  it('membentuk ulang baris ketidakhadiran yang hilang lalu berhasil dianulir (durasi 0)', async () => {
    const [bapRow] = await db
      .insert(bap)
      .values({
        kelasKuliahId: kelasId,
        tanggal: '2026-08-31',
        pertemuanKe: 9,
        materi: 'P9: Evaluasi dan Kesimpulan hasil SCL',
        durasiMenit: 100,
        dosenId,
      })
      .returning();

    // Presensi UNKNOWN ada, tetapi TIDAK ada baris pasangan di ketidakhadiran_mahasiswa (orphan).
    const [p] = await db
      .insert(presensi)
      .values({ bapId: bapRow.id, mahasiswaId: mhsId, status: 'unknown', durasiMangkir: 100 })
      .returning();

    const before = await db
      .select()
      .from(ketidakhadiranMahasiswa)
      .where(and(eq(ketidakhadiranMahasiswa.sumber, 'BAP'), eq(ketidakhadiranMahasiswa.sumberId, p.id)));
    expect(before.length).toBe(0);

    const res = await app.handle(
      new Request('http://localhost/ketidakhadiran/verifikasi-unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          sumber: 'BAP',
          sumberId: p.id,
          statusKonfirmasi: 'SAKIT',
          durasiMenit: 0,
          keterangan: 'Sakit',
        }),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('SAKIT');
    expect(body.durasiMenit).toBe(0);
    expect(body.isVerified).toBe(true);
    expect(body.mahasiswaId).toBe(mhsId);
    expect(body.tanggal).toBe('2026-08-31');

    // Baris terpusat berhasil dibentuk ulang dan tersimpan terverifikasi.
    const [abs] = await db
      .select()
      .from(ketidakhadiranMahasiswa)
      .where(and(eq(ketidakhadiranMahasiswa.sumber, 'BAP'), eq(ketidakhadiranMahasiswa.sumberId, p.id)));
    expect(abs).toBeTruthy();
    expect(abs.status).toBe('SAKIT');
    expect(abs.durasiMenit).toBe(0);
    expect(abs.isVerified).toBe(true);

    const [source] = await db.select().from(presensi).where(eq(presensi.id, p.id));
    expect(source.status).toBe('sakit');
    expect(source.durasiMangkir).toBe(0);
  });

  it('mengembalikan 404 diagnostik bila sumber presensi juga tidak ada', async () => {
    const res = await app.handle(
      new Request('http://localhost/ketidakhadiran/verifikasi-unknown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          sumber: 'BAP',
          sumberId: 999999,
          statusKonfirmasi: 'SAKIT',
          durasiMenit: 0,
          keterangan: 'Sakit',
        }),
      }),
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('tidak ditemukan');
  });
});
