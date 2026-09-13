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
  periodeAkademik,
  programStudi,
} from '../models/schema';
import { db } from '../utils/db';
import { buildFinalScore, computeKomponenScore, resolveGradeFromRules } from '../utils/grade-calc';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Sub-Komponen Nilai — pure grade calculation', () => {
  it('computeKomponenScore menghitung weighted average sub dengan bobot sama rata', () => {
    const subDefs = [1, 2, 3, 4, 5].map((id) => ({ id, bobot: 20 }));
    const grades = new Map([1, 2, 3, 4, 5].map((id) => [id, 80]));
    const result = computeKomponenScore(grades, subDefs);
    expect(result.score).toBe(80);
    expect(result.complete).toBe(true);
  });

  it('computeKomponenScore menghitung bobot sub yang tidak sama rata', () => {
    const subDefs = [
      { id: 1, bobot: 60 },
      { id: 2, bobot: 40 },
    ];
    const grades = new Map([
      [1, 90],
      [2, 70],
    ]);
    const result = computeKomponenScore(grades, subDefs);
    expect(result.score).toBe(82);
    expect(result.complete).toBe(true);
  });

  it('computeKomponenScore menandai belum lengkap bila ada sub tanpa nilai', () => {
    const subDefs = [
      { id: 1, bobot: 50 },
      { id: 2, bobot: 50 },
    ];
    const grades = new Map([[1, 90]]);
    const result = computeKomponenScore(grades, subDefs);
    expect(result.complete).toBe(false);
  });

  it('buildFinalScore skenario 70/10/5/15 dengan sub-komponen menghasilkan NA benar', () => {
    const components = [
      { id: 1, bobot: 70 },
      { id: 2, bobot: 10 },
      { id: 3, bobot: 5 },
      { id: 4, bobot: 15 },
    ];
    const subDefsByKomponen = new Map([
      [1, [10, 11, 12, 13, 14].map((id) => ({ id, bobot: 20 }))],
      [
        2,
        [
          { id: 20, bobot: 60 },
          { id: 21, bobot: 40 },
        ],
      ],
      [
        3,
        [
          { id: 30, bobot: 50 },
          { id: 31, bobot: 50 },
        ],
      ],
      [
        4,
        [
          { id: 40, bobot: 40 },
          { id: 41, bobot: 35 },
          { id: 42, bobot: 25 },
        ],
      ],
    ]);
    const subGrades = new Map<number, number>([
      [10, 80],
      [11, 80],
      [12, 80],
      [13, 80],
      [14, 80],
      [20, 90],
      [21, 70],
      [30, 100],
      [31, 80],
      [40, 70],
      [41, 80],
      [42, 90],
    ]);

    const result = buildFinalScore(components, subDefsByKomponen, new Map(), subGrades);
    expect(result.registeredWeight).toBe(100);
    expect(result.isComplete).toBe(true);
    expect(result.finalScore).toBe(80.48);
  });

  it('buildFinalScore kompatibel mundur untuk komponen tanpa sub', () => {
    const components = [
      { id: 1, bobot: 40 },
      { id: 2, bobot: 60 },
    ];
    const directGrades = new Map([
      [1, 80],
      [2, 90],
    ]);
    const result = buildFinalScore(components, new Map(), directGrades, new Map());
    expect(result.finalScore).toBe(86);
    expect(result.registeredWeight).toBe(100);
    expect(result.isComplete).toBe(true);
  });

  it('buildFinalScore tidak lengkap bila salah satu komponen bersub belum terisi penuh', () => {
    const components = [
      { id: 1, bobot: 70 },
      { id: 2, bobot: 30 },
    ];
    const subDefsByKomponen = new Map([
      [
        1,
        [
          { id: 10, bobot: 50 },
          { id: 11, bobot: 50 },
        ],
      ],
    ]);
    const subGrades = new Map([[10, 90]]);
    const directGrades = new Map([[2, 80]]);
    const result = buildFinalScore(components, subDefsByKomponen, directGrades, subGrades);
    expect(result.registeredWeight).toBe(30);
    expect(result.isComplete).toBe(false);
  });

  it('resolveGradeFromRules memakai aturan lalu fallback statis', () => {
    const rules = [{ nilaiMin: 85, nilaiMax: 100, nilaiHuruf: 'A', bobotIndeks: 4.0 }];
    expect(resolveGradeFromRules(rules, 90)).toEqual({ huruf: 'A', indeks: 4.0 });
    expect(resolveGradeFromRules(rules, 70)).toEqual({ huruf: 'B', indeks: 3.0 });
  });
});

describe('Sub-Komponen Nilai — API', () => {
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
  });

  async function saveComponents(list: Array<{ nama: string; bobot: number }>) {
    const res = await app.handle(
      new Request('http://localhost/yudisium/kelas/komponen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosenToken}` },
        body: JSON.stringify({ kelasKuliahId: kelasId, komponenList: list }),
      }),
    );
    return (await res.json()) as Array<{ id: number; nama: string; bobot: number }>;
  }

  it('menyimpan sub-komponen dengan total bobot 100%', async () => {
    const comps = await saveComponents([{ nama: 'Kualitas', bobot: 100 }]);

    const res = await app.handle(
      new Request('http://localhost/yudisium/kelas/sub-komponen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosenToken}` },
        body: JSON.stringify({
          kelasKuliahId: kelasId,
          komponenNilaiId: comps[0].id,
          subKomponenList: [1, 2, 3, 4, 5].map((n) => ({ nama: `Pengambilan ${n}`, bobot: 20 })),
        }),
      }),
    );

    expect(res.status).toBe(200);
    const subs = await res.json();
    expect(subs.length).toBe(5);
    expect(subs[0].bobot).toBe(20);
  });

  it('menolak sub-komponen dengan total bobot bukan 100%', async () => {
    const comps = await saveComponents([{ nama: 'Kualitas', bobot: 100 }]);

    const res = await app.handle(
      new Request('http://localhost/yudisium/kelas/sub-komponen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosenToken}` },
        body: JSON.stringify({
          kelasKuliahId: kelasId,
          komponenNilaiId: comps[0].id,
          subKomponenList: [{ nama: 'A', bobot: 50 }],
        }),
      }),
    );

    expect(res.status).toBe(400);
  });

  it('menghitung NA dari nilai sub-komponen dan komponen tanpa sub', async () => {
    await db.insert(konversiNilai).values({
      programStudiId: null,
      nilaiHuruf: 'A',
      bobotIndeks: '4.00',
      nilaiMin: '80',
      nilaiMax: '100',
      predikat: 'Sangat Baik',
    });

    const comps = await saveComponents([
      { nama: 'Kualitas', bobot: 70 },
      { nama: 'Sikap', bobot: 30 },
    ]);
    const kualitasId = comps[0].id;
    const sikapId = comps[1].id;

    const subRes = await app.handle(
      new Request('http://localhost/yudisium/kelas/sub-komponen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosenToken}` },
        body: JSON.stringify({
          kelasKuliahId: kelasId,
          komponenNilaiId: kualitasId,
          subKomponenList: [1, 2, 3, 4, 5].map((n) => ({ nama: `Pengambilan ${n}`, bobot: 20 })),
        }),
      }),
    );
    const subs = (await subRes.json()) as Array<{ id: number }>;

    // Nilai sub Kualitas: semua 90 => 90
    const subNilaiRes = await app.handle(
      new Request('http://localhost/yudisium/kelas/nilai-sub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosenToken}` },
        body: JSON.stringify({
          kelasKuliahId: kelasId,
          nilaiSubList: [
            {
              krsId,
              subNilaiList: subs.map((s) => ({ subKomponenNilaiId: s.id, nilai: 90 })),
            },
          ],
        }),
      }),
    );
    expect(subNilaiRes.status).toBe(200);

    // Nilai langsung Sikap: 80
    await app.handle(
      new Request('http://localhost/yudisium/kelas/nilai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosenToken}` },
        body: JSON.stringify({
          kelasKuliahId: kelasId,
          nilaiList: [{ krsId, nilaiKomponenList: [{ komponenNilaiId: sikapId, nilai: 80 }] }],
        }),
      }),
    );

    const [finalKrs] = await db.select().from(krs).where(eq(krs.id, krsId));
    expect(parseFloat(finalKrs.nilaiAngka!)).toBe(87);
    expect(finalKrs.nilaiHuruf).toBe('A');
  });

  it('tidak menulis NA saat sub-komponen belum lengkap, lalu menulis setelah lengkap', async () => {
    const comps = await saveComponents([{ nama: 'Kualitas', bobot: 100 }]);
    const kualitasId = comps[0].id;

    const subRes = await app.handle(
      new Request('http://localhost/yudisium/kelas/sub-komponen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosenToken}` },
        body: JSON.stringify({
          kelasKuliahId: kelasId,
          komponenNilaiId: kualitasId,
          subKomponenList: [1, 2, 3, 4, 5].map((n) => ({ nama: `Pengambilan ${n}`, bobot: 20 })),
        }),
      }),
    );
    const subs = (await subRes.json()) as Array<{ id: number }>;

    await app.handle(
      new Request('http://localhost/yudisium/kelas/nilai-sub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosenToken}` },
        body: JSON.stringify({
          kelasKuliahId: kelasId,
          nilaiSubList: [
            { krsId, subNilaiList: subs.slice(0, 4).map((s) => ({ subKomponenNilaiId: s.id, nilai: 80 })) },
          ],
        }),
      }),
    );

    let [current] = await db.select().from(krs).where(eq(krs.id, krsId));
    expect(current.nilaiAngka).toBeNull();

    await app.handle(
      new Request('http://localhost/yudisium/kelas/nilai-sub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosenToken}` },
        body: JSON.stringify({
          kelasKuliahId: kelasId,
          nilaiSubList: [{ krsId, subNilaiList: subs.map((s) => ({ subKomponenNilaiId: s.id, nilai: 80 })) }],
        }),
      }),
    );

    [current] = await db.select().from(krs).where(eq(krs.id, krsId));
    expect(parseFloat(current.nilaiAngka!)).toBe(80);
  });

  it('GET nilai menyertakan nilaiSub dan GET sub-komponen mengembalikan definisi', async () => {
    const comps = await saveComponents([{ nama: 'Kualitas', bobot: 100 }]);
    const subRes = await app.handle(
      new Request('http://localhost/yudisium/kelas/sub-komponen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosenToken}` },
        body: JSON.stringify({
          kelasKuliahId: kelasId,
          komponenNilaiId: comps[0].id,
          subKomponenList: [
            { nama: 'A', bobot: 50 },
            { nama: 'B', bobot: 50 },
          ],
        }),
      }),
    );
    const subs = (await subRes.json()) as Array<{ id: number }>;

    const getSubRes = await app.handle(
      new Request(`http://localhost/yudisium/kelas/${kelasId}/sub-komponen`, {
        headers: { Authorization: `Bearer ${dosenToken}` },
      }),
    );
    expect(getSubRes.status).toBe(200);
    expect((await getSubRes.json()).length).toBe(2);

    await app.handle(
      new Request('http://localhost/yudisium/kelas/nilai-sub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosenToken}` },
        body: JSON.stringify({
          kelasKuliahId: kelasId,
          nilaiSubList: [
            {
              krsId,
              subNilaiList: [
                { subKomponenNilaiId: subs[0].id, nilai: 75 },
                { subKomponenNilaiId: subs[1].id, nilai: 85 },
              ],
            },
          ],
        }),
      }),
    );

    const getNilaiRes = await app.handle(
      new Request(`http://localhost/yudisium/kelas/${kelasId}/nilai`, {
        headers: { Authorization: `Bearer ${dosenToken}` },
      }),
    );
    const nilaiList = (await getNilaiRes.json()) as Array<{ nilaiSub: Array<{ nilai: string }> }>;
    expect(nilaiList[0].nilaiSub.length).toBe(2);
  });

  it('menolak perubahan sub-komponen pada kelas yang sudah dikunci', async () => {
    const comps = await saveComponents([{ nama: 'Kualitas', bobot: 100 }]);

    await app.handle(
      new Request(`http://localhost/yudisium/kelas/${kelasId}/lock`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${dosenToken}` },
      }),
    );

    const res = await app.handle(
      new Request('http://localhost/yudisium/kelas/sub-komponen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosenToken}` },
        body: JSON.stringify({
          kelasKuliahId: kelasId,
          komponenNilaiId: comps[0].id,
          subKomponenList: [{ nama: 'A', bobot: 100 }],
        }),
      }),
    );

    expect(res.status).toBe(400);
  });
});
