import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { mahasiswa, periodeAkademik, programStudi } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Mahasiswa Keluar / Drop Out API', () => {
  let adminToken: string;
  let prodiId: number;
  let mhsId: number;
  const periodeId = '20231';

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin@test.com', 'admin');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: 'TI', nama: 'Teknik Informatika', jenjang: 'D4' })
      .returning();
    prodiId = prodi.id;

    await db.insert(periodeAkademik).values({ id: periodeId, nama: 'Ganjil 2023/2024', aktif: true });

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20200099',
        nama: 'Mahasiswa Non-Aktif',
        email: 'nonaktif@test.com',
        programStudiId: prodiId,
        status: 'aktif',
        namaIbuKandung: 'Ibu Test',
        nik: '1234567890123499',
        jenisKelamin: 'L',
        tanggalLahir: '2000-01-01',
      })
      .returning();
    mhsId = mhs.id;
  });

  it('harus sukses mencatat status keluar mahasiswa dan mengambil daftarnya', async () => {
    const postRes = await app.handle(
      new Request('http://localhost/mahasiswa-keluar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          mahasiswaId: mhsId,
          periodeId: periodeId,
          statusBaru: 'drop_out',
          tanggalKeluar: '2026-04-01',
          noSk: 'SK-DO-001/2026',
          alasanKeluar: 'Mangkir lebih dari 2 semester berturut-turut',
        }),
      }),
    );
    expect(postRes.status).toBe(201);
    const rec = await postRes.json();
    expect(rec.id).toBeDefined();

    const getRes = await app.handle(
      new Request('http://localhost/mahasiswa-keluar', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }),
    );
    expect(getRes.status).toBe(200);
    const listRes = await getRes.json();
    expect(listRes.data.length).toBeGreaterThanOrEqual(1);
  });
});
