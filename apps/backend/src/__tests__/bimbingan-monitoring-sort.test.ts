import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { bimbingan, dosen, mahasiswa, periodeAkademik, programStudi, sesiBimbingan } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

interface MonitoringRow {
  mahasiswaId: number;
  nim: string;
  namaMahasiswa: string;
  prodiId: number | null;
  prodiNama: string | null;
  dosenPaNama: string;
  totalSesi: number;
}

interface Paginated {
  data: MonitoringRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const PERIODE = '20261';

describe('GET /bimbingan/monitoring-lengkap — filter prodi & sorting', () => {
  let adminToken: string;
  let prodiAId: number;
  let prodiBId: number;
  let dosenAId: number;
  let dosenBId: number;
  const ids: Record<string, number> = {};

  const fetchMonitoring = async (query: string) => {
    const res = await app.handle(
      new Request(`http://localhost/bimbingan/monitoring-lengkap?${query}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(200);
    return (await res.json()) as Paginated;
  };

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin_monitoring_sort@test.com', 'admin');

    const [prodiA] = await db
      .insert(programStudi)
      .values({ kode: `MBA_${Date.now()}`, nama: 'Prodi Monitoring A', jenjang: 'D4' })
      .returning();
    const [prodiB] = await db
      .insert(programStudi)
      .values({ kode: `MBB_${Date.now()}`, nama: 'Prodi Monitoring B', jenjang: 'D4' })
      .returning();
    prodiAId = prodiA.id;
    prodiBId = prodiB.id;

    await db.insert(periodeAkademik).values({ id: PERIODE, nama: 'Ganjil 2026/2027', aktif: true });

    const [dosenA] = await db
      .insert(dosen)
      .values({ nip: `DA_${Date.now()}`, nama: 'Ahmad Dosen', email: `dosen_a_${Date.now()}@test.com` })
      .returning();
    const [dosenB] = await db
      .insert(dosen)
      .values({ nip: `DB_${Date.now()}`, nama: 'Bambang Dosen', email: `dosen_b_${Date.now()}@test.com` })
      .returning();
    dosenAId = dosenA.id;
    dosenBId = dosenB.id;

    const seed = [
      { key: 'm1', nim: '2600001', nama: 'Andi Pratama', prodi: prodiAId, dosen: dosenAId, sesi: 0 },
      { key: 'm2', nim: '2600002', nama: 'Budi Santoso', prodi: prodiAId, dosen: dosenBId, sesi: 2 },
      { key: 'm3', nim: '2600003', nama: 'Cici Lestari', prodi: prodiBId, dosen: dosenAId, sesi: 5 },
      { key: 'm4', nim: '2600004', nama: 'Dedi Kurniawan', prodi: prodiBId, dosen: dosenBId, sesi: 1 },
    ];

    const now = Date.now();
    for (const s of seed) {
      const [mhs] = await db
        .insert(mahasiswa)
        .values({
          nim: s.nim,
          nama: s.nama,
          email: `${s.nim}_${now}@test.com`,
          programStudiId: s.prodi,
          dosenPaId: s.dosen,
          status: 'aktif',
          namaIbuKandung: 'Ibu Monitoring',
          nik: `NIK${s.nim}`,
          jenisKelamin: 'L',
          tanggalLahir: '2000-01-01',
        })
        .returning();
      ids[s.key] = mhs.id;

      const [bimb] = await db
        .insert(bimbingan)
        .values({ mahasiswaId: mhs.id, dosenId: s.dosen, periodeId: PERIODE, isApproved: true })
        .returning();

      if (s.sesi > 0) {
        await db.insert(sesiBimbingan).values(
          Array.from({ length: s.sesi }, (_, i) => ({
            bimbinganId: bimb.id,
            pertemuanKe: i + 1,
            tanggalBimbingan: '2026-09-01',
            solusi: `Solusi pertemuan ${i + 1}`,
          })),
        );
      }
    }
  });

  it('menyertakan prodiNama (prodi mahasiswa) pada setiap baris', async () => {
    const body = await fetchMonitoring('limit=50');
    expect(body.data.length).toBe(4);
    const row = body.data.find((r) => r.nim === '2600003');
    expect(row?.prodiNama).toBe('Prodi Monitoring B');
  });

  it('memfilter berdasarkan prodiId', async () => {
    const body = await fetchMonitoring(`prodiId=${prodiAId}&limit=50`);
    expect(body.meta.total).toBe(2);
    expect(body.data.every((r) => r.prodiId === prodiAId)).toBe(true);
  });

  it('mengurutkan berdasarkan nim asc/desc', async () => {
    const asc = await fetchMonitoring('sortBy=nim&sortOrder=asc&limit=50');
    expect(asc.data.map((r) => r.nim)).toEqual(['2600001', '2600002', '2600003', '2600004']);

    const desc = await fetchMonitoring('sortBy=nim&sortOrder=desc&limit=50');
    expect(desc.data.map((r) => r.nim)).toEqual(['2600004', '2600003', '2600002', '2600001']);
  });

  it('mengurutkan berdasarkan nama dan dosenPa', async () => {
    const nama = await fetchMonitoring('sortBy=nama&sortOrder=asc&limit=50');
    expect(nama.data.map((r) => r.namaMahasiswa)).toEqual([
      'Andi Pratama',
      'Budi Santoso',
      'Cici Lestari',
      'Dedi Kurniawan',
    ]);

    const dosen = await fetchMonitoring('sortBy=dosenPa&sortOrder=asc&limit=50');
    expect(dosen.data.map((r) => r.dosenPaNama)).toEqual([
      'Ahmad Dosen',
      'Ahmad Dosen',
      'Bambang Dosen',
      'Bambang Dosen',
    ]);
  });

  it('mengurutkan berdasarkan prodi', async () => {
    const body = await fetchMonitoring('sortBy=prodi&sortOrder=asc&limit=50');
    expect(body.data.slice(0, 2).every((r) => r.prodiNama === 'Prodi Monitoring A')).toBe(true);
    expect(body.data.slice(2).every((r) => r.prodiNama === 'Prodi Monitoring B')).toBe(true);
  });

  it('mengurutkan totalSesi secara global lintas halaman (desc)', async () => {
    const page1 = await fetchMonitoring('sortBy=totalSesi&sortOrder=desc&limit=2&page=1');
    const page2 = await fetchMonitoring('sortBy=totalSesi&sortOrder=desc&limit=2&page=2');

    expect(page1.data.map((r) => r.nim)).toEqual(['2600003', '2600002']);
    expect(page2.data.map((r) => r.nim)).toEqual(['2600004', '2600001']);
    expect(page1.meta.total).toBe(4);
    expect(page1.meta.totalPages).toBe(2);
  });

  it('mengurutkan totalSesi asc', async () => {
    const body = await fetchMonitoring('sortBy=totalSesi&sortOrder=asc&limit=50');
    expect(body.data.map((r) => r.totalSesi)).toEqual([0, 1, 2, 5]);
  });

  it('mengabaikan sortBy yang tidak dikenal (fallback tanpa error)', async () => {
    const body = await fetchMonitoring('sortBy=tidakAda&sortOrder=desc&limit=50');
    expect(body.data.length).toBe(4);
    expect(body.meta.total).toBe(4);
  });

  it('konsisten antara filter prodi, search, dan sorting', async () => {
    const body = await fetchMonitoring(`prodiId=${prodiBId}&search=Dedi&sortBy=totalSesi&sortOrder=desc&limit=50`);
    expect(body.meta.total).toBe(1);
    expect(body.data[0].nim).toBe('2600004');
  });
});
