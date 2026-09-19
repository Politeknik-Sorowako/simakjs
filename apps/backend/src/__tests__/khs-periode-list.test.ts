import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { kelasKuliah, krs, mahasiswa, mataKuliah, periodeAkademik, programStudi } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('KHS Periode List (filter periode per mahasiswa)', () => {
  let adminToken: string;
  let mhsToken: string;
  let mhsId: number;
  const periodeA = '20241';
  const periodeB = '20251';

  beforeEach(async () => {
    await clearDatabase();

    adminToken = await getAuthToken('admin_khsper@test.com', 'admin');
    mhsToken = await getAuthToken('mhs_khsper@test.com', 'mahasiswa');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: `KSP_${Date.now()}`, nama: 'Teknik Elektro', jenjang: 'D4' })
      .returning();

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20250088',
        nama: 'Mahasiswa KHS Periode',
        email: 'mhs_khsper@test.com',
        programStudiId: prodi.id,
        status: 'aktif',
        namaIbuKandung: 'Ibu KSP',
        nik: '1234567890123588',
        jenisKelamin: 'L',
        tanggalLahir: '2003-01-01',
      })
      .returning();
    mhsId = mhs.id;

    await db.insert(periodeAkademik).values([
      { id: periodeA, nama: 'Ganjil 2024/2025', aktif: false },
      { id: periodeB, nama: 'Genap 2025', aktif: true },
    ]);

    // Mahasiswa mengikuti kelas pada periode A dan B.
    for (const pid of [periodeA, periodeB]) {
      const [mk] = await db
        .insert(mataKuliah)
        .values({ programStudiId: prodi.id, kode: `MKP_${pid}_${Date.now()}`, nama: `MK ${pid}`, sksTotal: 3 })
        .returning();
      const [kelas] = await db
        .insert(kelasKuliah)
        .values({ mataKuliahId: mk.id, periodeId: pid, namaKelas: 'A' })
        .returning();
      await db.insert(krs).values({ mahasiswaId: mhsId, kelasKuliahId: kelas.id, isApproved: true });
    }
  });

  it('staff dapat melihat periode distinct yang diikuti mahasiswa', async () => {
    const res = await app.handle(
      new Request(`http://localhost/khs/mahasiswa/${mhsId}/periode-list`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; aktif: boolean }[] };
    const ids = body.data.map((p) => p.id).sort();
    expect(ids).toEqual([periodeA, periodeB].sort());
    const aktif = body.data.find((p) => p.id === periodeB);
    expect(aktif?.aktif).toBe(true);
  });

  it('mahasiswa hanya dapat melihat daftar periode miliknya sendiri', async () => {
    const res = await app.handle(
      new Request(`http://localhost/khs/mahasiswa/${mhsId}/periode-list`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${mhsToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string }[] };
    expect(body.data).toHaveLength(2);
  });

  it('mahasiswa ditolak akses periode-list milik mahasiswa lain (403)', async () => {
    const [other] = await db
      .insert(mahasiswa)
      .values({
        nim: '20250089',
        nama: 'Lain',
        email: 'lain_khsper@test.com',
        programStudiId: null,
        status: 'aktif',
        namaIbuKandung: 'Ibu Lain',
        nik: '1234567890123589',
        jenisKelamin: 'P',
        tanggalLahir: '2003-01-01',
      })
      .returning();
    const res = await app.handle(
      new Request(`http://localhost/khs/mahasiswa/${other.id}/periode-list`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${mhsToken}` },
      }),
    );
    expect(res.status).toBe(403);
  });
});
