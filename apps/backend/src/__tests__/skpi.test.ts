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

/** Kirim CSV via multipart/form-data (field `file`, pola upload lampiran). */
async function apiForm(token: string, path: string, csv: string, fileName = 'kegiatan.csv') {
  const form = new FormData();
  form.append('file', new File([csv], fileName, { type: 'text/csv' }));
  const response = await app.handle(
    new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
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

  it('Search mencocokkan NIM/nama mahasiswa, bukan hanya nama kegiatan/penyelenggara', async () => {
    await api(mhsToken, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Seminar Nasional XYZ',
      tanggalMulai: '2026-03-01',
    });
    await api(mhs2Token, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Workshop Lain',
      tanggalMulai: '2026-03-02',
    });

    // Cari pakai NIM mhs (20240001) → hanya rekaman milik mhs.
    const byNim = await api(prodiToken, 'GET', '/skpi/kegiatan?search=20240001');
    expect(byNim.status).toBe(200);
    const rowsNim = byNim.data.data as Array<Record<string, unknown>>;
    expect(rowsNim.length).toBe(1);
    expect((rowsNim[0].mahasiswa as Record<string, unknown>).nim).toBe('20240001');

    // Cari pakai nama mahasiswa mhs2 ("Mahasiswa Dua") → hanya rekaman milik mhs2.
    const byNama = await api(prodiToken, 'GET', '/skpi/kegiatan?search=Mahasiswa%20Dua');
    expect(byNama.status).toBe(200);
    const rowsNama = byNama.data.data as Array<Record<string, unknown>>;
    expect(rowsNama.length).toBe(1);
    expect((rowsNama[0].mahasiswa as Record<string, unknown>).nama).toBe('Mahasiswa Dua');
  });

  it('Filter prodiId: staf in-scope 200 terfilter; di luar lingkup 403; admin global 200', async () => {
    await api(mhsToken, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Kegiatan Prodi IF',
      tanggalMulai: '2026-03-01',
    });

    // Prodi (scope = prodiId) memfilter prodiId miliknya → 200 dengan data.
    const inScope = await api(prodiToken, 'GET', `/skpi/kegiatan?prodiId=${prodiId}`);
    expect(inScope.status).toBe(200);
    expect((inScope.data.data as unknown[]).length).toBe(1);

    // Prodi memfilter prodi di luar lingkupnya → 403.
    const outScope = await api(prodiToken, 'GET', `/skpi/kegiatan?prodiId=${otherProdiId}`);
    expect(outScope.status).toBe(403);

    // Kemahasiswaan (scope = otherProdiId) memfilter prodiId test → 403.
    const kemaOut = await api(kemaToken, 'GET', `/skpi/kegiatan?prodiId=${prodiId}`);
    expect(kemaOut.status).toBe(403);

    // Admin global memfilter prodi mana pun → 200.
    const adminAny = await api(adminToken, 'GET', `/skpi/kegiatan?prodiId=${prodiId}`);
    expect(adminAny.status).toBe(200);
    expect((adminAny.data.data as unknown[]).length).toBe(1);
  });

  /** Buat rekaman pending + approve, kembalikan id. */
  async function createAndVerify(namaKegiatan: string): Promise<number> {
    const created = await api(mhsToken, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan,
      tanggalMulai: '2026-03-01',
    });
    const id = created.data.id as number;
    const verified = await api(adminToken, 'PUT', `/skpi/kegiatan/${id}/verifikasi`, { action: 'approve', poin: 10 });
    expect(verified.status).toBe(200);
    return id;
  }

  it('Unverify: admin membatalkan hasil verifikasi (diverifikasi & ditolak → pending, metadata nol)', async () => {
    const id = await createAndVerify('Akan Dibatalkan');
    const unverified = await api(adminToken, 'PUT', `/skpi/kegiatan/${id}/unverify`);
    expect(unverified.status).toBe(200);
    expect(unverified.data.status).toBe('pending');
    expect(unverified.data.verifiedById).toBeNull();
    expect(unverified.data.verifiedAt).toBeNull();
    expect(unverified.data.catatanVerifikator).toBeNull();

    // Rekaman pending bisa diverifikasi ulang.
    const reVerify = await api(adminToken, 'PUT', `/skpi/kegiatan/${id}/verifikasi`, { action: 'approve' });
    expect(reVerify.status).toBe(200);

    // Unverify lagi (→ pending) lalu reject dari pending; ditolak lalu
    // dibatalkan juga bisa.
    const unverifyAgain = await api(adminToken, 'PUT', `/skpi/kegiatan/${id}/unverify`);
    expect(unverifyAgain.status).toBe(200);
    const reject = await api(adminToken, 'PUT', `/skpi/kegiatan/${id}/verifikasi`, {
      action: 'reject',
      catatan: 'salah',
    });
    expect(reject.status).toBe(200);
    const unverifyRejected = await api(adminToken, 'PUT', `/skpi/kegiatan/${id}/unverify`);
    expect(unverifyRejected.status).toBe(200);
    expect(unverifyRejected.data.status).toBe('pending');
  });

  it('Unverify: pending → 400; bukan staff-verifier → 403; staf di luar lingkup → 403', async () => {
    const created = await api(mhsToken, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Masih Pending',
      tanggalMulai: '2026-03-01',
    });
    const pendingId = created.data.id as number;

    const onPending = await api(adminToken, 'PUT', `/skpi/kegiatan/${pendingId}/unverify`);
    expect(onPending.status).toBe(400);

    const id = await createAndVerify('Untuk Uji Otorisasi');
    const byPa = await api(paToken, 'PUT', `/skpi/kegiatan/${id}/unverify`);
    expect(byPa.status).toBe(403);
    const byMhs = await api(mhsToken, 'PUT', `/skpi/kegiatan/${id}/unverify`);
    expect(byMhs.status).toBe(403);

    // Prodi di-scope prodiId (in-scope) → boleh; kemahasiswaan di otherProdiId → 403.
    const byProdi = await api(prodiToken, 'PUT', `/skpi/kegiatan/${id}/unverify`);
    expect(byProdi.status).toBe(200);

    const id2 = await createAndVerify('Untuk Uji Scope');
    const kemaOut = await api(kemaToken, 'PUT', `/skpi/kegiatan/${id2}/unverify`);
    expect(kemaOut.status).toBe(403);
  });

  it('Edit hasil verifikasi: admin mengubah poin & catatan tanpa mengubah status; pending → 400; non-staf → 403', async () => {
    const id = await createAndVerify('Hasil Dievaluasi Ulang');

    const edited = await api(adminToken, 'PUT', `/skpi/kegiatan/${id}/hasil-verifikasi`, {
      poin: 25,
      catatan: 'Poin disesuaikan hasil peninjauan.',
    });
    expect(edited.status).toBe(200);
    expect(edited.data.status).toBe('diverifikasi');
    expect(edited.data.poin).toBe(25);
    expect(edited.data.catatanVerifikator).toBe('Poin disesuaikan hasil peninjauan.');

    // Kosongkan catatan → null.
    const cleared = await api(adminToken, 'PUT', `/skpi/kegiatan/${id}/hasil-verifikasi`, { catatan: '   ' });
    expect(cleared.status).toBe(200);
    expect(cleared.data.catatanVerifikator).toBeNull();

    const created = await api(mhsToken, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Pending Tidak Boleh',
      tanggalMulai: '2026-03-01',
    });
    const onPending = await api(adminToken, 'PUT', `/skpi/kegiatan/${created.data.id as number}/hasil-verifikasi`, {
      poin: 5,
    });
    expect(onPending.status).toBe(400);

    const byMhs = await api(mhsToken, 'PUT', `/skpi/kegiatan/${id}/hasil-verifikasi`, { poin: 1 });
    expect(byMhs.status).toBe(403);
    const byPa = await api(paToken, 'PUT', `/skpi/kegiatan/${id}/hasil-verifikasi`, { poin: 1 });
    expect(byPa.status).toBe(403);
  });

  // ── Impor CSV (staf-verifier) ───────────────────────────────────────────────

  it('Impor CSV: baris valid → pending; NIM/kategori salah → error per baris; header wajib', async () => {
    const csv = [
      'nim,nama_kategori,nama_kegiatan,tanggal_mulai,tanggal_selesai,penyelenggara,lokasi,nomor_sertifikat',
      '20240001,Pelatihan,Impor Pelatihan Jaringan,2026-04-01,2026-04-02,Poltek,Aula,SRT-01',
      '20240002,Pelatihan,Impor Seminar Dasar,2026-04-05,,,',
      '99999999,Pelatihan,Kegiatan NIM Salah,2026-04-06,,,',
      '20240001,Kategori Hilang,Kegiatan Salah Kategori,2026-04-07,,,',
    ].join('\n');

    const res = await apiForm(adminToken, '/skpi/kegiatan/import', csv);
    expect(res.status).toBe(200);
    expect(res.data.successCount).toBe(2);
    expect(res.data.skippedCount).toBe(0);
    const errors = res.data.errors as Array<{ line: number; error: string }>;
    expect(errors.length).toBe(2);
    expect(errors[0].error).toContain('99999999');
    expect(errors[1].error).toContain('Kategori Hilang');

    // Hasil impor berstatus pending & poin mengikuti kategori (10).
    const list = await api(adminToken, 'GET', '/skpi/kegiatan?limit=50');
    expect((list.data.meta as Record<string, unknown>).total).toBe(2);
    const rows = list.data.data as Array<Record<string, unknown>>;
    expect(rows.every((r) => r.status === 'pending' && r.poin === 10)).toBe(true);

    // Header salah → sukses 0 + error baris 1.
    const badHeader = await apiForm(adminToken, '/skpi/kegiatan/import', 'foo,bar\n1,2');
    expect(badHeader.status).toBe(200);
    expect(badHeader.data.successCount).toBe(0);
    expect((badHeader.data.errors as Array<{ line: number }>)[0].line).toBe(1);
  });

  it('Impor CSV: hanya staf; kategori nonaktif & NIM di luar scope jadi error per baris; file wajib', async () => {
    // Bukan staf → 403.
    const byMhs = await apiForm(mhsToken, '/skpi/kegiatan/import', 'nim,nama_kategori,nama_kegiatan,tanggal_mulai');
    expect(byMhs.status).toBe(403);

    // Kategori dinonaktifkan → barisnya gagal.
    const kat = await api(adminToken, 'POST', '/skpi/kategori', { nama: 'Webinar', jenis: 'seminar', poinDefault: 5 });
    expect(kat.status).toBe(201);
    await api(adminToken, 'PUT', `/skpi/kategori/${kat.data.id as number}`, { isAktif: false });
    const inactive = await apiForm(
      adminToken,
      '/skpi/kegiatan/import',
      ['nim,nama_kategori,nama_kegiatan,tanggal_mulai', '20240001,Webinar,Webinar Batal,2026-04-01'].join('\n'),
    );
    expect(inactive.data.successCount).toBe(0);
    expect((inactive.data.errors as Array<{ error: string }>)[0].error).toContain('nonaktif');

    // Kemahasiswaan out-of-scope: baris mahasiswa prodi IF tetap masuk per-baris error, bukan 403 utuh.
    const byKema = await apiForm(
      kemaToken,
      '/skpi/kegiatan/import',
      ['nim,nama_kategori,nama_kegiatan,tanggal_mulai', '20240001,Pelatihan,Lintas Scope,2026-04-01'].join('\n'),
    );
    expect(byKema.status).toBe(200);
    expect(byKema.data.successCount).toBe(0);
    expect((byKema.data.errors as Array<{ error: string }>)[0].error).toContain('luar lingkup');

    // Tanpa field file → validasi schema 422.
    const empty = new FormData();
    const noFile = await app.handle(
      new Request('http://localhost/skpi/kegiatan/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: empty,
      }),
    );
    expect(noFile.status).toBe(422);
  });

  // ── Verifikasi massal ───────────────────────────────────────────────────────

  it('Verifikasi massal: approve pending sekaligus; non-pending & id tak dikenal masuk failed', async () => {
    const ids: number[] = [];
    for (const nama of ['Bulk A', 'Bulk B', 'Bulk C']) {
      const created = await api(mhsToken, 'POST', '/skpi/kegiatan', {
        kategoriKegiatanId: kategoriId,
        namaKegiatan: nama,
        tanggalMulai: '2026-03-01',
      });
      expect(created.status).toBe(201);
      ids.push(created.data.id as number);
    }
    // Rekaman C diverifikasi tunggal lebih dulu (bukan pending lagi).
    const preApprove = await api(adminToken, 'PUT', `/skpi/kegiatan/${ids[2]}/verifikasi`, { action: 'approve' });
    expect(preApprove.status).toBe(200);

    const res = await api(adminToken, 'POST', '/skpi/kegiatan/verifikasi-bulk', {
      ids: [...ids, 999999],
    });
    expect(res.status).toBe(200);
    expect(res.data.approvedCount).toBe(2);
    expect(res.data.failedCount).toBe(2);
    expect(res.data.approved).toEqual([ids[0], ids[1]]);
    const failed = res.data.failed as Array<{ id: number; error: string }>;
    expect(failed.find((f) => f.id === ids[2])?.error).toContain('PENDING');
    expect(failed.find((f) => f.id === 999999)?.error).toContain('tidak ditemukan');

    const verified = await api(adminToken, 'GET', '/skpi/kegiatan?status=diverifikasi&limit=50');
    expect((verified.data.meta as Record<string, unknown>).total).toBe(3);
  });

  it('Verifikasi massal: mahasiswa 403; dosen non-PA seluruh baris gagal otorisasi', async () => {
    const created = await api(mhsToken, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Untuk Bulk Otorisasi',
      tanggalMulai: '2026-03-01',
    });
    const id = created.data.id as number;

    const byMhs = await api(mhsToken, 'POST', '/skpi/kegiatan/verifikasi-bulk', { ids: [id] });
    expect(byMhs.status).toBe(403);

    // Dosen non-PA lolos cek role, tetapi barisnya ditolak authorizeVerify.
    const byOther = await api(otherDosenToken, 'POST', '/skpi/kegiatan/verifikasi-bulk', { ids: [id] });
    expect(byOther.status).toBe(200);
    expect(byOther.data.approvedCount).toBe(0);
    expect(byOther.data.failedCount).toBe(1);
    expect((byOther.data.failed as Array<{ error: string }>)[0].error).toContain('Dosen Pendamping');

    // Rekaman tetap pending (tidak ada yang lolos).
    const pending = await api(adminToken, 'GET', '/skpi/kegiatan?status=pending');
    expect((pending.data.meta as Record<string, unknown>).total).toBe(1);
  });

  it('Verifikasi massal: validasi schema — lebih dari 100 id & array kosong ditolak 422', async () => {
    const tooMany = Array.from({ length: 101 }, (_, i) => i + 1);
    const res1 = await api(adminToken, 'POST', '/skpi/kegiatan/verifikasi-bulk', { ids: tooMany });
    expect(res1.status).toBe(422);
    const res2 = await api(adminToken, 'POST', '/skpi/kegiatan/verifikasi-bulk', { ids: [] });
    expect(res2.status).toBe(422);
  });

  // ── Tab Penerbitan ──────────────────────────────────────────────────────────

  it('Penerbitan: agregat ≥1 item per mahasiswa, gate siapTerbit, otorisasi peran & scope', async () => {
    // mhsId: 1 terverifikasi + 1 pending; mhs2Id: 1 pending saja (di luar syarat min=1).
    const v = await api(mhsToken, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Sudah Diverifikasi',
      tanggalMulai: '2026-03-01',
    });
    await api(adminToken, 'PUT', `/skpi/kegiatan/${v.data.id as number}/verifikasi`, { action: 'approve' });
    await api(mhsToken, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Masih Pending Mhs 1',
      tanggalMulai: '2026-03-02',
    });
    await api(mhs2Token, 'POST', '/skpi/kegiatan', {
      kategoriKegiatanId: kategoriId,
      namaKegiatan: 'Pending Saja Mhs 2',
      tanggalMulai: '2026-03-03',
    });

    const res = await api(adminToken, 'GET', '/skpi/penerbitan');
    expect(res.status).toBe(200);
    const data = res.data.data as Array<Record<string, unknown>>;
    expect(data.length).toBe(2);
    const row1 = data.find((d) => d.mahasiswaId === mhsId) as Record<string, unknown>;
    const row2 = data.find((d) => d.mahasiswaId === mhs2Id) as Record<string, unknown>;
    expect(row1.diverifikasi).toBe(1);
    expect(row1.pending).toBe(1);
    expect(row1.totalKegiatan).toBe(2);
    expect(row1.totalPoin).toBe(10);
    expect((row1.syarat as Record<string, unknown>).terpenuhi).toBe(true);
    expect((row2.syarat as Record<string, unknown>).terpenuhi).toBe(false);
    expect(row1.signature).toBeNull();

    // Gate siap terbit: hanya mahasiswa yang syaratnya terpenuhi.
    const siap = await api(adminToken, 'GET', '/skpi/penerbitan?siapTerbit=true');
    const siapData = siap.data.data as Array<Record<string, unknown>>;
    expect(siapData.length).toBe(1);
    expect(siapData[0].mahasiswaId).toBe(mhsId);

    // Search NIM.
    const search = await api(adminToken, 'GET', `/skpi/penerbitan?search=${row2.nim as string}`);
    expect((search.data.data as Array<Record<string, unknown>>).length).toBe(1);

    // Otorisasi: mahasiswa & dosen ditolak; staf out-of-scope pada filter prodi ditolak 403.
    expect((await api(mhsToken, 'GET', '/skpi/penerbitan')).status).toBe(403);
    expect((await api(paToken, 'GET', '/skpi/penerbitan')).status).toBe(403);
    expect((await api(kemaToken, 'GET', `/skpi/penerbitan?prodiId=${prodiId}`)).status).toBe(403);
    expect((await api(prodiToken, 'GET', '/skpi/penerbitan')).status).toBe(200);
    // Kemahasiswaan (scope prodi lain) tidak melihat mahasiswa prodi IF.
    const scopedOut = await api(kemaToken, 'GET', '/skpi/penerbitan');
    expect((scopedOut.data.data as unknown[]).length).toBe(0);
  });
});
