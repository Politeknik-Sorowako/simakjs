import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

async function createProdiMhsMk(adminToken: string) {
  const prodiRes = await app.handle(
    new Request('http://localhost/prodi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ kode: 'TI-AENROLL', nama: 'TI Auto Enroll', jenjang: 'D4' }),
    }),
  );
  const prodi = (await prodiRes.json()) as { id: number };

  const mhsRes = await app.handle(
    new Request('http://localhost/mahasiswa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        nim: '77770001',
        nama: 'Mhs Paket',
        email: 'mhs-paket@test.com',
        programStudiId: prodi.id,
        angkatan: '2024',
        namaIbuKandung: 'Ibu Paket',
        nik: '7777000000000001',
        jenisKelamin: 'L',
        tanggalLahir: '2003-01-01',
      }),
    }),
  );
  const mhs = (await mhsRes.json()) as { id: number };

  const mk1Res = await app.handle(
    new Request('http://localhost/mata-kuliah', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ kode: 'AEN001', nama: 'MK Paket 1', sksTotal: 3, programStudiId: prodi.id }),
    }),
  );
  const mk2Res = await app.handle(
    new Request('http://localhost/mata-kuliah', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ kode: 'AEN002', nama: 'MK Paket 2', sksTotal: 2, programStudiId: prodi.id }),
    }),
  );
  const mk1 = (await mk1Res.json()) as { id: number };
  const mk2 = (await mk2Res.json()) as { id: number };

  return { prodi, mhs, mk1, mk2 };
}

describe('Auto-Enroll KRS Paket (/krs/auto-enroll-paket)', () => {
  let prodiId: number;
  let mhsId: number;
  let mk1Id: number;
  let mk2Id: number;
  let kurikulumId: number;
  let kelas1A: number;
  let kelas1B: number;
  let kelas2Id: number;

  beforeEach(async () => {
    await clearDatabase();
    const adminToken = await getAuthToken('admin-auto-enroll@test.com', 'admin');

    const { prodi, mhs, mk1, mk2 } = await createProdiMhsMk(adminToken);
    prodiId = prodi.id;
    mhsId = mhs.id;
    mk1Id = mk1.id;
    mk2Id = mk2.id;

    await app.handle(
      new Request('http://localhost/periode-akademik', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ id: '20241', nama: '2024/2025 Ganjil', aktif: true }),
      }),
    );

    // Buat kurikulum + angkatan_kurikulum binding
    const kurRes = await app.handle(
      new Request('http://localhost/kurikulum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          kode: 'KUR-AENROLL',
          nama: 'Kurikulum Auto Enroll',
          programStudiId: prodiId,
          semesterMulai: '20241',
          jumlahSksLulus: 144,
          jumlahSksWajib: 120,
          jumlahSksPilihan: 24,
          isAktif: true,
        }),
      }),
    );
    const kur = (await kurRes.json()) as { id: number };
    kurikulumId = kur.id;

    await app.handle(
      new Request(`http://localhost/kurikulum/${kurikulumId}/mata-kuliah`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ mataKuliahId: mk1Id, semester: 1, sksMataKuliah: 3, isWajib: true }),
      }),
    );
    await app.handle(
      new Request(`http://localhost/kurikulum/${kurikulumId}/mata-kuliah`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ mataKuliahId: mk2Id, semester: 1, sksMataKuliah: 2, isWajib: true }),
      }),
    );

    // Binding angkatan 2024 -> kurikulum (insert langsung karena tak ada endpoint)
    const { angkatanKurikulum } = await import('../models/schema');
    await db.insert(angkatanKurikulum).values({
      programStudiId: prodiId,
      angkatan: '2024',
      kurikulumId,
      isActive: true,
    });

    // Kelas kuliah: MK1 paralel (2 kelas), MK2 tunggal
    const k1aRes = await app.handle(
      new Request('http://localhost/kelas-kuliah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ mataKuliahId: mk1Id, periodeId: '20241', namaKelas: 'AEN-1A' }),
      }),
    );
    kelas1A = ((await k1aRes.json()) as { id: number }).id;
    const k1bRes = await app.handle(
      new Request('http://localhost/kelas-kuliah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ mataKuliahId: mk1Id, periodeId: '20241', namaKelas: 'AEN-1B' }),
      }),
    );
    kelas1B = ((await k1bRes.json()) as { id: number }).id;
    const k2Res = await app.handle(
      new Request('http://localhost/kelas-kuliah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ mataKuliahId: mk2Id, periodeId: '20241', namaKelas: 'AEN-2A' }),
      }),
    );
    kelas2Id = ((await k2Res.json()) as { id: number }).id;
  });

  it('harus generate KRS draft untuk MK tunggal dan melaporkan MK paralel sebagai ambiguous tanpa kelasMap', async () => {
    const adminToken = await getAuthToken('admin-auto-enroll-1@test.com', 'admin');

    const res = await app.handle(
      new Request('http://localhost/krs/auto-enroll-paket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          periodeId: '20241',
          programStudiId: prodiId,
          angkatan: '2024',
          semester: 1,
        }),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();

    // MK1 paralel ambigu, MK2 tunggal dipakai
    expect(body.skippedAmbiguous.length).toBe(1);
    expect(body.skippedAmbiguous[0].mataKuliahId).toBe(mk1Id);
    expect(body.kelasDigunakan.length).toBe(1);
    expect(body.kelasDigunakan[0].mataKuliahId).toBe(mk2Id);
    // 1 mahasiswa x 1 kelas (MK2) ter-create draft
    expect(body.createdCount).toBe(1);
    expect(body.mahasiswaProses).toBe(1);
  });

  it('harus generate KRS untuk semua MK saat kelasMap eksplisit diberikan, dan idempoten saat dijalankan ulang', async () => {
    const adminToken = await getAuthToken('admin-auto-enroll-2@test.com', 'admin');

    const payload = {
      periodeId: '20241',
      programStudiId: prodiId,
      angkatan: '2024',
      semester: 1,
      kelasMap: { [mk1Id]: kelas1A },
    };

    const res = await app.handle(
      new Request('http://localhost/krs/auto-enroll-paket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify(payload),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.skippedAmbiguous.length).toBe(0);
    expect(body.kelasDigunakan.length).toBe(2);
    // 1 mhs x 2 MK = 2 KRS draft
    expect(body.createdCount).toBe(2);

    // Jalankan ulang -> idempoten, 0 created
    const res2 = await app.handle(
      new Request('http://localhost/krs/auto-enroll-paket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify(payload),
      }),
    );
    const body2 = await res2.json();
    expect(body2.createdCount).toBe(0);
    expect(body2.skippedExist).toBe(2);
  });

  it('harus menolak akses untuk role selain admin/prodi/kaprodi', async () => {
    const mhsToken = await getAuthToken('mhs-auto-enroll@test.com', 'mahasiswa');

    const res = await app.handle(
      new Request('http://localhost/krs/auto-enroll-paket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mhsToken}` },
        body: JSON.stringify({
          periodeId: '20241',
          programStudiId: prodiId,
          angkatan: '2024',
          semester: 1,
        }),
      }),
    );
    expect(res.status).toBe(403);
  });
});
