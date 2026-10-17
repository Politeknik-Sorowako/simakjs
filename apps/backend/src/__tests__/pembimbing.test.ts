import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { app } from '../app';
import {
  bimbingan,
  dosen,
  mahasiswa,
  pembimbingMahasiswa,
  periodeAkademik,
  programStudi,
  userProdiScopes,
  users,
} from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

interface DosenRow {
  id: number;
  nip: string;
  email: string;
}

interface MhsRow {
  id: number;
  nim: string;
  email: string;
}

describe('Modul Penetapan Pembimbing (PKL & Tugas Akhir)', () => {
  let adminToken: string;
  let prodiA: { id: number; kode: string };
  let prodiB: { id: number; kode: string };
  let dosenA: DosenRow;
  let dosenA2: DosenRow;
  let dosenB: DosenRow;
  let mhsA1: MhsRow;
  let mhsA2: MhsRow;
  let mhsB1: MhsRow;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

  async function createProdi(kode: string, nama: string) {
    const [row] = await db
      .insert(programStudi)
      .values({ kode, nama, jenjang: 'D3' })
      .onConflictDoUpdate({ target: programStudi.kode, set: { nama } })
      .returning();
    return row;
  }

  async function createDosen(nip: string, nama: string, email: string, prodiId: number) {
    const [row] = await db
      .insert(dosen)
      .values({ nip, nama, email, programStudiId: prodiId, jenisKelamin: 'L', tanggalLahir: '1985-05-05' })
      .onConflictDoUpdate({ target: dosen.nip, set: { nama, programStudiId: prodiId } })
      .returning();
    return row;
  }

  async function createMhs(nim: string, nama: string, email: string, prodiId: number, dosenPaId: number) {
    const [row] = await db
      .insert(mahasiswa)
      .values({
        nim,
        nama,
        email,
        programStudiId: prodiId,
        dosenPaId,
        angkatan: '2024',
        jenisKelamin: 'L',
        tanggalLahir: '2004-01-01',
      })
      .returning();
    return row;
  }

  beforeAll(async () => {
    adminToken = await getAuthToken('admin-pembimbing@test.com', 'admin');
  });

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin-pembimbing@test.com', 'admin');

    prodiA = await createProdi('PPA', 'Prodi A - Pembimbing');
    prodiB = await createProdi('PPB', 'Prodi B - Pembimbing');

    dosenA = await createDosen('NIP100', 'Dosen A Satu', 'dosen-a-pemb@test.com', prodiA.id);
    dosenA2 = await createDosen('NIP101', 'Dosen A Dua', 'dosen-a2-pemb@test.com', prodiA.id);
    dosenB = await createDosen('NIP200', 'Dosen B', 'dosen-b-pemb@test.com', prodiB.id);

    mhsA1 = await createMhs('7001001', 'Mhs A1', 'mhs-a1-pemb@test.com', prodiA.id, dosenA.id);
    mhsA2 = await createMhs('7001002', 'Mhs A2', 'mhs-a2-pemb@test.com', prodiA.id, dosenA.id);
    mhsB1 = await createMhs('7002001', 'Mhs B1', 'mhs-b1-pemb@test.com', prodiB.id, dosenB.id);
  });

  afterAll(async () => {
    await clearDatabase();
  });

  it('menetapkan pembimbing PKL internal lalu mengganti tanpa menghapus riwayat', async () => {
    const first = await app.handle(
      new Request('http://localhost/pembimbing', {
        method: 'POST',
        headers: auth(adminToken),
        body: JSON.stringify({ mahasiswaId: mhsA1.id, jenis: 'PKL', dosenId: dosenA.id }),
      }),
    );
    expect(first.status).toBe(200);

    const second = await app.handle(
      new Request('http://localhost/pembimbing', {
        method: 'POST',
        headers: auth(adminToken),
        body: JSON.stringify({ mahasiswaId: mhsA1.id, jenis: 'PKL', dosenId: dosenA2.id }),
      }),
    );
    expect(second.status).toBe(200);

    const rows = await db
      .select()
      .from(pembimbingMahasiswa)
      .where(and(eq(pembimbingMahasiswa.mahasiswaId, mhsA1.id), eq(pembimbingMahasiswa.jenis, 'PKL')));
    expect(rows.length).toBe(2);
    expect(rows.filter((r) => r.statusAktif).length).toBe(1);
    expect(rows.find((r) => r.statusAktif)?.dosenId).toBe(dosenA2.id);

    // Hanya satu penetapan AKTIF per jenis (unik parsial).
    const detail = await app.handle(
      new Request(`http://localhost/pembimbing/mahasiswa/${mhsA1.id}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(detail.status).toBe(200);
    const detailBody = (await detail.json()) as {
      data: { pembimbing: { PKL: { dosenId: number } | null } };
      riwayat: Array<{ statusAktif: boolean }>;
    };
    expect(detailBody.data.pembimbing.PKL?.dosenId).toBe(dosenA2.id);
    expect(detailBody.riwayat.length).toBe(2);
  });

  it('menolak pembimbing eksternal tanpa instansi dan kombinasi dosen+eksternal', async () => {
    const tanpaInstansi = await app.handle(
      new Request('http://localhost/pembimbing', {
        method: 'POST',
        headers: auth(adminToken),
        body: JSON.stringify({
          mahasiswaId: mhsA1.id,
          jenis: 'PKL',
          namaEksternal: 'Budi Santoso',
        }),
      }),
    );
    expect(tanpaInstansi.status).toBe(400);
    const errTanpaInstansi = (await tanpaInstansi.json()) as { error: string };
    expect(errTanpaInstansi.error).toContain('Instansi');

    const campuran = await app.handle(
      new Request('http://localhost/pembimbing', {
        method: 'POST',
        headers: auth(adminToken),
        body: JSON.stringify({
          mahasiswaId: mhsA1.id,
          jenis: 'PKL',
          dosenId: dosenA.id,
          namaEksternal: 'Budi Santoso',
          instansiEksternal: 'PT Contoh',
        }),
      }),
    );
    expect(campuran.status).toBe(400);
    const errCampuran = (await campuran.json()) as { error: string };
    expect(errCampuran.error).toContain('tidak boleh diisi');

    // Eksternal lengkap diterima.
    const ok = await app.handle(
      new Request('http://localhost/pembimbing', {
        method: 'POST',
        headers: auth(adminToken),
        body: JSON.stringify({
          mahasiswaId: mhsA1.id,
          jenis: 'PKL',
          namaEksternal: 'Budi Santoso',
          instansiEksternal: 'PT Contoh Industri',
        }),
      }),
    );
    expect(ok.status).toBe(200);
    const [row] = await db
      .select()
      .from(pembimbingMahasiswa)
      .where(and(eq(pembimbingMahasiswa.mahasiswaId, mhsA1.id), eq(pembimbingMahasiswa.jenis, 'PKL')));
    expect(row.dosenId).toBeNull();
    expect(row.namaEksternal).toBe('Budi Santoso');
    expect(row.instansiEksternal).toBe('PT Contoh Industri');
  });

  it('menolak dosen yang sama menjadi Pembimbing 1 dan 2', async () => {
    const utama = await app.handle(
      new Request('http://localhost/pembimbing', {
        method: 'POST',
        headers: auth(adminToken),
        body: JSON.stringify({ mahasiswaId: mhsA1.id, jenis: 'TA_UTAMA', dosenId: dosenA.id }),
      }),
    );
    expect(utama.status).toBe(200);

    const sama = await app.handle(
      new Request('http://localhost/pembimbing', {
        method: 'POST',
        headers: auth(adminToken),
        body: JSON.stringify({ mahasiswaId: mhsA1.id, jenis: 'TA_PENDAMPING', dosenId: dosenA.id }),
      }),
    );
    expect(sama.status).toBe(400);
    const err = (await sama.json()) as { error: string };
    expect(err.error).toContain('Pembimbing 1 dan Pembimbing 2');

    // Dosen berbeda untuk slot kedua → diterima.
    const berbeda = await app.handle(
      new Request('http://localhost/pembimbing', {
        method: 'POST',
        headers: auth(adminToken),
        body: JSON.stringify({ mahasiswaId: mhsA1.id, jenis: 'TA_PENDAMPING', dosenId: dosenA2.id }),
      }),
    );
    expect(berbeda.status).toBe(200);
  });

  it('membatasi operator prodi pada lingkup prodinya sendiri', async () => {
    const prodiToken = await getAuthToken('prodi-pembimbing@test.com', 'prodi');
    // Admin Prodi hanya boleh mengelola prodinya sendiri → tautkan scope ke Prodi A.
    const [prodiUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, 'prodi-pembimbing@test.com'));
    await db.insert(userProdiScopes).values({ userId: prodiUser.id, programStudiId: prodiA.id }).onConflictDoNothing();
    // Tolak mahasiswa prodi lain.
    const lintasProdi = await app.handle(
      new Request('http://localhost/pembimbing', {
        method: 'POST',
        headers: auth(prodiToken),
        body: JSON.stringify({ mahasiswaId: mhsB1.id, jenis: 'PKL', dosenId: dosenB.id }),
      }),
    );
    expect(lintasProdi.status).toBe(400);
    const errLintas = (await lintasProdi.json()) as { error: string };
    expect(errLintas.error.toLowerCase()).toContain('di luar lingkup prodi');

    // Mahasiswa dalam prodi sendiri → boleh (dosen juga se-prodi).
    const seProdi = await app.handle(
      new Request('http://localhost/pembimbing', {
        method: 'POST',
        headers: auth(prodiToken),
        body: JSON.stringify({ mahasiswaId: mhsA1.id, jenis: 'PKL', dosenId: dosenA.id }),
      }),
    );
    expect(seProdi.status).toBe(200);

    // Dosen prodi lain ditolak walau mahasiswa ada di prodi operator.
    await app.handle(
      new Request('http://localhost/pembimbing', {
        method: 'POST',
        headers: auth(prodiToken),
        body: JSON.stringify({ mahasiswaId: mhsA2.id, jenis: 'PKL', dosenId: dosenB.id }),
      }),
    );
    const [row] = await db
      .select()
      .from(pembimbingMahasiswa)
      .where(and(eq(pembimbingMahasiswa.mahasiswaId, mhsA2.id), eq(pembimbingMahasiswa.jenis, 'PKL')));
    expect(row).toBeUndefined();
  });

  it('menyetel pembimbing massal dan melaporkan error per mahasiswa', async () => {
    const bulk = await app.handle(
      new Request('http://localhost/pembimbing/bulk', {
        method: 'POST',
        headers: auth(adminToken),
        body: JSON.stringify({
          mahasiswaIds: [mhsA1.id, mhsA2.id, 999999],
          jenis: 'TA_UTAMA',
          dosenId: dosenA.id,
        }),
      }),
    );
    expect(bulk.status).toBe(200);
    const bulkBody = (await bulk.json()) as {
      data: { updated: number; errors: Array<{ mahasiswaId: number; error: string }> };
    };
    expect(bulkBody.data.updated).toBe(2);
    expect(bulkBody.data.errors.length).toBe(1);
    expect(bulkBody.data.errors[0].mahasiswaId).toBe(999999);
  });

  it('menolak penetapan dari role yang tidak berwenang', async () => {
    const dosenToken = await getAuthToken('dosen-a-pemb@test.com', 'dosen');
    const denied = await app.handle(
      new Request('http://localhost/pembimbing', {
        method: 'POST',
        headers: auth(dosenToken),
        body: JSON.stringify({ mahasiswaId: mhsA1.id, jenis: 'PKL', dosenId: dosenA.id }),
      }),
    );
    expect(denied.status).toBe(403);

    // Mahasiswa hanya boleh membaca miliknya sendiri.
    const mhsToken = await getAuthToken('mhs-a1-pemb@test.com', 'mahasiswa');
    const own = await app.handle(
      new Request(`http://localhost/pembimbing/mahasiswa/${mhsA1.id}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${mhsToken}` },
      }),
    );
    expect(own.status).toBe(200);

    const other = await app.handle(
      new Request(`http://localhost/pembimbing/mahasiswa/${mhsA2.id}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${mhsToken}` },
      }),
    );
    expect(other.status).toBe(403);
  });

  it('mengimpor CSV penetapan pembimbing per baris dengan error per baris', async () => {
    const csv = [
      'nim,jenis,nip_dosen,nama_eksternal,instansi_eksternal,catatan',
      `${mhsA1.nim},PKL,${dosenA.nip},,,Pembimbing kampus`,
      `${mhsA2.nim},PKL,NIP999,,,Dosen tidak ada`,
      `${mhsB1.nim},PKL,,Andi,"PT Maju, Bersama",Pembimbing lapangan`,
    ].join('\n');

    const form = new FormData();
    form.append('file', new File([csv], 'pembimbing.csv', { type: 'text/csv' }));
    const res = await app.handle(
      new Request('http://localhost/pembimbing/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: form,
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { successCount: number; errors: Array<{ line: number; error: string }> };
    };
    expect(body.data.successCount).toBe(2);
    expect(body.data.errors.length).toBe(1);
    expect(body.data.errors[0].line).toBe(3);

    const [eksternal] = await db
      .select()
      .from(pembimbingMahasiswa)
      .where(and(eq(pembimbingMahasiswa.mahasiswaId, mhsB1.id), eq(pembimbingMahasiswa.jenis, 'PKL')));
    expect(eksternal.namaEksternal).toBe('Andi');
    // Nama instansi memuat koma → harus utuh, tidak terpecah.
    expect(eksternal.instansiEksternal).toBe('PT Maju, Bersama');
  });

  it('memakai dosen pembimbing PKL/TA sebagai default saat membuat baris bimbingan kategori terkait', async () => {
    await app.handle(
      new Request('http://localhost/pembimbing', {
        method: 'POST',
        headers: auth(adminToken),
        body: JSON.stringify({ mahasiswaId: mhsA1.id, jenis: 'PKL', dosenId: dosenA2.id }),
      }),
    );

    await db
      .insert(periodeAkademik)
      .values({ id: '20241', nama: '2024/2025 Ganjil', aktif: true })
      .onConflictDoUpdate({ target: periodeAkademik.id, set: { aktif: true } });

    const res = await app.handle(
      new Request(`http://localhost/bimbingan/mahasiswa/${mhsA1.id}?kategori=MAGANG`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { dosenId: number | null };
    // Respons `/bimbingan` dipangkas oleh response schema (tidak menyertakan kategori),
    // jadi kebenarannya diverifikasi juga langsung ke tabel bimbingan.
    expect(body.dosenId).toBe(dosenA2.id);

    const rows = await db.select().from(bimbingan).where(eq(bimbingan.mahasiswaId, mhsA1.id));
    expect(rows.length).toBe(1);
    expect(rows[0].kategori).toBe('MAGANG');
    expect(rows[0].dosenId).toBe(dosenA2.id);
  });
});
