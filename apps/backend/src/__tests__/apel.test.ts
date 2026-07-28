import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { dosen, mahasiswa, programStudi } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Kelompok Apel API (Fleksibel Lintas Prodi)', () => {
  let adminToken: string;
  let dosenToken: string;

  let prodi1Id: number;
  let prodi2Id: number;
  let dosenId: number;
  let mhs1Id: number;
  let mhs2Id: number;

  beforeEach(async () => {
    await clearDatabase();

    adminToken = await getAuthToken('admin@test.com', 'admin');
    dosenToken = await getAuthToken('dosen@test.com', 'dosen');

    // 1. Seed dua Program Studi berbeda
    const [prodi1] = await db
      .insert(programStudi)
      .values({ kode: 'TI', nama: 'Teknik Informatika', jenjang: 'D4' })
      .returning();
    prodi1Id = prodi1.id;

    const [prodi2] = await db
      .insert(programStudi)
      .values({ kode: 'TM', nama: 'Teknik Mesin', jenjang: 'D3' })
      .returning();
    prodi2Id = prodi2.id;

    // 2. Seed Dosen PJ
    const [dsn] = await db
      .insert(dosen)
      .values({
        nip: '199001012020011001',
        nama: 'Dosen Pembina Apel',
        email: 'dosen@test.com',
        programStudiId: prodi1Id,
      })
      .returning();
    dosenId = dsn.id;

    // 3. Seed Mahasiswa dari dua Prodi berbeda
    const [mhs1] = await db
      .insert(mahasiswa)
      .values({
        nim: '20200001',
        nama: 'Mahasiswa TI',
        email: 'mhs1@test.com',
        programStudiId: prodi1Id,
        status: 'aktif',
        namaIbuKandung: 'Ibu TI',
        nik: '1234567890123451',
        jenisKelamin: 'L',
        tanggalLahir: '2000-01-01',
      })
      .returning();
    mhs1Id = mhs1.id;

    const [mhs2] = await db
      .insert(mahasiswa)
      .values({
        nim: '20200002',
        nama: 'Mahasiswa TM',
        email: 'mhs2@test.com',
        programStudiId: prodi2Id,
        status: 'aktif',
        namaIbuKandung: 'Ibu TM',
        nik: '1234567890123452',
        jenisKelamin: 'P',
        tanggalLahir: '2000-02-02',
      })
      .returning();
    mhs2Id = mhs2.id;
  });

  it('harus sukses membuat kelompok apel tanpa keterikatan programStudiId', async () => {
    const res = await app.handle(
      new Request('http://localhost/apel/kelompok', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          namaKelompok: 'Kelompok Apel Gabungan Kampus',
          dosenId: dosenId,
          shift: 'pagi',
          keterangan: 'Kelompok Lintas Jurusan',
        }),
      }),
    );

    expect(res.status).toBe(200);
    const kelompok = await res.json();
    expect(kelompok.id).toBeDefined();
    expect(kelompok.namaKelompok).toBe('Kelompok Apel Gabungan Kampus');
    expect(kelompok.programStudiId).toBeUndefined();
  });

  it('harus sukses mengelompokkan mahasiswa lintas prodi dalam satu kelompok apel', async () => {
    // 1. Buat Kelompok Apel
    const createRes = await app.handle(
      new Request('http://localhost/apel/kelompok', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          namaKelompok: 'Kelompok Apel Organisasi UKM',
          dosenId: dosenId,
          shift: 'sore',
        }),
      }),
    );
    const kelompok = await createRes.json();

    // 2. Tambah Mahasiswa dari Prodi TI (prodi1) & Prodi TM (prodi2) sekaligus
    const addAnggotaRes = await app.handle(
      new Request(`http://localhost/apel/kelompok/${kelompok.id}/anggota`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          mahasiswaIds: [mhs1Id, mhs2Id],
        }),
      }),
    );

    expect(addAnggotaRes.status).toBe(200);

    // 3. Ambil detail kelompok dan verifikasi kedua mahasiswa terdaftar
    const detailRes = await app.handle(
      new Request(`http://localhost/apel/kelompok/${kelompok.id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${dosenToken}`,
        },
      }),
    );

    expect(detailRes.status).toBe(200);
    const detail = await detailRes.json();
    expect(detail.anggota.length).toBe(2);
  });
});
