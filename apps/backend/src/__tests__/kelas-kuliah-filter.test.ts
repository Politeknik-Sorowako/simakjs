import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { kelasKuliah, mataKuliah, periodeAkademik, programStudi } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

interface KelasRow {
  id: number;
  periodeId: string;
  mataKuliah?: { programStudiId: number | null } | null;
}

interface Paginated {
  data: KelasRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

describe('GET /kelas-kuliah — filter periode & program studi (R1)', () => {
  let adminToken: string;
  let prodiAId: number;
  let prodiBId: number;
  let kelasAActiveId: number;
  let kelasBActiveId: number;
  const activePeriode = '20261';
  const oldPeriode = '20252';

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin_kelas_filter@test.com', 'admin');

    const [prodiA] = await db
      .insert(programStudi)
      .values({ kode: `KFA_${Date.now()}`, nama: 'Prodi A', jenjang: 'D4' })
      .returning();
    const [prodiB] = await db
      .insert(programStudi)
      .values({ kode: `KFB_${Date.now()}`, nama: 'Prodi B', jenjang: 'D4' })
      .returning();
    prodiAId = prodiA.id;
    prodiBId = prodiB.id;

    await db.insert(periodeAkademik).values([
      { id: activePeriode, nama: 'Ganjil 2026/2027', aktif: true },
      { id: oldPeriode, nama: 'Genap 2025/2026', aktif: false },
    ]);

    const [mkA] = await db
      .insert(mataKuliah)
      .values({ kode: `MKFA_${Date.now()}`, nama: 'MK Prodi A', sksTotal: 3, programStudiId: prodiAId })
      .returning();
    const [mkB] = await db
      .insert(mataKuliah)
      .values({ kode: `MKFB_${Date.now()}`, nama: 'MK Prodi B', sksTotal: 3, programStudiId: prodiBId })
      .returning();

    const inserted = await db
      .insert(kelasKuliah)
      .values([
        { mataKuliahId: mkA.id, periodeId: activePeriode, namaKelas: 'A-Active' },
        { mataKuliahId: mkA.id, periodeId: oldPeriode, namaKelas: 'A-Old' },
        { mataKuliahId: mkB.id, periodeId: activePeriode, namaKelas: 'B-Active' },
      ])
      .returning();
    kelasAActiveId = inserted.find((k) => k.namaKelas === 'A-Active')!.id;
    kelasBActiveId = inserted.find((k) => k.namaKelas === 'B-Active')!.id;
  });

  const fetchKelas = async (query: string): Promise<Paginated> => {
    const res = await app.handle(
      new Request(`http://localhost/kelas-kuliah${query}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(200);
    return (await res.json()) as Paginated;
  };

  it('filter periodeId + programStudiId hanya mengembalikan kelas yang cocok', async () => {
    const body = await fetchKelas(`?periodeId=${activePeriode}&programStudiId=${prodiAId}&limit=100`);
    expect(body.data.length).toBe(1);
    expect(body.data[0].id).toBe(kelasAActiveId);
    expect(body.data[0].periodeId).toBe(activePeriode);
  });

  it('filter periodeId mengembalikan seluruh kelas periode aktif lintas prodi', async () => {
    const body = await fetchKelas(`?periodeId=${activePeriode}&limit=100`);
    expect(body.data.length).toBe(2);
    expect(body.data.every((k) => k.periodeId === activePeriode)).toBe(true);
  });

  it('filter programStudiId saja tidak memotong kelas prodi tersebut', async () => {
    const body = await fetchKelas(`?programStudiId=${prodiBId}&limit=100`);
    expect(body.data.length).toBe(1);
    expect(body.data[0].id).toBe(kelasBActiveId);
  });

  it('meta.total konsisten dengan jumlah data yang dikembalikan', async () => {
    const body = await fetchKelas(`?periodeId=${activePeriode}&limit=100`);
    expect(body.meta.total).toBe(body.data.length);
    expect(body.meta.totalPages).toBe(1);
  });
});
