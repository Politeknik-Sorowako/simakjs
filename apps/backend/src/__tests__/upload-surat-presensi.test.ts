import { beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import {
  bap,
  dosen,
  kelasKuliah,
  mahasiswa,
  mataKuliah,
  periodeAkademik,
  presensi,
  programStudi,
} from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

function suratFormData(presensiId: number, jenis: string, file: File, keterangan?: string): FormData {
  const fd = new FormData();
  fd.append('presensiId', String(presensiId));
  fd.append('jenis', jenis);
  if (keterangan) fd.append('keterangan', keterangan);
  fd.append('file', file);
  return fd;
}

function pdfFile(name = 'surat_dokter.pdf'): File {
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], name, { type: 'application/pdf' });
}

describe('Upload Surat Sakit/Izin oleh Mahasiswa', () => {
  let mahasiswaToken: string;
  let adminToken: string;
  let mhsId: number;
  let mhsLainId: number;
  let ownPresensiId: number;
  let otherPresensiId: number;

  beforeEach(async () => {
    await clearDatabase();
    const mhsEmail = 'mhs_surat@test.com';
    const mhsLainEmail = 'mhs_lain@test.com';
    mahasiswaToken = await getAuthToken(mhsEmail, 'mahasiswa');
    adminToken = await getAuthToken('admin-surat@test.com', 'admin');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: 'SURAT', nama: 'Prodi Test Surat', jenjang: 'D4' })
      .returning();
    const [periode] = await db
      .insert(periodeAkademik)
      .values({ id: '20261', nama: 'Ganjil 2026', aktif: true })
      .returning();
    const [dosenRow] = await db
      .insert(dosen)
      .values({
        nip: 'DOSEN-SURAT-001',
        nama: 'Dosen Test Surat',
        email: 'dosen_surat@test.com',
        jenisKelamin: 'L',
        tanggalLahir: '1980-01-01',
      })
      .returning();
    const [mk] = await db
      .insert(mataKuliah)
      .values({ programStudiId: prodi.id, kode: 'MK-SURAT', nama: 'Mata Kuliah Surat', sksTotal: 3 })
      .returning();
    const [kelas] = await db
      .insert(kelasKuliah)
      .values({ mataKuliahId: mk.id, periodeId: periode.id, namaKelas: 'A' })
      .returning();

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20260001',
        nama: 'Mahasiswa Surat',
        email: mhsEmail,
        programStudiId: prodi.id,
        jenisKelamin: 'L',
        tanggalLahir: '2003-01-01',
      })
      .returning();
    mhsId = mhs.id;

    const [mhsLain] = await db
      .insert(mahasiswa)
      .values({
        nim: '20260002',
        nama: 'Mahasiswa Lain',
        email: mhsLainEmail,
        programStudiId: prodi.id,
        jenisKelamin: 'P',
        tanggalLahir: '2003-02-02',
      })
      .returning();
    mhsLainId = mhsLain.id;

    const [bapRow] = await db
      .insert(bap)
      .values({
        kelasKuliahId: kelas.id,
        tanggal: '2026-09-01',
        pertemuanKe: 1,
        materi: 'Pengenalan',
        durasiMenit: 100,
        dosenId: dosenRow.id,
      })
      .returning();

    const [ownPresensi] = await db
      .insert(presensi)
      .values({ bapId: bapRow.id, mahasiswaId: mhs.id, status: 'unknown', durasiMangkir: 100 })
      .returning();
    ownPresensiId = ownPresensi.id;

    const [otherPresensi] = await db
      .insert(presensi)
      .values({ bapId: bapRow.id, mahasiswaId: mhsLain.id, status: 'unknown', durasiMangkir: 100 })
      .returning();
    otherPresensiId = otherPresensi.id;
  });

  it('mahasiswa dapat mengunggah surat untuk presensinya sendiri (lampiranEvidens terisi)', async () => {
    const res = await app.handle(
      new Request('http://localhost/presensi/upload-surat', {
        method: 'POST',
        headers: { Authorization: `Bearer ${mahasiswaToken}` },
        body: suratFormData(ownPresensiId, 'sakit', pdfFile(), 'Demam tinggi, surat dokter terlampir'),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.presensiId).toBe(ownPresensiId);
    expect(body.lampiranEvidens).toContain('surat_sakit');

    const [row] = await db.select().from(presensi).where(eq(presensi.id, ownPresensiId));
    expect(row.lampiranEvidens).toBe(body.lampiranEvidens);
    expect(row.keterangan).toBe('Demam tinggi, surat dokter terlampir');
    expect(row.status).toBe('unknown'); // status belum berubah hingga verifikasi admin
  });

  it('mahasiswa TIDAK dapat mengunggah surat untuk presensi milik mahasiswa lain', async () => {
    const res = await app.handle(
      new Request('http://localhost/presensi/upload-surat', {
        method: 'POST',
        headers: { Authorization: `Bearer ${mahasiswaToken}` },
        body: suratFormData(otherPresensiId, 'izin', pdfFile()),
      }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('presensi Anda sendiri');
  });

  it('format berkas yang tidak didukung ditolak', async () => {
    const badFile = new File([new Uint8Array([1, 2, 3])], 'surat.txt', { type: 'text/plain' });
    const res = await app.handle(
      new Request('http://localhost/presensi/upload-surat', {
        method: 'POST',
        headers: { Authorization: `Bearer ${mahasiswaToken}` },
        body: suratFormData(ownPresensiId, 'sakit', badFile),
      }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Format berkas tidak didukung');
  });

  it('GET /presensi/mahasiswa/riwayat mengembalikan data presensi milik mahasiswa', async () => {
    const res = await app.handle(
      new Request('http://localhost/presensi/mahasiswa/riwayat', {
        method: 'GET',
        headers: { Authorization: `Bearer ${mahasiswaToken}` },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(ownPresensiId);
    expect(body[0].status).toBe('unknown');
    expect(body[0].mataKuliahNama).toBe('Mata Kuliah Surat');
  });

  it('admin dapat melihat riwayat presensi mahasiswa lain via query mahasiswaId', async () => {
    const res = await app.handle(
      new Request(`http://localhost/presensi/mahasiswa/riwayat?mahasiswaId=${mhsLainId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(otherPresensiId);
  });

  it('berkas surat dapat diakses oleh admin (pratinjau)', async () => {
    await app.handle(
      new Request('http://localhost/presensi/upload-surat', {
        method: 'POST',
        headers: { Authorization: `Bearer ${mahasiswaToken}` },
        body: suratFormData(ownPresensiId, 'sakit', pdfFile()),
      }),
    );
    const [row] = await db.select().from(presensi).where(eq(presensi.id, ownPresensiId));
    expect(row.lampiranEvidens).toBeTruthy();

    const res = await app.handle(
      new Request(`http://localhost/presensi/berkas/${row.lampiranEvidens}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(200);
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });
});
