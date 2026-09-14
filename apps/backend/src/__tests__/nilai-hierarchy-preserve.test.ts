import { beforeEach, describe, expect, it } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { app } from '../app';
import {
  dosen,
  dosenPengajarKelas,
  kelasKuliah,
  komponenNilai,
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

describe('Hierarki nilai non-destruktif (preserve + recalc)', () => {
  let dosenToken: string;
  let prodiId: number;
  let kelasId: number;
  let krsId: number;
  const periodeId = '20231';

  beforeEach(async () => {
    await clearDatabase();

    dosenToken = await getAuthToken('dosen@test.com', 'dosen');

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

  const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${dosenToken}`,
  });

  async function saveComponents(list: Array<{ id?: number; nama: string; bobot: number }>) {
    const res = await app.handle(
      new Request('http://localhost/yudisium/kelas/komponen', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ kelasKuliahId: kelasId, komponenList: list }),
      }),
    );
    return { status: res.status, data: (await res.json()) as Array<{ id: number; nama: string; bobot: number }> };
  }

  async function saveSub(komponenNilaiId: number, list: Array<{ id?: number; nama: string; bobot: number }>) {
    const res = await app.handle(
      new Request('http://localhost/yudisium/kelas/sub-komponen', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ kelasKuliahId: kelasId, komponenNilaiId, subKomponenList: list }),
      }),
    );
    return { status: res.status, data: (await res.json()) as Array<{ id: number; nama: string; bobot: number }> };
  }

  const postNilaiSub = (pairs: Array<{ subKomponenNilaiId: number; nilai: number }>) =>
    app.handle(
      new Request('http://localhost/yudisium/kelas/nilai-sub', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ kelasKuliahId: kelasId, nilaiSubList: [{ krsId, subNilaiList: pairs }] }),
      }),
    );

  const postNilaiKomponen = (komponenNilaiId: number, nilai: number) =>
    app.handle(
      new Request('http://localhost/yudisium/kelas/nilai', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          kelasKuliahId: kelasId,
          nilaiList: [{ krsId, nilaiKomponenList: [{ komponenNilaiId, nilai }] }],
        }),
      }),
    );

  const postNilaiAkhir = (nilai: number) =>
    app.handle(
      new Request('http://localhost/yudisium/kelas/nilai-akhir', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ kelasKuliahId: kelasId, nilaiAkhirList: [{ krsId, nilai }] }),
      }),
    );

  const getKrs = async () => {
    const [row] = await db.select().from(krs).where(eq(krs.id, krsId));
    return row;
  };

  it('Req 1: edit nilai sub meng-update nilai komponen hingga nilai akhir', async () => {
    const comps = await saveComponents([{ nama: 'Kualitas', bobot: 100 }]);
    const subs = await saveSub(comps.data[0].id, [
      { nama: 'A', bobot: 50 },
      { nama: 'B', bobot: 50 },
    ]);

    const res = await postNilaiSub([
      { subKomponenNilaiId: subs.data[0].id, nilai: 90 },
      { subKomponenNilaiId: subs.data[1].id, nilai: 80 },
    ]);
    expect(res.status).toBe(200);

    expect(parseFloat((await getKrs()).nilaiAngka!)).toBe(85);
  });

  it('Req 2: override nilai komponen hanya meng-update nilai akhir, sub tetap ada', async () => {
    const comps = await saveComponents([{ nama: 'Kualitas', bobot: 100 }]);
    const subs = await saveSub(comps.data[0].id, [
      { nama: 'A', bobot: 50 },
      { nama: 'B', bobot: 50 },
    ]);
    await postNilaiSub([
      { subKomponenNilaiId: subs.data[0].id, nilai: 90 },
      { subKomponenNilaiId: subs.data[1].id, nilai: 80 },
    ]);

    const res = await postNilaiKomponen(comps.data[0].id, 70);
    expect(res.status).toBe(200);

    const subRows = await db.select().from(nilaiSubKomponenMahasiswa).where(eq(nilaiSubKomponenMahasiswa.krsId, krsId));
    expect(subRows.length).toBe(2);
    expect(parseFloat((await getKrs()).nilaiAngka!)).toBe(70);
  });

  it('Req 3: override nilai akhir tidak menghapus nilai komponen & sub', async () => {
    const comps = await saveComponents([{ nama: 'Kualitas', bobot: 100 }]);
    const subs = await saveSub(comps.data[0].id, [
      { nama: 'A', bobot: 50 },
      { nama: 'B', bobot: 50 },
    ]);
    await postNilaiSub([
      { subKomponenNilaiId: subs.data[0].id, nilai: 90 },
      { subKomponenNilaiId: subs.data[1].id, nilai: 80 },
    ]);
    await postNilaiKomponen(comps.data[0].id, 75);

    const res = await postNilaiAkhir(60);
    expect(res.status).toBe(200);

    const subRows = await db.select().from(nilaiSubKomponenMahasiswa).where(eq(nilaiSubKomponenMahasiswa.krsId, krsId));
    const directRows = await db.select().from(nilaiKomponenMahasiswa).where(eq(nilaiKomponenMahasiswa.krsId, krsId));
    expect(subRows.length).toBe(2);
    expect(directRows.length).toBe(1);
    expect(parseFloat((await getKrs()).nilaiAngka!)).toBe(60);
  });

  it('Req 4: ubah bobot komponen mempertahankan nilai & menghitung ulang NA', async () => {
    const comps = await saveComponents([
      { nama: 'UTS', bobot: 40 },
      { nama: 'UAS', bobot: 60 },
    ]);
    await postNilaiKomponen(comps.data[0].id, 80);
    await postNilaiKomponen(comps.data[1].id, 90);
    expect(parseFloat((await getKrs()).nilaiAngka!)).toBe(86);

    const res = await saveComponents([
      { id: comps.data[0].id, nama: 'UTS', bobot: 30 },
      { id: comps.data[1].id, nama: 'UAS', bobot: 70 },
    ]);
    expect(res.status).toBe(200);

    const directRows = await db.select().from(nilaiKomponenMahasiswa).where(eq(nilaiKomponenMahasiswa.krsId, krsId));
    expect(directRows.length).toBe(2);
    expect(parseFloat((await getKrs()).nilaiAngka!)).toBe(87);
  });

  it('Req 4: ubah bobot sub mempertahankan nilai sub & menghitung ulang NA', async () => {
    const comps = await saveComponents([{ nama: 'Kualitas', bobot: 100 }]);
    const subs = await saveSub(comps.data[0].id, [
      { nama: 'A', bobot: 50 },
      { nama: 'B', bobot: 50 },
    ]);
    await postNilaiSub([
      { subKomponenNilaiId: subs.data[0].id, nilai: 90 },
      { subKomponenNilaiId: subs.data[1].id, nilai: 80 },
    ]);
    expect(parseFloat((await getKrs()).nilaiAngka!)).toBe(85);

    const res = await saveSub(comps.data[0].id, [
      { id: subs.data[0].id, nama: 'A', bobot: 40 },
      { id: subs.data[1].id, nama: 'B', bobot: 60 },
    ]);
    expect(res.status).toBe(200);

    const subRows = await db.select().from(nilaiSubKomponenMahasiswa).where(eq(nilaiSubKomponenMahasiswa.krsId, krsId));
    expect(subRows.length).toBe(2);
    expect(parseFloat((await getKrs()).nilaiAngka!)).toBe(84);
  });

  it('bobot komponen invalid ditolak tanpa write parsial', async () => {
    const comps = await saveComponents([{ nama: 'UTS', bobot: 100 }]);
    await postNilaiKomponen(comps.data[0].id, 80);

    const res = await saveComponents([{ id: comps.data[0].id, nama: 'UTS', bobot: 90 }]);
    expect(res.status).toBe(400);

    const [comp] = await db
      .select()
      .from(komponenNilai)
      .where(and(eq(komponenNilai.id, comps.data[0].id), eq(komponenNilai.kelasKuliahId, kelasId)));
    expect(comp.bobot).toBe(100);

    const directRows = await db.select().from(nilaiKomponenMahasiswa).where(eq(nilaiKomponenMahasiswa.krsId, krsId));
    expect(directRows.length).toBe(1);
    expect(parseFloat((await getKrs()).nilaiAngka!)).toBe(80);
  });

  it('komponen yang dihapus dari komposisi tetap dibersihkan nilai levelnya', async () => {
    const comps = await saveComponents([
      { nama: 'UTS', bobot: 50 },
      { nama: 'UAS', bobot: 50 },
    ]);
    await postNilaiKomponen(comps.data[0].id, 80);
    await postNilaiKomponen(comps.data[1].id, 90);

    // Sisakan UTS saja (bobot 100) → UAS dihapus.
    const res = await saveComponents([{ id: comps.data[0].id, nama: 'UTS', bobot: 100 }]);
    expect(res.status).toBe(200);

    const remainingComps = await db.select().from(komponenNilai).where(eq(komponenNilai.kelasKuliahId, kelasId));
    expect(remainingComps.length).toBe(1);

    const directRows = await db.select().from(nilaiKomponenMahasiswa).where(eq(nilaiKomponenMahasiswa.krsId, krsId));
    expect(directRows.length).toBe(1);
    expect(parseFloat((await getKrs()).nilaiAngka!)).toBe(80);

    // Tidak ada sub yatim yang tertinggal.
    const subRows = await db
      .select()
      .from(subKomponenNilai)
      .where(eq(subKomponenNilai.komponenNilaiId, comps.data[1].id));
    expect(subRows.length).toBe(0);
  });

  it('nama komponen duplikat ditolak tanpa write parsial', async () => {
    const comps = await saveComponents([{ nama: 'UTS', bobot: 100 }]);
    await postNilaiKomponen(comps.data[0].id, 80);

    const res = await saveComponents([
      { nama: 'UTS', bobot: 50 },
      { nama: 'uts', bobot: 50 },
    ]);
    expect(res.status).toBe(400);

    const allComps = await db.select().from(komponenNilai).where(eq(komponenNilai.kelasKuliahId, kelasId));
    expect(allComps.length).toBe(1);
    expect(allComps[0].bobot).toBe(100);

    const directRows = await db.select().from(nilaiKomponenMahasiswa).where(eq(nilaiKomponenMahasiswa.krsId, krsId));
    expect(directRows.length).toBe(1);
    expect(parseFloat((await getKrs()).nilaiAngka!)).toBe(80);
  });

  it('nama sub-komponen duplikat ditolak tanpa write parsial', async () => {
    const comps = await saveComponents([{ nama: 'Kualitas', bobot: 100 }]);
    const subs = await saveSub(comps.data[0].id, [
      { nama: 'A', bobot: 50 },
      { nama: 'B', bobot: 50 },
    ]);
    await postNilaiSub([
      { subKomponenNilaiId: subs.data[0].id, nilai: 90 },
      { subKomponenNilaiId: subs.data[1].id, nilai: 80 },
    ]);

    const res = await saveSub(comps.data[0].id, [
      { nama: 'A', bobot: 40 },
      { nama: 'a', bobot: 60 },
    ]);
    expect(res.status).toBe(400);

    const allSubs = await db
      .select()
      .from(subKomponenNilai)
      .where(eq(subKomponenNilai.komponenNilaiId, comps.data[0].id));
    expect(allSubs.length).toBe(2);

    const subRows = await db.select().from(nilaiSubKomponenMahasiswa).where(eq(nilaiSubKomponenMahasiswa.krsId, krsId));
    expect(subRows.length).toBe(2);
    expect(parseFloat((await getKrs()).nilaiAngka!)).toBe(85);
  });
});
