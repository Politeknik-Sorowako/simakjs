import { beforeEach, describe, expect, it } from 'bun:test';
import { and, eq } from 'drizzle-orm';
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
} from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Nilai Akhir Langsung (M1) & Multi-Metode Input', () => {
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

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${dosenToken}`,
  });

  async function saveComponents(list: Array<{ nama: string; bobot: number }>) {
    const res = await app.handle(
      new Request('http://localhost/yudisium/kelas/komponen', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ kelasKuliahId: kelasId, komponenList: list }),
      }),
    );
    return (await res.json()) as Array<{ id: number; nama: string; bobot: number }>;
  }

  async function saveSub(komponenNilaiId: number, list: Array<{ nama: string; bobot: number }>) {
    const res = await app.handle(
      new Request('http://localhost/yudisium/kelas/sub-komponen', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ kelasKuliahId: kelasId, komponenNilaiId, subKomponenList: list }),
      }),
    );
    return { status: res.status, data: (await res.json()) as Array<{ id: number; nama: string; bobot: number }> };
  }

  const postNilaiAkhir = (nilai: number) =>
    app.handle(
      new Request('http://localhost/yudisium/kelas/nilai-akhir', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ kelasKuliahId: kelasId, nilaiAkhirList: [{ krsId, nilai }] }),
      }),
    );

  it('M1 menulis NA beserta huruf & indeks sesuai aturan konversi', async () => {
    const res = await postNilaiAkhir(85);
    expect(res.status).toBe(200);

    const [finalKrs] = await db.select().from(krs).where(eq(krs.id, krsId));
    expect(parseFloat(finalKrs.nilaiAngka!)).toBe(85);
    expect(finalKrs.nilaiHuruf).toBe('A');
    expect(parseFloat(finalKrs.nilaiIndeks!)).toBe(4.0);
  });

  it('M1 mempertahankan nilai komponen & sub milik mahasiswa (non-destruktif)', async () => {
    const comps = await saveComponents([{ nama: 'Kualitas', bobot: 100 }]);
    const subResult = await saveSub(
      comps[0].id,
      [1, 2, 3, 4, 5].map((n) => ({ nama: `Pengambilan ${n}`, bobot: 20 })),
    );
    expect(subResult.status).toBe(200);

    await app.handle(
      new Request('http://localhost/yudisium/kelas/nilai-sub', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          kelasKuliahId: kelasId,
          nilaiSubList: [{ krsId, subNilaiList: subResult.data.map((s) => ({ subKomponenNilaiId: s.id, nilai: 90 })) }],
        }),
      }),
    );

    const beforeSub = await db
      .select()
      .from(nilaiSubKomponenMahasiswa)
      .where(eq(nilaiSubKomponenMahasiswa.krsId, krsId));
    expect(beforeSub.length).toBe(5);

    const res = await postNilaiAkhir(70);
    expect(res.status).toBe(200);

    const afterSub = await db
      .select()
      .from(nilaiSubKomponenMahasiswa)
      .where(eq(nilaiSubKomponenMahasiswa.krsId, krsId));
    const afterDirect = await db.select().from(nilaiKomponenMahasiswa).where(eq(nilaiKomponenMahasiswa.krsId, krsId));
    expect(afterSub.length).toBe(5);
    expect(afterDirect.length).toBe(0);

    const [finalKrs] = await db.select().from(krs).where(eq(krs.id, krsId));
    expect(parseFloat(finalKrs.nilaiAngka!)).toBe(70);
  });

  it('NA manual tetap utuh setelah lockKelas', async () => {
    await postNilaiAkhir(88);

    const lockRes = await app.handle(
      new Request(`http://localhost/yudisium/kelas/${kelasId}/lock`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${dosenToken}` },
      }),
    );
    expect(lockRes.status).toBe(200);

    const [finalKrs] = await db.select().from(krs).where(eq(krs.id, krsId));
    expect(parseFloat(finalKrs.nilaiAngka!)).toBe(88);
    expect(finalKrs.nilaiHuruf).toBe('A');
  });

  it('M1 ditolak saat kelas telah dikunci', async () => {
    await app.handle(
      new Request(`http://localhost/yudisium/kelas/${kelasId}/lock`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${dosenToken}` },
      }),
    );

    const res = await postNilaiAkhir(80);
    expect(res.status).toBe(400);
  });

  it('nilai di luar rentang 0-100 ditolak di ketiga endpoint', async () => {
    const comps = await saveComponents([{ nama: 'Tugas', bobot: 100 }]);
    const subResult = await saveSub(comps[0].id, [{ nama: 'Sub A', bobot: 100 }]);

    const akhirRes = await postNilaiAkhir(101);
    expect([400, 422]).toContain(akhirRes.status);

    const komponenRes = await app.handle(
      new Request('http://localhost/yudisium/kelas/nilai', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          kelasKuliahId: kelasId,
          nilaiList: [{ krsId, nilaiKomponenList: [{ komponenNilaiId: comps[0].id, nilai: -1 }] }],
        }),
      }),
    );
    expect([400, 422]).toContain(komponenRes.status);

    const subRes = await app.handle(
      new Request('http://localhost/yudisium/kelas/nilai-sub', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          kelasKuliahId: kelasId,
          nilaiSubList: [{ krsId, subNilaiList: [{ subKomponenNilaiId: subResult.data[0].id, nilai: 150 }] }],
        }),
      }),
    );
    expect([400, 422]).toContain(subRes.status);
  });

  it('M2 pada komponen bersub kini menimpa nilai langsung (definisi sub tetap)', async () => {
    const comps = await saveComponents([{ nama: 'Kualitas', bobot: 100 }]);
    await saveSub(comps[0].id, [
      { nama: 'A', bobot: 50 },
      { nama: 'B', bobot: 50 },
    ]);

    const res = await app.handle(
      new Request('http://localhost/yudisium/kelas/nilai', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          kelasKuliahId: kelasId,
          nilaiList: [{ krsId, nilaiKomponenList: [{ komponenNilaiId: comps[0].id, nilai: 80 }] }],
        }),
      }),
    );
    expect(res.status).toBe(200);

    const direct = await db
      .select()
      .from(nilaiKomponenMahasiswa)
      .where(and(eq(nilaiKomponenMahasiswa.krsId, krsId), eq(nilaiKomponenMahasiswa.komponenNilaiId, comps[0].id)));
    expect(direct.length).toBe(1);
    expect(parseFloat(direct[0].nilai)).toBe(80);

    const [finalKrs] = await db.select().from(krs).where(eq(krs.id, krsId));
    expect(parseFloat(finalKrs.nilaiAngka!)).toBe(80);
  });

  it('M2 tetap berfungsi untuk komponen tanpa sub dan menghitung NA', async () => {
    const comps = await saveComponents([
      { nama: 'UTS', bobot: 40 },
      { nama: 'UAS', bobot: 60 },
    ]);

    const res = await app.handle(
      new Request('http://localhost/yudisium/kelas/nilai', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          kelasKuliahId: kelasId,
          nilaiList: [
            {
              krsId,
              nilaiKomponenList: [
                { komponenNilaiId: comps[0].id, nilai: 80 },
                { komponenNilaiId: comps[1].id, nilai: 90 },
              ],
            },
          ],
        }),
      }),
    );
    expect(res.status).toBe(200);

    const [finalKrs] = await db.select().from(krs).where(eq(krs.id, krsId));
    expect(parseFloat(finalKrs.nilaiAngka!)).toBe(86);
    expect(finalKrs.nilaiHuruf).toBe('A');
  });

  describe('Dedupe & unique constraint', () => {
    it('M2 duplikat komponen dalam satu krs disimpan satu baris (entri terakhir menang)', async () => {
      const comps = await saveComponents([{ nama: 'Tugas', bobot: 100 }]);

      const res = await app.handle(
        new Request('http://localhost/yudisium/kelas/nilai', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            kelasKuliahId: kelasId,
            nilaiList: [
              {
                krsId,
                nilaiKomponenList: [
                  { komponenNilaiId: comps[0].id, nilai: 60 },
                  { komponenNilaiId: comps[0].id, nilai: 90 },
                ],
              },
            ],
          }),
        }),
      );
      expect(res.status).toBe(200);

      const rows = await db
        .select()
        .from(nilaiKomponenMahasiswa)
        .where(and(eq(nilaiKomponenMahasiswa.krsId, krsId), eq(nilaiKomponenMahasiswa.komponenNilaiId, comps[0].id)));
      expect(rows.length).toBe(1);
      expect(parseFloat(rows[0].nilai)).toBe(90);
    });

    it('M3 duplikat sub-komponen dalam satu krs disimpan satu baris (entitas terakhir menang)', async () => {
      const comps = await saveComponents([{ nama: 'Kualitas', bobot: 100 }]);
      const subResult = await saveSub(comps[0].id, [{ nama: 'Sub A', bobot: 100 }]);
      const subId = subResult.data[0].id;

      const res = await app.handle(
        new Request('http://localhost/yudisium/kelas/nilai-sub', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            kelasKuliahId: kelasId,
            nilaiSubList: [
              {
                krsId,
                subNilaiList: [
                  { subKomponenNilaiId: subId, nilai: 70 },
                  { subKomponenNilaiId: subId, nilai: 95 },
                ],
              },
            ],
          }),
        }),
      );
      expect(res.status).toBe(200);

      const rows = await db
        .select()
        .from(nilaiSubKomponenMahasiswa)
        .where(
          and(eq(nilaiSubKomponenMahasiswa.krsId, krsId), eq(nilaiSubKomponenMahasiswa.subKomponenNilaiId, subId)),
        );
      expect(rows.length).toBe(1);
      expect(parseFloat(rows[0].nilai)).toBe(95);
    });

    it('M1 duplikat krsId disimpan satu nilai (entri terakhir menang)', async () => {
      const res = await app.handle(
        new Request('http://localhost/yudisium/kelas/nilai-akhir', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            kelasKuliahId: kelasId,
            nilaiAkhirList: [
              { krsId, nilai: 70 },
              { krsId, nilai: 90 },
            ],
          }),
        }),
      );
      expect(res.status).toBe(200);

      const [finalKrs] = await db.select().from(krs).where(eq(krs.id, krsId));
      expect(parseFloat(finalKrs.nilaiAngka!)).toBe(90);
    });

    it('unique constraint (krsId, komponenNilaiId) mencegah baris ganda', async () => {
      const comps = await saveComponents([{ nama: 'Tugas', bobot: 100 }]);

      await db.insert(nilaiKomponenMahasiswa).values({
        krsId,
        komponenNilaiId: comps[0].id,
        nilai: '80',
      });

      let threw = false;
      try {
        await db.insert(nilaiKomponenMahasiswa).values({
          krsId,
          komponenNilaiId: comps[0].id,
          nilai: '90',
        });
      } catch {
        threw = true;
      }
      expect(threw).toBe(true);
    });
  });
});
