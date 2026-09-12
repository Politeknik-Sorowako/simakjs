import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { bimbingan, dosen, mahasiswa, periodeAkademik, programStudi, sesiBimbingan } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Respons Mahasiswa per Sesi Bimbingan', () => {
  let dosenToken: string;
  let mhsToken: string;
  let sesiMhsId: number;
  let sesiMhs2Id: number;

  beforeEach(async () => {
    await clearDatabase();

    dosenToken = await getAuthToken('dosen_respons@test.com', 'dosen');
    mhsToken = await getAuthToken('mhs_respons@test.com', 'mahasiswa');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: `RSP_${Date.now()}`, nama: 'Teknik Listrik', jenjang: 'D4' })
      .returning();

    const [dsn] = await db
      .insert(dosen)
      .values({
        nip: '199001012020011099',
        nama: 'Dosen PA Respons',
        email: 'dosen_respons@test.com',
        programStudiId: prodi.id,
      })
      .returning();

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20240011',
        nama: 'Mahasiswa Respons',
        email: 'mhs_respons@test.com',
        programStudiId: prodi.id,
        dosenPaId: dsn.id,
        status: 'aktif',
        namaIbuKandung: 'Ibu Respons',
        nik: '1234567890123481',
        jenisKelamin: 'L',
        tanggalLahir: '2002-03-03',
      })
      .returning();

    const [mhs2] = await db
      .insert(mahasiswa)
      .values({
        nim: '20240012',
        nama: 'Mahasiswa Respons 2',
        email: 'mhs2_respons@test.com',
        programStudiId: prodi.id,
        dosenPaId: dsn.id,
        status: 'aktif',
        namaIbuKandung: 'Ibu Respons 2',
        nik: '1234567890123482',
        jenisKelamin: 'P',
        tanggalLahir: '2002-04-04',
      })
      .returning();

    await db.insert(periodeAkademik).values({ id: '20242', nama: 'Genap 2024/2025', aktif: true });

    const [bimb] = await db
      .insert(bimbingan)
      .values({ mahasiswaId: mhs.id, dosenId: dsn.id, periodeId: '20242', kategori: 'PA' })
      .returning();

    const [bimb2] = await db
      .insert(bimbingan)
      .values({ mahasiswaId: mhs2.id, dosenId: dsn.id, periodeId: '20242', kategori: 'PA' })
      .returning();

    const [sesi] = await db
      .insert(sesiBimbingan)
      .values({
        bimbinganId: bimb.id,
        pertemuanKe: 1,
        tanggalBimbingan: '2025-02-01',
        solusi: 'Tingkatkan IPK.',
        statusBkd: true,
      })
      .returning();
    sesiMhsId = sesi.id;

    const [sesi2] = await db
      .insert(sesiBimbingan)
      .values({
        bimbinganId: bimb2.id,
        pertemuanKe: 1,
        tanggalBimbingan: '2025-02-01',
        solusi: 'Catatan untuk mahasiswa lain.',
        statusBkd: true,
      })
      .returning();
    sesiMhs2Id = sesi2.id;
  });

  it('mahasiswa dapat mengisi respons pada sesi miliknya', async () => {
    const res = await app.handle(
      new Request(`http://localhost/bimbingan/sesi/${sesiMhsId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mhsToken}` },
        body: JSON.stringify({ responsMahasiswa: 'Terima kasih, akan saya laksanakan.' }),
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { responsMahasiswa: string };
    expect(json.responsMahasiswa).toBe('Terima kasih, akan saya laksanakan.');
  });

  it('mahasiswa ditolak (403) saat mencoba mengubah catatan dosen (solusi)', async () => {
    const res = await app.handle(
      new Request(`http://localhost/bimbingan/sesi/${sesiMhsId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mhsToken}` },
        body: JSON.stringify({ solusi: 'Diubah oleh mahasiswa' }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it('mahasiswa ditolak (403) saat merespons sesi milik mahasiswa lain', async () => {
    const res = await app.handle(
      new Request(`http://localhost/bimbingan/sesi/${sesiMhs2Id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mhsToken}` },
        body: JSON.stringify({ responsMahasiswa: 'Menyusup' }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it('dosen tetap dapat memperbarui sesi secara penuh', async () => {
    const res = await app.handle(
      new Request(`http://localhost/bimbingan/sesi/${sesiMhsId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosenToken}` },
        body: JSON.stringify({ solusi: 'Revisi catatan dosen.' }),
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { solusi: string };
    expect(json.solusi).toBe('Revisi catatan dosen.');
  });
});
