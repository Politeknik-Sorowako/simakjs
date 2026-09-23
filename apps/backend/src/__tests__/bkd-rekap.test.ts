import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import {
  bap,
  dosen,
  dosenPengajarKelas,
  kelasKuliah,
  mahasiswa,
  mataKuliah,
  periodeAkademik,
  presensi,
  programStudi,
} from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

describe('BKD Rekap', () => {
  let adminToken: string;
  let dosenToken: string;
  let dosenId: number;
  let mhsId: number;
  const periodeId = '20251';

  beforeEach(async () => {
    await clearDatabase();

    adminToken = await getAuthToken('admin_bkd@test.com', 'admin');
    dosenToken = await getAuthToken('dosen_bkd@test.com', 'dosen');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: `BKD_${Date.now()}`, nama: 'Teknik Mesin', jenjang: 'D4' })
      .returning();

    const [dosenRow] = await db
      .insert(dosen)
      .values({
        nip: `NIP_${Date.now()}`,
        nama: 'Dosen BKD',
        email: 'dosen_bkd@test.com',
        programStudiId: prodi.id,
        nidn: `NIDN_${Date.now()}`,
      })
      .returning();
    dosenId = dosenRow.id;

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20250099',
        nama: 'Mahasiswa BKD',
        email: 'mhs_bkd@test.com',
        programStudiId: prodi.id,
        status: 'aktif',
        namaIbuKandung: 'Ibu BKD',
        nik: '1234567890123599',
        jenisKelamin: 'L',
        tanggalLahir: '2003-01-01',
      })
      .returning();
    mhsId = mhs.id;

    await db.insert(periodeAkademik).values({ id: periodeId, nama: 'Ganjil 2025/2026', aktif: true });

    const [mk] = await db
      .insert(mataKuliah)
      .values({ programStudiId: prodi.id, kode: `MKB_${Date.now()}`, nama: 'Matematika', sksTotal: 3 })
      .returning();
    const [kelas] = await db.insert(kelasKuliah).values({ mataKuliahId: mk.id, periodeId, namaKelas: 'A' }).returning();
    await db.insert(dosenPengajarKelas).values({ dosenId, kelasKuliahId: kelas.id, sksBebanMengajar: 3 });

    const [bapRow] = await db
      .insert(bap)
      .values({
        kelasKuliahId: kelas.id,
        tanggal: '2025-09-01',
        pertemuanKe: 1,
        tema: 'Kontrak Kuliah',
        materi: 'Pengantar',
        catatan: 'Sesi pertama',
        durasiMenit: 100,
        dosenId,
      })
      .returning();
    await db.insert(presensi).values({ bapId: bapRow.id, mahasiswaId: mhsId, status: 'hadir', durasiMangkir: 0 });
  });

  it('BKD rekap: admin bisa filter dosenId manapun', async () => {
    const res = await app.handle(
      new Request(`http://localhost/bkd/rekap?dosenId=${dosenId}&periodeId=${periodeId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        mengajar: unknown[];
        ringkasan: { totalSks: number };
      };
    };
    expect(body.data.mengajar).toHaveLength(1);
    expect(body.data.ringkasan.totalSks).toBe(3);
  });

  it('BKD rekap: pertemuan membawa detail BAP & rekap presensi agregat per mahasiswa', async () => {
    const res = await app.handle(
      new Request(`http://localhost/bkd/rekap?dosenId=${dosenId}&periodeId=${periodeId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        mengajar: {
          kelasId: number;
          pertemuan: {
            bapId: number;
            tema: string | null;
            catatan: string | null;
            presensiRingkasan: { hadir: number; total: number };
          }[];
        }[];
        rekapPresensi: {
          kelasId: number;
          mahasiswa: { nim: string; nama: string; hadir: number; totalKehadiran: number; persentaseHadir: number }[];
        }[];
      };
    };

    const kelas = body.data.mengajar[0];
    expect(kelas.pertemuan).toHaveLength(1);
    expect(kelas.pertemuan[0]).toMatchObject({
      tema: 'Kontrak Kuliah',
      catatan: 'Sesi pertama',
      presensiRingkasan: { hadir: 1, total: 1 },
    });
    expect(kelas.pertemuan[0].bapId).toBeGreaterThan(0);

    const rekap = body.data.rekapPresensi[0];
    expect(rekap.mahasiswa).toHaveLength(1);
    expect(rekap.mahasiswa[0]).toMatchObject({
      nim: '20250099',
      nama: 'Mahasiswa BKD',
      hadir: 1,
      totalKehadiran: 1,
      persentaseHadir: 100,
    });
  });

  it('BKD rekap: dosen dipaksa self dan tetap berhasil', async () => {
    const res = await app.handle(
      new Request(`http://localhost/bkd/rekap?periodeId=${periodeId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${dosenToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { ringkasan: { totalSks: number } } };
    expect(body.data.ringkasan.totalSks).toBe(3);
  });

  it('BKD rekap: dosen mengabaikan dosenId query orang lain (self-only)', async () => {
    const res = await app.handle(
      new Request(`http://localhost/bkd/rekap?dosenId=999999&periodeId=${periodeId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${dosenToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { ringkasan: { totalSks: number } } };
    expect(body.data.ringkasan.totalSks).toBe(3);
  });

  it('BKD rekap: dosen dengan dosenId=0 (placeholder) tetap memuat data sendiri', async () => {
    const res = await app.handle(
      new Request(`http://localhost/bkd/rekap?dosenId=0&periodeId=${periodeId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${dosenToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { ringkasan: { totalSks: number } } };
    expect(body.data.ringkasan.totalSks).toBe(3);
  });

  it('BKD rekap: prodi bisa mereview laporan dosen manapun', async () => {
    const prodiToken = await getAuthToken('prodi_bkd@test.com', 'prodi');
    const res = await app.handle(
      new Request(`http://localhost/bkd/rekap?dosenId=${dosenId}&periodeId=${periodeId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${prodiToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { ringkasan: { totalSks: number } } };
    expect(body.data.ringkasan.totalSks).toBe(3);
  });

  it('BKD rekap: non-dosen tanpa dosenId ditolak (400)', async () => {
    const res = await app.handle(
      new Request(`http://localhost/bkd/rekap?periodeId=${periodeId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('BKD rekap: periode wajib (422 bila kosong dari schema)', async () => {
    const res = await app.handle(
      new Request('http://localhost/bkd/rekap', {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(422);
  });

  it('BKD rekap: mahasiswa ditolak (403)', async () => {
    const mhsToken = await getAuthToken('mhs_bkd@test.com', 'mahasiswa');
    const res = await app.handle(
      new Request(`http://localhost/bkd/rekap?periodeId=${periodeId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${mhsToken}` },
      }),
    );
    expect(res.status).toBe(403);
  });
});
