import { beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import { ketidakhadiranMahasiswa, kompensasiManual, mahasiswa, programStudi } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('Kompensasi Manual API', () => {
  let adminToken: string;
  let mhsId: number;

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin@test.com', 'admin');

    const [prodi] = await db
      .insert(programStudi)
      .values({
        kode: 'TRPL',
        nama: 'Teknologi Rekayasa Perangkat Lunak',
        jenjang: 'D4',
      })
      .returning();

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20230001',
        nama: 'Mahasiswa Tes Kompensasi',
        email: 'mhs_kompen@test.com',
        programStudiId: prodi.id,
        jenisKelamin: 'L',
      })
      .returning();
    mhsId = mhs.id;
  });

  it('harus sukses menyimpan kompensasi manual jenis rusak/terlambat dengan durasi menit', async () => {
    const res = await app.handle(
      new Request('http://localhost/kompensasi-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          mahasiswaId: mhsId,
          tanggal: '2026-08-05',
          jenisKompen: 'rusak',
          durasiMenit: 40,
          keterangan: 'tes kompensasi alat rusak',
        }),
      }),
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.mahasiswaId).toBe(mhsId);
    expect(data.jenisKompen).toBe('rusak');
    expect(data.durasiMenit).toBe(40);
  });

  it('harus otomatis 480 menit untuk jenis sakit/izin/alpa', async () => {
    const res = await app.handle(
      new Request('http://localhost/kompensasi-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          mahasiswaId: mhsId,
          tanggal: '2026-08-06',
          jenisKompen: 'sakit',
          keterangan: 'surat dokter',
        }),
      }),
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.durasiMenit).toBe(480);
  });

  it('harus dapat mengambil daftar kompensasi manual dengan filter pencarian', async () => {
    await app.handle(
      new Request('http://localhost/kompensasi-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          mahasiswaId: mhsId,
          tanggal: '2026-08-05',
          jenisKompen: 'rusak',
          durasiMenit: 40,
        }),
      }),
    );

    const res = await app.handle(
      new Request('http://localhost/kompensasi-manual?search=20230001&jenisKompen=rusak', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.data.length).toBe(1);
    expect(body.data[0].mahasiswaNim).toBe('20230001');
    expect(body.meta.total).toBe(1);
  });

  it('harus merekap kompensasi manual jenis rusak = durasi (tanpa pengali) pada laporan kompensasi', async () => {
    await app.handle(
      new Request('http://localhost/kompensasi-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          mahasiswaId: mhsId,
          tanggal: '2026-08-05',
          jenisKompen: 'rusak',
          durasiMenit: 40,
        }),
      }),
    );

    const res = await app.handle(
      new Request('http://localhost/presensi/kompensasi/laporan?search=20230001', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.data.length).toBe(1);
    expect(body.data[0].totalKompensasi).toBe(40); // Poin RUSAK = durasi (tanpa pengali)
  });

  it('harus mendukung edit jenis sakit dengan durasi kustom (tidak dipaksa 480)', async () => {
    const res = await app.handle(
      new Request('http://localhost/kompensasi-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          mahasiswaId: mhsId,
          tanggal: '2026-08-05',
          jenisKompen: 'sakit',
          durasiMenit: 300,
          keterangan: 'izin setengah hari',
        }),
      }),
    );

    expect(res.status).toBe(201);
    const created = await res.json();
    expect(created.durasiMenit).toBe(300);
  });

  it('harus dapat melakukan bulk-update jenis dan durasi pada beberapa data', async () => {
    const createRecord = (tanggal: string, jenisKompen: string, durasiMenit: number) =>
      app.handle(
        new Request('http://localhost/kompensasi-manual', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ mahasiswaId: mhsId, tanggal, jenisKompen, durasiMenit }),
        }),
      );

    const [res1, res2] = await Promise.all([
      createRecord('2026-08-05', 'rusak', 40),
      createRecord('2026-08-06', 'terlambat', 30),
    ]);
    const rec1 = await res1.json();
    const rec2 = await res2.json();

    const bulkRes = await app.handle(
      new Request('http://localhost/kompensasi-manual/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ ids: [rec1.id, rec2.id], jenisKompen: 'izin', durasiMenit: 120 }),
      }),
    );

    expect(bulkRes.status).toBe(200);
    const bulk = await bulkRes.json();
    expect(bulk.success).toBe(true);
    expect(bulk.updated).toBe(2);

    const updated = await db.select().from(kompensasiManual).where(eq(kompensasiManual.mahasiswaId, mhsId));
    expect(updated).toHaveLength(2);
    for (const rec of updated) {
      expect(rec.jenisKompen).toBe('izin');
      expect(rec.durasiMenit).toBe(120);
    }
  });

  it('harus dapat melakukan bulk-delete beserta sinkronisasi ke ketidakhadiran_mahasiswa', async () => {
    const createRecord = (tanggal: string, jenisKompen: string, durasiMenit: number) =>
      app.handle(
        new Request('http://localhost/kompensasi-manual', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ mahasiswaId: mhsId, tanggal, jenisKompen, durasiMenit }),
        }),
      );

    const [res1, res2] = await Promise.all([
      createRecord('2026-08-05', 'rusak', 40),
      createRecord('2026-08-06', 'terlambat', 30),
    ]);
    const rec1 = await res1.json();
    const rec2 = await res2.json();

    const bulkRes = await app.handle(
      new Request('http://localhost/kompensasi-manual/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ ids: [rec1.id, rec2.id] }),
      }),
    );

    expect(bulkRes.status).toBe(200);
    const bulk = await bulkRes.json();
    expect(bulk.success).toBe(true);
    expect(bulk.deleted).toBe(2);

    const remaining = await db.select().from(kompensasiManual).where(eq(kompensasiManual.mahasiswaId, mhsId));
    expect(remaining).toHaveLength(0);

    const synced = await db.select().from(ketidakhadiranMahasiswa).where(eq(ketidakhadiranMahasiswa.sumber, 'MANUAL'));
    expect(synced).toHaveLength(0);
  });
});
