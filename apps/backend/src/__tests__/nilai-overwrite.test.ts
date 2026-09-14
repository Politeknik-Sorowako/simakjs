import { beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import {
  dosen,
  dosenPengajarKelas,
  kelasKuliah,
  konversiNilai,
  krs,
  mahasiswa,
  mataKuliah,
  nilaiKomponenMahasiswa,
  nilaiSubKomponenMahasiswa,
  periodeAkademik,
  programStudi,
  subKomponenNilai,
} from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Overwrite hierarki nilai & visibilitas mahasiswa', () => {
  let dosenToken: string;
  let mhsToken: string;
  let prodiId: number;
  let kelasId: number;
  let krsId: number;
  const periodeId = '20231';

  beforeEach(async () => {
    await clearDatabase();

    dosenToken = await getAuthToken('dosen@test.com', 'dosen');
    mhsToken = await getAuthToken('mhs@test.com', 'mahasiswa');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: 'TI', nama: 'Teknik Informatika', jenjang: 'D4' })
      .returning();
    prodiId = prodi.id;

    const [dsn] = await db
      .insert(dosen)
      .values({
        nidn: '12345678',
        nip: '123456789012345678',
        nama: 'Dosen Test',
        email: 'dosen@test.com',
        programStudiId: prodiId,
      })
      .returning();

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20200001',
        nama: 'Mahasiswa Test',
        email: 'mhs@test.com',
        programStudiId: prodiId,
        status: 'aktif',
        namaIbuKandung: 'Ibu Test',
        nik: '1234567890123456',
        jenisKelamin: 'L',
        tanggalLahir: '2000-01-01',
      })
      .returning();

    await db.insert(periodeAkademik).values({ id: periodeId, nama: 'Ganjil 2023/2024', aktif: true });

    const [mk] = await db
      .insert(mataKuliah)
      .values({ kode: 'MK001', nama: 'Pemrograman Web', sksTotal: 3, programStudiId: prodiId })
      .returning();

    const [kelas] = await db
      .insert(kelasKuliah)
      .values({ mataKuliahId: mk.id, periodeId, namaKelas: 'TI-3A' })
      .returning();
    kelasId = kelas.id;

    await db.insert(dosenPengajarKelas).values({
      dosenId: dsn.id,
      kelasKuliahId: kelasId,
      rencanaTatapMuka: 16,
      realisasiTatapMuka: 0,
      jenisEvaluasi: 'UTS',
    });

    const [krsRecord] = await db
      .insert(krs)
      .values({ mahasiswaId: mhs.id, kelasKuliahId: kelasId, isApproved: true })
      .returning();
    krsId = krsRecord.id;

    await db.insert(konversiNilai).values({
      programStudiId: null,
      nilaiHuruf: 'A',
      bobotIndeks: '4.00',
      nilaiMin: '80',
      nilaiMax: '100',
      predikat: 'Sangat Baik',
    });
  });

  const dosenHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${dosenToken}`,
  });

  async function saveComponents(list: Array<{ nama: string; bobot: number }>) {
    const res = await app.handle(
      new Request('http://localhost/yudisium/kelas/komponen', {
        method: 'POST',
        headers: dosenHeaders(),
        body: JSON.stringify({ kelasKuliahId: kelasId, komponenList: list }),
      }),
    );
    return (await res.json()) as Array<{ id: number; nama: string; bobot: number }>;
  }

  async function saveSub(komponenNilaiId: number, list: Array<{ nama: string; bobot: number }>) {
    const res = await app.handle(
      new Request('http://localhost/yudisium/kelas/sub-komponen', {
        method: 'POST',
        headers: dosenHeaders(),
        body: JSON.stringify({ kelasKuliahId: kelasId, komponenNilaiId, subKomponenList: list }),
      }),
    );
    return (await res.json()) as Array<{ id: number; nama: string; bobot: number }>;
  }

  const postNilaiSub = (subs: Array<{ id: number }>, a: number, b: number) =>
    app.handle(
      new Request('http://localhost/yudisium/kelas/nilai-sub', {
        method: 'POST',
        headers: dosenHeaders(),
        body: JSON.stringify({
          kelasKuliahId: kelasId,
          nilaiSubList: [
            {
              krsId,
              subNilaiList: [
                { subKomponenNilaiId: subs[0].id, nilai: a },
                { subKomponenNilaiId: subs[1].id, nilai: b },
              ],
            },
          ],
        }),
      }),
    );

  const postNilaiKomponen = (komponenNilaiId: number, nilai: number) =>
    app.handle(
      new Request('http://localhost/yudisium/kelas/nilai', {
        method: 'POST',
        headers: dosenHeaders(),
        body: JSON.stringify({
          kelasKuliahId: kelasId,
          nilaiList: [{ krsId, nilaiKomponenList: [{ komponenNilaiId, nilai }] }],
        }),
      }),
    );

  it('M2 menimpa komponen bersub: nilai sub terhapus, definisi tetap, NA dari nilai langsung', async () => {
    const comps = await saveComponents([{ nama: 'Kualitas', bobot: 100 }]);
    const subs = await saveSub(comps[0].id, [
      { nama: 'A', bobot: 50 },
      { nama: 'B', bobot: 50 },
    ]);
    await postNilaiSub(subs, 90, 80);

    const [before] = await db.select().from(krs).where(eq(krs.id, krsId));
    expect(parseFloat(before.nilaiAngka!)).toBe(85);

    const res = await postNilaiKomponen(comps[0].id, 70);
    expect(res.status).toBe(200);

    const [after] = await db.select().from(krs).where(eq(krs.id, krsId));
    expect(parseFloat(after.nilaiAngka!)).toBe(70);

    const subRows = await db.select().from(nilaiSubKomponenMahasiswa).where(eq(nilaiSubKomponenMahasiswa.krsId, krsId));
    expect(subRows.length).toBe(0);

    const directRows = await db.select().from(nilaiKomponenMahasiswa).where(eq(nilaiKomponenMahasiswa.krsId, krsId));
    expect(directRows.length).toBe(1);
    expect(parseFloat(directRows[0].nilai)).toBe(70);

    const defs = await db.select().from(subKomponenNilai).where(eq(subKomponenNilai.komponenNilaiId, comps[0].id));
    expect(defs.length).toBe(2);
  });

  it('M3 menimpa nilai langsung: nilai komponen terhapus, NA dari agregasi sub', async () => {
    const comps = await saveComponents([{ nama: 'Kualitas', bobot: 100 }]);
    await postNilaiKomponen(comps[0].id, 70);

    const subs = await saveSub(comps[0].id, [
      { nama: 'A', bobot: 50 },
      { nama: 'B', bobot: 50 },
    ]);
    const res = await postNilaiSub(subs, 90, 80);
    expect(res.status).toBe(200);

    const directRows = await db.select().from(nilaiKomponenMahasiswa).where(eq(nilaiKomponenMahasiswa.krsId, krsId));
    expect(directRows.length).toBe(0);

    const [after] = await db.select().from(krs).where(eq(krs.id, krsId));
    expect(parseFloat(after.nilaiAngka!)).toBe(85);
  });

  it('bolak-balik M2 <-> M3 konsisten pada NA', async () => {
    const comps = await saveComponents([{ nama: 'Kualitas', bobot: 100 }]);
    const subs = await saveSub(comps[0].id, [
      { nama: 'A', bobot: 50 },
      { nama: 'B', bobot: 50 },
    ]);

    await postNilaiSub(subs, 90, 80);
    let [k] = await db.select().from(krs).where(eq(krs.id, krsId));
    expect(parseFloat(k.nilaiAngka!)).toBe(85);

    await postNilaiKomponen(comps[0].id, 60);
    [k] = await db.select().from(krs).where(eq(krs.id, krsId));
    expect(parseFloat(k.nilaiAngka!)).toBe(60);

    await postNilaiSub(subs, 70, 90);
    [k] = await db.select().from(krs).where(eq(krs.id, krsId));
    expect(parseFloat(k.nilaiAngka!)).toBe(80);
  });

  it('mahasiswa GET rincian komponen: ada komponen, tanpa field/nilai sub', async () => {
    const comps = await saveComponents([{ nama: 'Kualitas', bobot: 100 }]);
    const subs = await saveSub(comps[0].id, [
      { nama: 'A', bobot: 50 },
      { nama: 'B', bobot: 50 },
    ]);
    await postNilaiSub(subs, 90, 80);

    const res = await app.handle(
      new Request(`http://localhost/khs/rincian-komponen?kelasKuliahId=${kelasId}`, {
        headers: { Authorization: `Bearer ${mhsToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      krsId: number;
      nilaiAngka: string | null;
      komponen: Array<Record<string, unknown>>;
      nilaiSub?: unknown;
    };
    expect(body.krsId).toBe(krsId);
    expect(parseFloat(body.nilaiAngka!)).toBe(85);
    expect(body.komponen.length).toBe(1);
    expect(body.komponen[0].nama).toBe('Kualitas');
    expect(parseFloat(String(body.komponen[0].nilai))).toBe(85);
    // Tidak ada field sub sama sekali
    expect(body.nilaiSub).toBeUndefined();
    expect(body.komponen[0].sub).toBeUndefined();
    expect(body.komponen[0].nilaiSub).toBeUndefined();
  });

  it('rincian menampilkan nilai langsung setelah M2 menimpa komponen bersub', async () => {
    const comps = await saveComponents([{ nama: 'Kualitas', bobot: 100 }]);
    const subs = await saveSub(comps[0].id, [
      { nama: 'A', bobot: 50 },
      { nama: 'B', bobot: 50 },
    ]);
    await postNilaiSub(subs, 90, 80);
    await postNilaiKomponen(comps[0].id, 70);

    const res = await app.handle(
      new Request(`http://localhost/khs/rincian-komponen?kelasKuliahId=${kelasId}`, {
        headers: { Authorization: `Bearer ${mhsToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      nilaiAngka: string | null;
      komponen: Array<{ nama: string; nilai: number | null }>;
    };
    expect(parseFloat(body.nilaiAngka!)).toBe(70);
    expect(body.komponen[0].nilai).toBe(70);
  });

  it('mahasiswa tidak bisa melihat rincian mahasiswa lain (dipaksa ke data sendiri)', async () => {
    const comps = await saveComponents([{ nama: 'Kualitas', bobot: 100 }]);
    await postNilaiKomponen(comps[0].id, 70);

    const [other] = await db
      .insert(mahasiswa)
      .values({
        nim: '20200002',
        nama: 'Mahasiswa Lain',
        email: 'lain@test.com',
        programStudiId: prodiId,
        status: 'aktif',
        namaIbuKandung: 'Ibu Lain',
        nik: '1234567890123457',
        jenisKelamin: 'L',
        tanggalLahir: '2000-01-02',
      })
      .returning();
    const [otherKrs] = await db
      .insert(krs)
      .values({ mahasiswaId: other.id, kelasKuliahId: kelasId, isApproved: true })
      .returning();

    const res = await app.handle(
      new Request(`http://localhost/khs/rincian-komponen?kelasKuliahId=${kelasId}&mahasiswaId=${other.id}`, {
        headers: { Authorization: `Bearer ${mhsToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { krsId: number };
    expect(body.krsId).toBe(krsId);
    expect(body.krsId).not.toBe(otherKrs.id);
  });
});
