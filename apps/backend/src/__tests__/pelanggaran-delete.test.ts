import { beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import { mahasiswa, pelanggaran, programStudi } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

async function createPelanggaranRecord(mhsId: number) {
  const [row] = await db
    .insert(pelanggaran)
    .values({
      mahasiswaId: mhsId,
      tanggal: '2026-01-10',
      jenisPelanggaran: 'Terlambat masuk kelas',
      keterangan: 'Terlambat 20 menit',
      jenisSanksi: 1,
      pelapor: 'Penguji',
    })
    .returning();
  return row;
}

describe('DELETE /pelanggaran/:id — hard delete oleh admin & prodi', () => {
  let adminToken: string;
  let prodiToken: string;
  let dosenToken: string;
  let mhsId: number;

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin_pelanggaran_del@test.com', 'admin');
    prodiToken = await getAuthToken('prodi_pelanggaran_del@test.com', 'prodi' as 'admin');
    dosenToken = await getAuthToken('dosen_pelanggaran_del@test.com', 'dosen');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: `PLG_${Date.now()}`, nama: 'Prodi Pelanggaran', jenjang: 'D4' })
      .returning();

    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: `2026${String(Date.now()).slice(-5)}`,
        nama: 'Mahasiswa Uji Hapus',
        email: `mhs_pelanggaran_${Date.now()}@test.com`,
        programStudiId: prodi.id,
        status: 'aktif',
        namaIbuKandung: 'Ibu Uji',
        nik: `NIK${String(Date.now()).slice(-12)}`,
        jenisKelamin: 'L',
        tanggalLahir: '2000-01-01',
      })
      .returning();
    mhsId = mhs.id;
  });

  it('admin dapat menghapus catatan pelanggaran', async () => {
    const record = await createPelanggaranRecord(mhsId);
    const res = await app.handle(
      new Request(`http://localhost/pelanggaran/${record.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(200);

    const remaining = await db.select().from(pelanggaran).where(eq(pelanggaran.id, record.id));
    expect(remaining.length).toBe(0);
  });

  it('prodi dapat menghapus catatan pelanggaran', async () => {
    const record = await createPelanggaranRecord(mhsId);
    const res = await app.handle(
      new Request(`http://localhost/pelanggaran/${record.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${prodiToken}` },
      }),
    );
    expect(res.status).toBe(200);
  });

  it('dosen ditolak menghapus catatan pelanggaran (403)', async () => {
    const record = await createPelanggaranRecord(mhsId);
    const res = await app.handle(
      new Request(`http://localhost/pelanggaran/${record.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${dosenToken}` },
      }),
    );
    expect(res.status).toBe(403);
    const remaining = await db.select().from(pelanggaran).where(eq(pelanggaran.id, record.id));
    expect(remaining.length).toBe(1);
  });

  it('mengembalikan 404 untuk id yang tidak ada', async () => {
    const res = await app.handle(
      new Request('http://localhost/pelanggaran/999999', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(res.status).toBe(404);
  });
});
