import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { dosen, kelasKuliah, mahasiswa, mataKuliah, periodeAkademik, programStudi } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Rombel Praktikum & BAP Praktikum API', () => {
  let adminToken: string;
  let dosenToken: string;
  let mhsToken: string;

  let prodiId: number;
  let dosenId: number;
  let mhsId: number;
  let matkulId: number;
  let kelasId: number;
  const periodeId = '20231';

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin@test.com', 'admin');
    dosenToken = await getAuthToken('dosen@test.com', 'dosen');
    mhsToken = await getAuthToken('mhs@test.com', 'mahasiswa');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: 'TI', nama: 'Teknik Informatika', jenjang: 'D4' })
      .returning();
    prodiId = prodi.id;

    const [dsn] = await db
      .insert(dosen)
      .values({ nip: '199001012020011001', nama: 'Instruktur Test', email: 'dosen@test.com', programStudiId: prodiId })
      .returning();
    dosenId = dsn.id;

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20200001',
        nama: 'Mahasiswa Praktikum',
        email: 'mhs@test.com',
        programStudiId: prodiId,
        status: 'aktif',
        namaIbuKandung: 'Ibu Test',
        nik: '1234567890123456',
        jenisKelamin: 'L',
        tanggalLahir: '2000-01-01',
      })
      .returning();
    mhsId = mhs.id;

    await db.insert(periodeAkademik).values({ id: periodeId, nama: 'Ganjil 2023/2024', aktif: true });

    const [matkul] = await db
      .insert(mataKuliah)
      .values({ kode: 'MKP01', nama: 'Praktikum Jaringan Komputer', sksTotal: 2, programStudiId: prodiId })
      .returning();
    matkulId = matkul.id;

    const [kelas] = await db
      .insert(kelasKuliah)
      .values({ mataKuliahId: matkulId, periodeId: periodeId, namaKelas: 'P1' })
      .returning();
    kelasId = kelas.id;
  });

  it('harus sukses membuat rombel praktikum, plot anggota, dan mencatat BAP praktikum', async () => {
    // 1. Buat rombel praktikum
    const rombelRes = await app.handle(
      new Request('http://localhost/rombel-praktikum', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${dosenToken}`,
        },
        body: JSON.stringify({
          kelasKuliahId: kelasId,
          namaGroup: 'Kelompok A1',
          instrukturId: dosenId,
          keterangan: 'Kelompok Pagi',
        }),
      }),
    );
    expect(rombelRes.status).toBe(200);
    const rombel = await rombelRes.json();
    expect(rombel.id).toBeDefined();

    // 2. Assign Mahasiswa ke Rombel
    const assignRes = await app.handle(
      new Request(`http://localhost/rombel-praktikum/${rombel.id}/mahasiswa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${dosenToken}`,
        },
        body: JSON.stringify({
          mahasiswaIds: [mhsId],
        }),
      }),
    );
    expect(assignRes.status).toBe(200);

    // 3. Buat BAP Praktikum
    const bapPrakRes = await app.handle(
      new Request('http://localhost/rombel-praktikum/bap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${dosenToken}`,
        },
        body: JSON.stringify({
          rombelPraktikumId: rombel.id,
          tanggal: '2026-04-10',
          sesiKe: 1,
          materi: 'Crimping UTP Cable & Testing',
          durasiMenit: 120,
          instrukturId: dosenId,
        }),
      }),
    );
    expect(bapPrakRes.status).toBe(200);
    const bapPrak = await bapPrakRes.json();

    // 4. Save Presensi Bulk Praktikum
    const presPrakRes = await app.handle(
      new Request('http://localhost/rombel-praktikum/presensi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${dosenToken}`,
        },
        body: JSON.stringify({
          bapPraktikumId: bapPrak.id,
          presensiList: [
            {
              mahasiswaId: mhsId,
              status: 'hadir',
            },
          ],
        }),
      }),
    );
    expect(presPrakRes.status).toBe(200);
  });
});
