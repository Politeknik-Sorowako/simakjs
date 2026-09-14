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
  periodeAkademik,
  programStudi,
} from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Nilai Awal Selektif (subset mahasiswa) — M1 & M2', () => {
  let dosenToken: string;
  let prodiId: number;
  let mkId: number;
  let kelasId: number;
  let krsIds: number[];
  let mahasiswaIds: number[];

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

    await db.insert(periodeAkademik).values({ id: periodeId, nama: 'Ganjil 2023/2024', aktif: true });

    const [mk] = await db
      .insert(mataKuliah)
      .values({ kode: 'MK001', nama: 'Pemrograman Web', sksTotal: 3, programStudiId: prodiId })
      .returning();
    mkId = mk.id;

    const [kelas] = await db
      .insert(kelasKuliah)
      .values({ mataKuliahId: mkId, periodeId, namaKelas: 'TI-3A' })
      .returning();
    kelasId = kelas.id;

    await db.insert(dosenPengajarKelas).values({
      dosenId: dsn.id,
      kelasKuliahId: kelasId,
      rencanaTatapMuka: 16,
      realisasiTatapMuka: 0,
      jenisEvaluasi: 'UTS',
    });

    krsIds = [];
    mahasiswaIds = [];
    for (let i = 1; i <= 5; i++) {
      const [mhs] = await db
        .insert(mahasiswa)
        .values({
          nim: `2020000${i}`,
          nama: `Mahasiswa ${i}`,
          email: `mhs${i}@test.com`,
          programStudiId: prodiId,
          status: 'aktif',
          namaIbuKandung: 'Ibu Test',
          nik: `123456789012345${i}`,
          jenisKelamin: 'L',
          tanggalLahir: '2000-01-01',
        })
        .returning();
      mahasiswaIds.push(mhs.id);
      const [krsRecord] = await db
        .insert(krs)
        .values({ mahasiswaId: mhs.id, kelasKuliahId: kelasId, isApproved: true })
        .returning();
      krsIds.push(krsRecord.id);
    }

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

  const postNilaiAkhir = (list: Array<{ krsId: number; nilai: number }>) =>
    app.handle(
      new Request('http://localhost/yudisium/kelas/nilai-akhir', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ kelasKuliahId: kelasId, nilaiAkhirList: list }),
      }),
    );

  const postNilaiKomponen = (
    list: Array<{ krsId: number; nilaiKomponenList: Array<{ komponenNilaiId: number; nilai: number }> }>,
  ) =>
    app.handle(
      new Request('http://localhost/yudisium/kelas/nilai', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ kelasKuliahId: kelasId, nilaiList: list }),
      }),
    );

  const getKrs = async (id: number) => {
    const [row] = await db.select().from(krs).where(eq(krs.id, id));
    return row;
  };

  it('M1 hanya menulis KRS yang dikirim; KRS lain tidak berubah', async () => {
    // Seed nilai awal untuk mahasiswa 1-3; mahasiswa 4-5 tetap kosong.
    const seed = await postNilaiAkhir([
      { krsId: krsIds[0], nilai: 70 },
      { krsId: krsIds[1], nilai: 70 },
      { krsId: krsIds[2], nilai: 70 },
    ]);
    expect(seed.status).toBe(200);

    // Simpan selektif untuk mahasiswa 1-2 saja.
    const res = await postNilaiAkhir([
      { krsId: krsIds[0], nilai: 85 },
      { krsId: krsIds[1], nilai: 90 },
    ]);
    expect(res.status).toBe(200);

    expect(parseFloat((await getKrs(krsIds[0])).nilaiAngka!)).toBe(85);
    expect(parseFloat((await getKrs(krsIds[1])).nilaiAngka!)).toBe(90);
    // Mahasiswa 3 (tidak dikirim) tetap 70 — tidak tersentuh.
    expect(parseFloat((await getKrs(krsIds[2])).nilaiAngka!)).toBe(70);
    // Mahasiswa 4-5 tidak pernah diberi nilai.
    expect((await getKrs(krsIds[3])).nilaiAngka).toBeNull();
    expect((await getKrs(krsIds[4])).nilaiAngka).toBeNull();
  });

  it('M2 hanya menulis komponen KRS yang dikirim; KRS lain tidak tersentuh', async () => {
    const comps = await saveComponents([{ nama: 'Tugas', bobot: 100 }]);

    const res = await postNilaiKomponen([
      { krsId: krsIds[0], nilaiKomponenList: [{ komponenNilaiId: comps[0].id, nilai: 80 }] },
    ]);
    expect(res.status).toBe(200);

    const rows = await db
      .select()
      .from(nilaiKomponenMahasiswa)
      .where(eq(nilaiKomponenMahasiswa.komponenNilaiId, comps[0].id));
    expect(rows.length).toBe(1);
    expect(rows[0].krsId).toBe(krsIds[0]);
    expect(parseFloat(rows[0].nilai)).toBe(80);

    // KRS lain tanpa nilai komponen.
    for (let i = 1; i <= 4; i++) {
      const others = await db.select().from(nilaiKomponenMahasiswa).where(eq(nilaiKomponenMahasiswa.krsId, krsIds[i]));
      expect(others.length).toBe(0);
      expect((await getKrs(krsIds[i])).nilaiAngka).toBeNull();
    }
  });

  it('M2 tidak menimpa komponen lain milik KRS yang sama (isi kosong saja)', async () => {
    const comps = await saveComponents([
      { nama: 'Tugas', bobot: 50 },
      { nama: 'UTS', bobot: 50 },
    ]);

    // Nilai awal Tugas untuk mahasiswa 1.
    await postNilaiKomponen([{ krsId: krsIds[0], nilaiKomponenList: [{ komponenNilaiId: comps[0].id, nilai: 60 }] }]);

    // Kirim UTS saja untuk mahasiswa 1 (mensimulasikan bulk yang melewati sel terisi).
    const res = await postNilaiKomponen([
      { krsId: krsIds[0], nilaiKomponenList: [{ komponenNilaiId: comps[1].id, nilai: 90 }] },
    ]);
    expect(res.status).toBe(200);

    const tugasRow = await db
      .select()
      .from(nilaiKomponenMahasiswa)
      .where(and(eq(nilaiKomponenMahasiswa.krsId, krsIds[0]), eq(nilaiKomponenMahasiswa.komponenNilaiId, comps[0].id)));
    expect(tugasRow.length).toBe(1);
    expect(parseFloat(tugasRow[0].nilai)).toBe(60);

    const finalKrs = await getKrs(krsIds[0]);
    expect(parseFloat(finalKrs.nilaiAngka!)).toBe(75);
  });

  it('menolak nilai di luar rentang 0-100 pada M1 dan M2', async () => {
    const comps = await saveComponents([{ nama: 'Tugas', bobot: 100 }]);

    const akhirRes = await postNilaiAkhir([{ krsId: krsIds[0], nilai: 101 }]);
    expect([400, 422]).toContain(akhirRes.status);

    const komponenRes = await postNilaiKomponen([
      { krsId: krsIds[0], nilaiKomponenList: [{ komponenNilaiId: comps[0].id, nilai: -1 }] },
    ]);
    expect([400, 422]).toContain(komponenRes.status);
  });

  it('menolak penyimpanan saat kelas telah dikunci (M1 & M2)', async () => {
    const comps = await saveComponents([{ nama: 'Tugas', bobot: 100 }]);

    await app.handle(
      new Request(`http://localhost/yudisium/kelas/${kelasId}/lock`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${dosenToken}` },
      }),
    );

    const akhirRes = await postNilaiAkhir([{ krsId: krsIds[0], nilai: 80 }]);
    expect(akhirRes.status).toBe(400);

    const komponenRes = await postNilaiKomponen([
      { krsId: krsIds[0], nilaiKomponenList: [{ komponenNilaiId: comps[0].id, nilai: 80 }] },
    ]);
    expect(komponenRes.status).toBe(400);

    const rows = await db.select().from(nilaiKomponenMahasiswa);
    expect(rows.length).toBe(0);
  });

  it('menolak KRS yang bukan milik kelas (scope kelas)', async () => {
    // Kelas kedua pada mata kuliah yang sama, dengan KRS mahasiswa berbeda.
    const [kelasB] = await db
      .insert(kelasKuliah)
      .values({ mataKuliahId: mkId, periodeId, namaKelas: 'TI-3B' })
      .returning();
    const [krsB] = await db.insert(krs).values({ mahasiswaId: mahasiswaIds[0], kelasKuliahId: kelasB.id }).returning();

    const res = await postNilaiAkhir([{ krsId: krsB.id, nilai: 80 }]);
    expect(res.status).toBe(400);

    expect((await getKrs(krsB.id)).nilaiAngka).toBeNull();
  });
});
