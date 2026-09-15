import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { kelasKuliah, krs, mahasiswa, mataKuliah, periodeAkademik, programStudi } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

interface KrsRow {
  id: number;
  kelasKuliahId: number;
  kelasKuliah?: { periodeId: string | null } | null;
}

interface Paginated {
  data: KrsRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

describe('GET /krs — filter periode & program studi', () => {
  let adminToken: string;
  let prodiAId: number;
  let prodiBId: number;
  let kelasActiveId: number;
  let kelasOldId: number;
  const activePeriode = '20261';
  const oldPeriode = '20252';

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin_krs_filter@test.com', 'admin');

    const [prodiA] = await db
      .insert(programStudi)
      .values({ kode: `KRSA_${Date.now()}`, nama: 'Prodi KRS A', jenjang: 'D4' })
      .returning();
    const [prodiB] = await db
      .insert(programStudi)
      .values({ kode: `KRSB_${Date.now()}`, nama: 'Prodi KRS B', jenjang: 'D4' })
      .returning();
    prodiAId = prodiA.id;
    prodiBId = prodiB.id;

    await db.insert(periodeAkademik).values([
      { id: activePeriode, nama: 'Ganjil 2026/2027', aktif: true },
      { id: oldPeriode, nama: 'Genap 2025/2026', aktif: false },
    ]);

    const [mkA] = await db
      .insert(mataKuliah)
      .values({ kode: `MKKA_${Date.now()}`, nama: 'MK KRS A', sksTotal: 3, programStudiId: prodiAId })
      .returning();
    const [mkB] = await db
      .insert(mataKuliah)
      .values({ kode: `MKKB_${Date.now()}`, nama: 'MK KRS B', sksTotal: 3, programStudiId: prodiBId })
      .returning();

    const insertedKelas = await db
      .insert(kelasKuliah)
      .values([
        { mataKuliahId: mkA.id, periodeId: activePeriode, namaKelas: 'KRS-A-Active' },
        { mataKuliahId: mkB.id, periodeId: oldPeriode, namaKelas: 'KRS-B-Old' },
      ])
      .returning();
    kelasActiveId = insertedKelas[0].id;
    kelasOldId = insertedKelas[1].id;

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: `2026${String(Date.now()).slice(-5)}`,
        nama: 'Mahasiswa KRS Filter',
        email: `mhs_krs_filter_${Date.now()}@test.com`,
        programStudiId: prodiAId,
        status: 'aktif',
        namaIbuKandung: 'Ibu KRS',
        nik: `NIK${String(Date.now()).slice(-12)}`,
        jenisKelamin: 'L',
        tanggalLahir: '2000-01-01',
      })
      .returning();

    await db.insert(krs).values([
      { mahasiswaId: mhs.id, kelasKuliahId: kelasActiveId, isApproved: true },
      { mahasiswaId: mhs.id, kelasKuliahId: kelasOldId, isApproved: false },
    ]);
  });

  it('memfilter KRS berdasarkan periodeId', async () => {
    const res = await app.handle(
      new Request(`http://localhost/krs?periodeId=${activePeriode}&limit=50`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Paginated;
    expect(body.meta.total).toBe(1);
    expect(body.data[0].kelasKuliah?.periodeId).toBe(activePeriode);
  });

  it('memfilter KRS berdasarkan programStudiId', async () => {
    const res = await app.handle(
      new Request(`http://localhost/krs?programStudiId=${prodiBId}&limit=50`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Paginated;
    // Mahasiswa hanya terdaftar di prodi A, sehingga filter prodi B menghasilkan 0.
    expect(body.meta.total).toBe(0);
    expect(prodiAId).toBeGreaterThan(0);
  });

  it('memfilter KRS berdasarkan isApproved', async () => {
    const res = await app.handle(
      new Request('http://localhost/krs?isApproved=false&limit=50', {
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Paginated;
    expect(body.meta.total).toBe(1);
  });
});
