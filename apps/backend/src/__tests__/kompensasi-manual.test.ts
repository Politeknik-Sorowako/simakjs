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

  it('harus menerima durasi RUSAK lebih dari 480 menit dan merekapnya sebagai sisa tanggungan', async () => {
    const createRes = await app.handle(
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
          durasiMenit: 600,
        }),
      }),
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.durasiMenit).toBe(600);

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
    // Poin RUSAK = durasi mentah (600), tanpa cap 480 & tanpa pengali.
    expect(body.data[0].totalKompensasi).toBe(600);
    // Sisa tanggungan harus mencakup poin RUSAK (600 - 0 dibayar = 600).
    expect(body.data[0].sisaKompensasi).toBe(600);
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

  it('harus menerima durasi 0 menit (anulir) untuk jenis terlambat dan tersinkron dengan durasi 0', async () => {
    const res = await app.handle(
      new Request('http://localhost/kompensasi-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          mahasiswaId: mhsId,
          tanggal: '2026-08-07',
          jenisKompen: 'terlambat',
          durasiMenit: 0,
          keterangan: 'anulir kompensasi',
        }),
      }),
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.durasiMenit).toBe(0);

    const synced = await db.select().from(ketidakhadiranMahasiswa).where(eq(ketidakhadiranMahasiswa.sumber, 'MANUAL'));
    expect(synced).toHaveLength(1);
    expect(synced[0].mahasiswaId).toBe(mhsId);
    expect(synced[0].durasiMenit).toBe(0);
  });

  it('harus menerima durasi 0 menit (anulir) pada bulk-update', async () => {
    const createRes = await app.handle(
      new Request('http://localhost/kompensasi-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          mahasiswaId: mhsId,
          tanggal: '2026-08-05',
          jenisKompen: 'terlambat',
          durasiMenit: 30,
        }),
      }),
    );
    expect(createRes.status).toBe(201);
    const rec = await createRes.json();

    const bulkRes = await app.handle(
      new Request('http://localhost/kompensasi-manual/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ ids: [rec.id], durasiMenit: 0 }),
      }),
    );

    expect(bulkRes.status).toBe(200);
    const bulk = await bulkRes.json();
    expect(bulk.success).toBe(true);
    expect(bulk.updated).toBe(1);

    const updated = await db.select().from(kompensasiManual).where(eq(kompensasiManual.id, rec.id));
    expect(updated[0].durasiMenit).toBe(0);

    const synced = await db.select().from(ketidakhadiranMahasiswa).where(eq(ketidakhadiranMahasiswa.sumber, 'MANUAL'));
    expect(synced[0].durasiMenit).toBe(0);
  });

  it('harus menghitung sisa kompensasi minus pada laporan & detail (clamp 0 untuk mahasiswa)', async () => {
    const createRes = await app.handle(
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
          durasiMenit: 200,
        }),
      }),
    );
    expect(createRes.status).toBe(201);

    const payRes = await app.handle(
      new Request('http://localhost/presensi/kompensasi/bayar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          mahasiswaId: mhsId,
          jumlahMenit: 300,
          tanggal: '2026-08-10',
          keterangan: 'pelunasan kompensasi',
        }),
      }),
    );
    expect(payRes.status).toBe(201);

    // Laporan (sisi admin/dosen) menampilkan nilai minus.
    const laporan = await app.handle(
      new Request('http://localhost/presensi/kompensasi/laporan?search=20230001', {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(laporan.status).toBe(200);
    const body = await laporan.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].totalKompensasi).toBe(200);
    expect(body.data[0].totalDibayar).toBe(300);
    expect(body.data[0].sisaKompensasi).toBe(-100);

    // Detail dari akun admin/dosen tetap menampilkan nilai minus.
    const detailAdmin = await app.handle(
      new Request(`http://localhost/presensi/kompensasi/mahasiswa/${mhsId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(detailAdmin.status).toBe(200);
    const adminBody = await detailAdmin.json();
    expect(adminBody.summary.totalKompensasi).toBe(200);
    expect(adminBody.summary.totalDibayar).toBe(300);
    expect(adminBody.summary.sisaKompensasi).toBe(-100);

    // Detail dari akun mahasiswa sendiri di-clamp menjadi 0.
    const mhsToken = await getAuthToken('mhs_kompen@test.com', 'mahasiswa');
    const detailMhs = await app.handle(
      new Request(`http://localhost/presensi/kompensasi/mahasiswa/${mhsId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${mhsToken}` },
      }),
    );
    expect(detailMhs.status).toBe(200);
    const mhsBody = await detailMhs.json();
    expect(mhsBody.summary.sisaKompensasi).toBe(0);
  });
});
