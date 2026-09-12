import { beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import { bimbingan, dosen, mahasiswa, periodeAkademik, programStudi, sesiBimbingan, users } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Thread Balasan per Sesi Bimbingan', () => {
  let dosenToken: string;
  let dosen2Token: string;
  let mhsToken: string;
  let mhsId: number;
  let sesiMhsId: number;
  let sesiMhs2Id: number;

  beforeEach(async () => {
    await clearDatabase();

    dosenToken = await getAuthToken('dosen_thread@test.com', 'dosen');
    dosen2Token = await getAuthToken('dosen2_thread@test.com', 'dosen');
    mhsToken = await getAuthToken('mhs_thread@test.com', 'mahasiswa');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: `THR_${Date.now()}`, nama: 'Teknik Sipil', jenjang: 'D4' })
      .returning();

    const [dsn] = await db
      .insert(dosen)
      .values({
        nip: '199001012020011071',
        nama: 'Dosen PA Thread',
        email: 'dosen_thread@test.com',
        programStudiId: prodi.id,
      })
      .returning();

    await db
      .insert(dosen)
      .values({
        nip: '199001012020011072',
        nama: 'Dosen Non-PA',
        email: 'dosen2_thread@test.com',
        programStudiId: prodi.id,
      })
      .returning();

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20240031',
        nama: 'Mahasiswa Thread',
        email: 'mhs_thread@test.com',
        programStudiId: prodi.id,
        dosenPaId: dsn.id,
        status: 'aktif',
        namaIbuKandung: 'Ibu Thread',
        nik: '1234567890123471',
        jenisKelamin: 'L',
        tanggalLahir: '2002-05-05',
      })
      .returning();
    mhsId = mhs.id;

    const [mhs2] = await db
      .insert(mahasiswa)
      .values({
        nim: '20240032',
        nama: 'Mahasiswa Thread 2',
        email: 'mhs2_thread@test.com',
        programStudiId: prodi.id,
        dosenPaId: dsn.id,
        status: 'aktif',
        namaIbuKandung: 'Ibu Thread 2',
        nik: '1234567890123472',
        jenisKelamin: 'P',
        tanggalLahir: '2002-06-06',
      })
      .returning();

    await db.insert(periodeAkademik).values({ id: '20251', nama: 'Ganjil 2025/2026', aktif: true });

    const [bimb] = await db
      .insert(bimbingan)
      .values({ mahasiswaId: mhs.id, dosenId: dsn.id, periodeId: '20251', kategori: 'PA' })
      .returning();

    const [bimb2] = await db
      .insert(bimbingan)
      .values({ mahasiswaId: mhs2.id, dosenId: dsn.id, periodeId: '20251', kategori: 'PA' })
      .returning();

    const [sesi] = await db
      .insert(sesiBimbingan)
      .values({
        bimbinganId: bimb.id,
        pertemuanKe: 1,
        tanggalBimbingan: '2025-09-01',
        topikBimbingan: 'Topik uji',
        permasalahan: 'Topik uji',
        solusi: 'Catatan dosen.',
        statusBkd: true,
      })
      .returning();
    sesiMhsId = sesi.id;

    const [sesi2] = await db
      .insert(sesiBimbingan)
      .values({
        bimbinganId: bimb2.id,
        pertemuanKe: 1,
        tanggalBimbingan: '2025-09-01',
        solusi: 'Catatan dosen lain.',
        statusBkd: true,
      })
      .returning();
    sesiMhs2Id = sesi2.id;
  });

  it('mahasiswa dapat membalas sesi miliknya dan menandai sesi belum dibaca dosen', async () => {
    const res = await app.handle(
      new Request(`http://localhost/bimbingan/sesi/${sesiMhsId}/balasan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mhsToken}` },
        body: JSON.stringify({ pesan: 'Terima kasih atas catatannya.' }),
      }),
    );
    expect(res.status).toBe(201);

    const [sesi] = await db.select().from(sesiBimbingan).where(eq(sesiBimbingan.id, sesiMhsId));
    expect(sesi.isReadByDosen).toBe(false);
    expect(sesi.isReadByMahasiswa).toBe(true);
  });

  it('mahasiswa ditolak (403) saat membalas sesi mahasiswa lain', async () => {
    const res = await app.handle(
      new Request(`http://localhost/bimbingan/sesi/${sesiMhs2Id}/balasan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mhsToken}` },
        body: JSON.stringify({ pesan: 'Menyusup.' }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it('dosen non-PA ditolak (403)', async () => {
    const res = await app.handle(
      new Request(`http://localhost/bimbingan/sesi/${sesiMhsId}/balasan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosen2Token}` },
        body: JSON.stringify({ pesan: 'Halo.' }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it('dosen PA dapat membalas dan menandai sesi belum dibaca mahasiswa', async () => {
    const res = await app.handle(
      new Request(`http://localhost/bimbingan/sesi/${sesiMhsId}/balasan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosenToken}` },
        body: JSON.stringify({ pesan: 'Mohon ditindaklanjuti.' }),
      }),
    );
    expect(res.status).toBe(201);

    const [sesi] = await db.select().from(sesiBimbingan).where(eq(sesiBimbingan.id, sesiMhsId));
    expect(sesi.isReadByMahasiswa).toBe(false);
    expect(sesi.isReadByDosen).toBe(true);
  });

  it('GET balasan menandai dibaca sisi viewer dan mengembalikan riwayat', async () => {
    await app.handle(
      new Request(`http://localhost/bimbingan/sesi/${sesiMhsId}/balasan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosenToken}` },
        body: JSON.stringify({ pesan: 'Pesan dari dosen.' }),
      }),
    );

    const res = await app.handle(
      new Request(`http://localhost/bimbingan/sesi/${sesiMhsId}/balasan`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${mhsToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { pesan: string }[] };
    expect(json.data.length).toBe(1);
    expect(json.data[0].pesan).toBe('Pesan dari dosen.');

    const [sesi] = await db.select().from(sesiBimbingan).where(eq(sesiBimbingan.id, sesiMhsId));
    expect(sesi.isReadByMahasiswa).toBe(true);
  });

  it('guest ditolak (403)', async () => {
    const hashed = await Bun.password.hash('password123', { algorithm: 'bcrypt', cost: 10 });
    await db
      .insert(users)
      .values({ email: 'guest_thread@test.com', password: hashed, nama: 'Guest', role: 'guest', isActive: true })
      .onConflictDoNothing();
    const loginRes = await app.handle(
      new Request('http://localhost/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'guest_thread@test.com', password: 'password123' }),
      }),
    );
    const loginJson = (await loginRes.json()) as { token?: string };
    expect(loginJson.token).toBeTruthy();

    const res = await app.handle(
      new Request(`http://localhost/bimbingan/sesi/${sesiMhsId}/balasan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${loginJson.token}` },
        body: JSON.stringify({ pesan: 'Halo.' }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it('GET /bimbingan/mahasiswa/:mhsId menyertakan sesi[].balasan (tidak di-strip schema)', async () => {
    await app.handle(
      new Request(`http://localhost/bimbingan/sesi/${sesiMhsId}/balasan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosenToken}` },
        body: JSON.stringify({ pesan: 'Pesan uji strip schema.' }),
      }),
    );

    const res = await app.handle(
      new Request(`http://localhost/bimbingan/mahasiswa/${mhsId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${dosenToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { sesi?: { id: number; balasan?: { pesan: string }[] }[] };
    const sesi = json.sesi?.find((s) => s.id === sesiMhsId);
    expect(sesi).toBeTruthy();
    expect(Array.isArray(sesi?.balasan)).toBe(true);
    expect(sesi?.balasan?.[0]?.pesan).toBe('Pesan uji strip schema.');
  });
});
