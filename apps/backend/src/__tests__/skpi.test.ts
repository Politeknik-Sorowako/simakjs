import { beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import { dosen, mahasiswa, programStudi, userProdiScopes, users } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

async function api(token: string, method: string, path: string, body?: unknown) {
  const response = await app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
  return { status: response.status, data: (await response.json()) as Record<string, unknown> };
}

describe('Modul SKPI — Rekaman Kegiatan Mahasiswa', () => {
  let adminToken: string;
  let mhsToken: string;
  let mhs2Token: string;
  let paToken: string;
  let otherDosenToken: string;
  let kemaToken: string;
  let prodiToken: string;
  let prodiId: number;
  let otherProdiId: number;
  let mhsId: number;
  let mhs2Id: number;
  let paDosenId: number;
  let kategoriId: number;

  beforeEach(async () => {
    await clearDatabase();

    adminToken = await getAuthToken('admin@test.com', 'admin');
    mhsToken = await getAuthToken('mhs@test.com', 'mahasiswa');
    mhs2Token = await getAuthToken('mhs2@test.com', 'mahasiswa');
    paToken = await getAuthToken('pa@test.com', 'dosen');
    otherDosenToken = await getAuthToken('dosenlain@test.com', 'dosen');
    kemaToken = await getAuthToken('kema@test.com', 'kemahasiswaan');
    prodiToken = await getAuthToken('prodi@test.com', 'prodi');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: 'IF', nama: 'Informatika', jenjang: 'D4' })
      .returning();
    prodiId = prodi.id;
    const [prodi2] = await db
      .insert(programStudi)
      .values({ kode: 'TM', nama: 'Teknik Mesin', jenjang: 'D3' })
      .returning();
    otherProdiId = prodi2.id;

    // Kemahasiswaan di-scope ke prodi lain (out-of-scope untuk mahasiswa test)
    const [kemaUser] = await db.select().from(users).where(eq(users.email, 'kema@test.com'));
    await db.insert(userProdiScopes).values({ userId: kemaUser.id, programStudiId: otherProdiId });

    // Prodi in-scope (verifikator non-admin) untuk menguji batas hapus.
    const [prodiUser] = await db.select().from(users).where(eq(users.email, 'prodi@test.com'));
    await db.insert(userProdiScopes).values({ userId: prodiUser.id, programStudiId: prodiId });

    const [pa] = await db
      .insert(dosen)
      .values({
        nip: '1900000001',
        nama: 'Dosen PA SKPI',
        email: 'pa@test.com',
        programStudiId: prodiId,
        jenisKelamin: 'L',
        nik: '1111111111111111',
        tanggalLahir: '1980-01-01',
      })
      .returning();
    paDosenId = pa.id;

    await db.insert(dosen).values({
      nip: '1900000002',
      nama: 'Dosen Lain',
      email: 'dosenlain@test.com',
      programStudiId: prodiId,
      jenisKelamin: 'L',
      nik: '2222222222222222',
      tanggalLahir: '1981-01-01',
    });

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20240001',
        nama: 'Mahasiswa SKPI',
        email: 'mhs@test.com',
        programStudiId: prodiId,
        dosenPaId: paDosenId,
        status: 'aktif',
        namaIbuKandung: 'Ibu A',
        nik: '3333333333333333',
        jenisKelamin: 'L',
        tanggalLahir: '2004-01-01',
      })
      .returning();
    mhsId = mhs.id;

    const [mhs2] = await db
      .insert(mahasiswa)
      .values({
        nim: '20240002',
        nama: 'Mahasiswa Dua',
        email: 'mhs2@test.com',
        programStudiId: prodiId,
        dosenPaId: paDosenId,
        status: 'aktif',
        namaIbuKandung: 'Ibu B',
        nik: '4444444444444444',
        jenisKelamin: 'P',
        tanggalLahir: '2004-02-02',
      })
      .returning();
    mhs2Id = mhs2.id;

    const created = await api(adminToken, 'POST', '/skpi/kategori', {
      nama: 'Pelatihan',
      jenis: 'pelatihan',
      poinDefault: 10,
    });
    expect(created.status).toBe(201);
    kategoriId = created.data.id as number;
  });

  it('Mahasiswa dapat input rekaman kegiatan (status pending, poin dari kategori)', async () => {
    const res = await api(mhsToken, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Pelatihan Jaringan Dasar',
      penyelenggara: 'Politeknik Sorowako',
      tanggalMulai: '2026-03-01',
    });
    expect(res.status).toBe(201);
    expect(res.data.status).toBe('pending');
    expect(res.data.poin).toBe(10);
    expect(res.data.mahasiswaId).toBe(mhsId);
  });

  it('Mahasiswa tidak boleh membuat kategori (403)', async () => {
    const res = await api(mhsToken, 'POST', '/skpi/kategori', { nama: 'Seminar', jenis: 'seminar' });
    expect(res.status).toBe(403);
  });

  it('Mahasiswa hanya melihat rekaman miliknya sendiri', async () => {
    await api(mhsToken, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Kegiatan MHS1',
      tanggalMulai: '2026-03-01',
    });
    await api(mhs2Token, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Kegiatan MHS2',
      tanggalMulai: '2026-03-02',
    });

    const res = await api(mhsToken, 'GET', '/skpi/kegiatan');
    expect(res.status).toBe(200);
    const rows = res.data.data as Array<Record<string, unknown>>;
    expect(rows.length).toBe(1);
    expect(rows[0].namaKegiatan).toBe('Kegiatan MHS1');
  });

  it('Edit rekaman pending berhasil; edit rekaman diverifikasi ditolak (400)', async () => {
    const created = await api(mhsToken, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Seminar AI',
      tanggalMulai: '2026-03-01',
    });
    const id = created.data.id as number;

    const edited = await api(mhsToken, 'PUT', `/skpi/kegiatan/${id}`, { namaKegiatan: 'Seminar AI Lanjutan' });
    expect(edited.status).toBe(200);
    expect(edited.data.namaKegiatan).toBe('Seminar AI Lanjutan');

    await api(adminToken, 'PUT', `/skpi/kegiatan/${id}/verifikasi`, { action: 'approve' });
    const frozen = await api(mhsToken, 'PUT', `/skpi/kegiatan/${id}`, { namaKegiatan: 'Tidak Boleh' });
    expect(frozen.status).toBe(400);
  });

  it('Reject tanpa catatan ditolak (400); reject dengan catatan menjadi ditolak lalu resubmit ke pending', async () => {
    const created = await api(mhsToken, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Workshop',
      tanggalMulai: '2026-03-01',
    });
    const id = created.data.id as number;

    const noCatatan = await api(paToken, 'PUT', `/skpi/kegiatan/${id}/verifikasi`, { action: 'reject' });
    expect(noCatatan.status).toBe(400);

    const rejected = await api(paToken, 'PUT', `/skpi/kegiatan/${id}/verifikasi`, {
      action: 'reject',
      catatan: 'Bukti sertifikat tidak terbaca',
    });
    expect(rejected.status).toBe(200);
    expect(rejected.data.status).toBe('ditolak');

    const resubmit = await api(mhsToken, 'PUT', `/skpi/kegiatan/${id}`, { namaKegiatan: 'Workshop V2' });
    expect(resubmit.status).toBe(200);
    expect(resubmit.data.status).toBe('pending');
    expect(resubmit.data.catatanVerifikator).toBeNull();
  });

  it('Dosen bukan PA tidak dapat memverifikasi (403); Dosen PA approve menjadi diverifikasi', async () => {
    const created = await api(mhsToken, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Pelatihan K3',
      tanggalMulai: '2026-03-01',
    });
    const id = created.data.id as number;

    const byOther = await api(otherDosenToken, 'PUT', `/skpi/kegiatan/${id}/verifikasi`, { action: 'approve' });
    expect(byOther.status).toBe(403);

    const byPa = await api(paToken, 'PUT', `/skpi/kegiatan/${id}/verifikasi`, { action: 'approve', poin: 15 });
    expect(byPa.status).toBe(200);
    expect(byPa.data.status).toBe('diverifikasi');
    expect(byPa.data.poin).toBe(15);
    expect(byPa.data.verifiedById).not.toBeNull();
  });

  it('Mahasiswa tidak dapat memverifikasi (403) dan tidak dapat menghapus rekaman diverifikasi (400)', async () => {
    const created = await api(mhsToken, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Kegiatan X',
      tanggalMulai: '2026-03-01',
    });
    const id = created.data.id as number;

    const verify = await api(mhsToken, 'PUT', `/skpi/kegiatan/${id}/verifikasi`, { action: 'approve' });
    expect(verify.status).toBe(403);

    await api(adminToken, 'PUT', `/skpi/kegiatan/${id}/verifikasi`, { action: 'approve' });
    const del = await api(mhsToken, 'DELETE', `/skpi/kegiatan/${id}`);
    expect(del.status).toBe(400);
  });

  it('Mahasiswa dapat menghapus rekaman pending miliknya sendiri', async () => {
    const created = await api(mhsToken, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Bisa Dihapus',
      tanggalMulai: '2026-03-01',
    });
    const id = created.data.id as number;
    const del = await api(mhsToken, 'DELETE', `/skpi/kegiatan/${id}`);
    expect(del.status).toBe(200);

    const list = await api(mhsToken, 'GET', '/skpi/kegiatan');
    expect((list.data.data as unknown[]).length).toBe(0);
  });

  it('Staf out-of-scope prodi tidak dapat memverifikasi / input untuk mahasiswa (403)', async () => {
    const created = await api(mhsToken, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Kegiatan Scope',
      tanggalMulai: '2026-03-01',
    });
    const id = created.data.id as number;

    const verify = await api(kemaToken, 'PUT', `/skpi/kegiatan/${id}/verifikasi`, { action: 'approve' });
    expect(verify.status).toBe(403);

    const createFor = await api(kemaToken, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Input Liar',
      tanggalMulai: '2026-03-01',
      mahasiswaId: mhsId,
    });
    expect(createFor.status).toBe(403);
  });

  it('Admin dapat input rekaman untuk mahasiswa (dengan mahasiswaId)', async () => {
    const res = await api(adminToken, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Input Admin',
      tanggalMulai: '2026-03-01',
      mahasiswaId: mhs2Id,
    });
    expect(res.status).toBe(201);
    expect(res.data.mahasiswaId).toBe(mhs2Id);
    expect(res.data.createdById).toBeGreaterThan(0);
  });

  it('Mahasiswa dapat memfilter mahasiswaId sendiri, ditolak untuk milik mahasiswa lain (403)', async () => {
    await api(mhs2Token, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Milik MHS2',
      tanggalMulai: '2026-03-01',
    });

    const own = await api(mhsToken, 'GET', `/skpi/kegiatan?mahasiswaId=${mhsId}`);
    expect(own.status).toBe(200);

    const other = await api(mhsToken, 'GET', `/skpi/kegiatan?mahasiswaId=${mhs2Id}`);
    expect(other.status).toBe(403);
  });

  it('Dosen PA dapat memfilter mahasiswaId bimbingannya; mahasiswa non-bimbingan 403', async () => {
    const [outsider] = await db
      .insert(mahasiswa)
      .values({
        nim: '20240099',
        nama: 'Mahasiswa Luar',
        email: 'luar@test.com',
        programStudiId: prodiId,
        status: 'aktif',
        namaIbuKandung: 'Ibu C',
        nik: '5555555555555555',
        jenisKelamin: 'L',
        tanggalLahir: '2004-03-03',
      })
      .returning();

    const own = await api(paToken, 'GET', `/skpi/kegiatan?mahasiswaId=${mhsId}`);
    expect(own.status).toBe(200);

    const notAdvised = await api(paToken, 'GET', `/skpi/kegiatan?mahasiswaId=${outsider.id}`);
    expect(notAdvised.status).toBe(403);
  });

  it('Staf verifier non-admin tidak dapat menghapus rekaman (403), meski in-scope', async () => {
    const created = await api(mhsToken, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Hapus Oleh Prodi',
      tanggalMulai: '2026-03-01',
    });
    const id = created.data.id as number;

    const delPending = await api(prodiToken, 'DELETE', `/skpi/kegiatan/${id}`);
    expect(delPending.status).toBe(403);

    await api(adminToken, 'PUT', `/skpi/kegiatan/${id}/verifikasi`, { action: 'approve' });
    const delVerified = await api(prodiToken, 'DELETE', `/skpi/kegiatan/${id}`);
    expect(delVerified.status).toBe(403);
  });

  it('Dosen PA tidak dapat menghapus rekaman mahasiswanya (403)', async () => {
    const created = await api(mhsToken, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Hapus Oleh PA',
      tanggalMulai: '2026-03-01',
    });
    const id = created.data.id as number;

    const del = await api(paToken, 'DELETE', `/skpi/kegiatan/${id}`);
    expect(del.status).toBe(403);
  });

  it('Admin dapat menghapus rekaman (termasuk terverifikasi)', async () => {
    const created = await api(mhsToken, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Hapus Oleh Admin',
      tanggalMulai: '2026-03-01',
    });
    const id = created.data.id as number;
    await api(adminToken, 'PUT', `/skpi/kegiatan/${id}/verifikasi`, { action: 'approve' });

    const del = await api(adminToken, 'DELETE', `/skpi/kegiatan/${id}`);
    expect(del.status).toBe(200);
  });

  it('Verifikasi ganda ditolak (hanya dari pending)', async () => {
    const created = await api(mhsToken, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Sekali Verifikasi',
      tanggalMulai: '2026-03-01',
    });
    const id = created.data.id as number;

    const first = await api(paToken, 'PUT', `/skpi/kegiatan/${id}/verifikasi`, { action: 'approve' });
    expect(first.status).toBe(200);

    const second = await api(adminToken, 'PUT', `/skpi/kegiatan/${id}/verifikasi`, { action: 'reject', catatan: 'x' });
    expect(second.status).toBe(400);
  });
});
