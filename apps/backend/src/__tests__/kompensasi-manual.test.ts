import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { mahasiswa, programStudi } from '../models/schema';
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

  it('harus merekap kompensasi manual jenis rusak x 5 pada laporan kompensasi', async () => {
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
    expect(body.data[0].totalKompensasi).toBe(200); // 40 * 5 = 200
  });
});
