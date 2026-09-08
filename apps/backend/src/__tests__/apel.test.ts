import { beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import { dosen, kelompokApel, mahasiswa, programStudi, sesiApel } from '../models/schema';
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

  it('harus sukses menutup dan membuka kembali sesi apel', async () => {
    // 1. Buat kelompok
    const createKelRes = await app.handle(
      new Request('http://localhost/apel/kelompok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ namaKelompok: 'Kelompok Sesi Test', dosenId }),
      }),
    );
    const kelompok = await createKelRes.json();

    // 2. Buka sesi
    const bukaRes = await app.handle(
      new Request('http://localhost/apel/sesi/buka', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosenToken}` },
        body: JSON.stringify({
          kelompokApelId: kelompok.id,
          tanggal: '2026-08-02',
          shift: 'pagi',
          jamMulai: '07:00',
        }),
      }),
    );
    expect(bukaRes.status).toBe(200);
    const sesi = await bukaRes.json();

    // 3. Tutup sesi
    const tutupRes = await app.handle(
      new Request(`http://localhost/apel/sesi/${sesi.id}/tutup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${dosenToken}` },
      }),
    );
    expect(tutupRes.status).toBe(200);
    const sesiTutup = await tutupRes.json();
    expect(sesiTutup.isClosed).toBe(true);

    // 4. Buka kembali sesi
    const bukaKembaliRes = await app.handle(
      new Request(`http://localhost/apel/sesi/${sesi.id}/buka-kembali`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${dosenToken}` },
      }),
    );
    expect(bukaKembaliRes.status).toBe(200);
    const sesiReopened = await bukaKembaliRes.json();
    expect(sesiReopened.isClosed).toBe(false);
  });

  it('harus sukses menghapus sesi apel oleh admin', async () => {
    // 1. Buat kelompok & sesi
    const createKelRes = await app.handle(
      new Request('http://localhost/apel/kelompok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ namaKelompok: 'Kelompok Delete Test', dosenId }),
      }),
    );
    const kelompok = await createKelRes.json();

    const bukaRes = await app.handle(
      new Request('http://localhost/apel/sesi/buka', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          kelompokApelId: kelompok.id,
          tanggal: '2026-08-02',
          shift: 'pagi',
          jamMulai: '07:00',
          dosenId,
        }),
      }),
    );
    const sesi = await bukaRes.json();

    // 2. Non-admin gagal menghapus
    const nonAdminDel = await app.handle(
      new Request(`http://localhost/apel/sesi/${sesi.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${dosenToken}` },
      }),
    );
    expect(nonAdminDel.status).toBe(403);

    // 3. Admin sukses menghapus
    const adminDel = await app.handle(
      new Request(`http://localhost/apel/sesi/${sesi.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(adminDel.status).toBe(200);

    // 4. Verifikasi sesi tidak ditemukan lagi
    const getRes = await app.handle(
      new Request(`http://localhost/apel/sesi/${sesi.id}/presensi`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(getRes.status).toBe(400);
  });

  it('harus sukses mengedit data sesi apel', async () => {
    const createKelRes = await app.handle(
      new Request('http://localhost/apel/kelompok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ namaKelompok: 'Kelompok Update Test' }),
      }),
    );
    const kelompok = await createKelRes.json();

    const bukaRes = await app.handle(
      new Request('http://localhost/apel/sesi/buka', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosenToken}` },
        body: JSON.stringify({
          kelompokApelId: kelompok.id,
          tanggal: '2026-08-02',
          shift: 'pagi',
          jamMulai: '07:00',
          dosenId,
        }),
      }),
    );
    const sesi = await bukaRes.json();

    const updateRes = await app.handle(
      new Request(`http://localhost/apel/sesi/${sesi.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosenToken}` },
        body: JSON.stringify({
          tanggal: '2026-08-03',
          shift: 'sore',
          jamMulai: '16:00',
        }),
      }),
    );

    expect(updateRes.status).toBe(200);
    const updatedSesi = await updateRes.json();
    expect(updatedSesi.tanggal).toBe('2026-08-03');
    expect(updatedSesi.shift).toBe('sore');
    expect(updatedSesi.jamMulai).toContain('16:00');
  });

  it('harus menolak pembuatan sesi duplikat untuk kelompok-tanggal-shift yang sama', async () => {
    const createKelRes = await app.handle(
      new Request('http://localhost/apel/kelompok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ namaKelompok: 'Kelompok Duplikat Test', dosenId }),
      }),
    );
    const kelompok = await createKelRes.json();

    const payload = {
      kelompokApelId: kelompok.id,
      tanggal: '2026-08-05',
      shift: 'pagi',
      jamMulai: '07:00',
    };

    // Sesi 1: Sukses
    const bukaRes1 = await app.handle(
      new Request('http://localhost/apel/sesi/buka', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosenToken}` },
        body: JSON.stringify(payload),
      }),
    );
    expect(bukaRes1.status).toBe(200);

    // Sesi 2 (Duplikat): Harus ditolak dengan error 400
    const bukaRes2 = await app.handle(
      new Request('http://localhost/apel/sesi/buka', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dosenToken}` },
        body: JSON.stringify(payload),
      }),
    );
    expect(bukaRes2.status).toBe(400);
    const body2 = await bukaRes2.json();
    expect(body2.error).toContain('sudah pernah dibuka');
  });

  it('monitor hari ini menandai kelompok belum dibuka sebagai belum_buka', async () => {
    const tanggal = '2026-09-01';
    const kemarin = '2026-08-31';

    // Kelompok A: sesi dibuka hari ini (berlangsung)
    const [kelA] = await db
      .insert(kelompokApel)
      .values({ namaKelompok: 'Kelompok A', dosenId, shift: 'pagi' })
      .returning();
    await db.insert(sesiApel).values({
      kelompokApelId: kelA.id,
      tanggal,
      shift: 'pagi',
      dosenId,
      jamMulai: '07:00',
    });

    // Kelompok B: sesi dibuka & ditutup hari ini (ditutup)
    const [kelB] = await db
      .insert(kelompokApel)
      .values({ namaKelompok: 'Kelompok B', dosenId, shift: 'pagi' })
      .returning();
    const [sesiB] = await db
      .insert(sesiApel)
      .values({
        kelompokApelId: kelB.id,
        tanggal,
        shift: 'pagi',
        dosenId,
        jamMulai: '07:00',
      })
      .returning();
    await db.update(sesiApel).set({ isClosed: true, closedAt: new Date() }).where(eq(sesiApel.id, sesiB.id));

    // Kelompok C: tanpa sesi hari ini, hanya punya sesi kemarin (belum_buka)
    const [kelC] = await db
      .insert(kelompokApel)
      .values({ namaKelompok: 'Kelompok C', dosenId, shift: 'sore' })
      .returning();
    await db.insert(sesiApel).values({
      kelompokApelId: kelC.id,
      tanggal: kemarin,
      shift: 'sore',
      dosenId,
      jamMulai: '16:00',
    });

    // Kelompok D: tanpa sesi sama sekali (belum_buka & belum pernah dibuka)
    const [kelD] = await db
      .insert(kelompokApel)
      .values({ namaKelompok: 'Kelompok D', dosenId, shift: 'pagi' })
      .returning();

    const res = await app.handle(
      new Request(`http://localhost/apel/monitor?tanggal=${tanggal}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary.totalKelompok).toBe(4);
    expect(body.summary.totalBelumBuka).toBe(2);

    const kelCItem = body.detail.find((d: { kelompokApelId: number }) => d.kelompokApelId === kelC.id);
    expect(kelCItem).toBeDefined();
    expect(kelCItem.statusKelompok).toBe('belum_buka');
    expect(kelCItem.pernahDibuka).toBe(true);
    expect(kelCItem.tanggal).toBe(tanggal);

    const kelDItem = body.detail.find((d: { kelompokApelId: number }) => d.kelompokApelId === kelD.id);
    expect(kelDItem).toBeDefined();
    expect(kelDItem.statusKelompok).toBe('belum_buka');
    expect(kelDItem.pernahDibuka).toBe(false);

    const kelAItem = body.detail.find((d: { kelompokApelId: number }) => d.kelompokApelId === kelA.id);
    expect(kelAItem.statusKelompok).toBe('dibuka');
    expect(kelAItem.sesiHariIni).toHaveLength(1);
    expect(kelAItem.sesiHariIni[0].statusSesi).toBe('berlangsung');

    const kelBItem = body.detail.find((d: { kelompokApelId: number }) => d.kelompokApelId === kelB.id);
    expect(kelBItem.statusKelompok).toBe('dibuka');
    expect(kelBItem.sesiHariIni[0].statusSesi).toBe('ditutup');
  });

  it('monitor mengagregasi multi-shift menjadi satu baris per kelompok', async () => {
    const tanggal = '2026-09-02';

    // Kelompok dengan dua sesi di tanggal sama: pagi & sore
    const [kel] = await db
      .insert(kelompokApel)
      .values({ namaKelompok: 'Kelompok 1A', dosenId, shift: 'pagi' })
      .returning();
    await db.insert(sesiApel).values({
      kelompokApelId: kel.id,
      tanggal,
      shift: 'pagi',
      dosenId,
      jamMulai: '07:00',
    });
    await db.insert(sesiApel).values({
      kelompokApelId: kel.id,
      tanggal,
      shift: 'sore',
      dosenId,
      jamMulai: '16:00',
    });

    const res = await app.handle(
      new Request(`http://localhost/apel/monitor?tanggal=${tanggal}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();

    // Harus satu baris per kelompok (bukan dobel karena 2 sesi)
    expect(body.summary.totalKelompok).toBe(1);
    expect(body.detail).toHaveLength(1);

    const item = body.detail[0];
    expect(item.kelompokNama).toBe('Kelompok 1A');
    expect(item.statusKelompok).toBe('dibuka');
    expect(item.shiftsDibuka).toEqual(['pagi', 'sore']);
    expect(item.sesiHariIni).toHaveLength(2);
    expect(item.sesiHariIni.map((s: { shift: string }) => s.shift)).toEqual(['pagi', 'sore']);
    expect(item.sesiHariIni.every((s: { statusSesi: string }) => s.statusSesi === 'berlangsung')).toBe(true);
  });
});
