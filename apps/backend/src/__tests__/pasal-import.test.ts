import { beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import { mahasiswa, pasalPelanggaran, programStudi } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

function pasalFormData(csvContent: string, mode?: string): FormData {
  const formData = new FormData();
  formData.append('file', new File([csvContent], 'pasal.csv', { type: 'text/csv' }));
  if (mode) formData.append('mode', mode);
  return formData;
}

describe('Impor Pasal Pelanggaran via CSV', () => {
  let adminToken: string;

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin-pasal@test.com', 'admin');
  });

  it('harus sukses mengimpor pasal baru dan mengonversi jenis sanksi L/T', async () => {
    const csv =
      'nomor_pasal,bunyi_pasal,jenis_sanksi\nPasal 101,Merokok di kampus,L\nPasal 102,Mencontek saat ujian,T\n';
    const res = await app.handle(
      new Request('http://localhost/pasal-pelanggaran/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: pasalFormData(csv),
      }),
    );
    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.successCount).toBe(2);
    expect(result.errors).toBeArray();
    expect(result.errors.length).toBe(0);

    const stored = await db.select().from(pasalPelanggaran).orderBy(pasalPelanggaran.id);
    expect(stored).toHaveLength(2);
    expect(stored[0].nomorPasal).toBe('Pasal 101');
    expect(stored[0].jenisSanksi).toBe(1); // L → 1
    expect(stored[1].nomorPasal).toBe('Pasal 102');
    expect(stored[1].jenisSanksi).toBe(4); // T → 4
  });

  it('harus menolak CSV tanpa kolom header yang dibutuhkan', async () => {
    const csv = 'nomor_pasal\nPasal 201\n';
    const res = await app.handle(
      new Request('http://localhost/pasal-pelanggaran/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: pasalFormData(csv),
      }),
    );
    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.successCount).toBe(0);
    expect(result.errors).toBeArray();
    expect(result.errors.some((e: { error: string }) => e.error.includes('nomor_pasal, bunyi_pasal'))).toBe(true);
  });

  it('harus menolak duplikat pada mode skip', async () => {
    const csv = 'nomor_pasal,bunyi_pasal,jenis_sanksi\nPasal 201,Merokok di kampus,L\n';
    await app.handle(
      new Request('http://localhost/pasal-pelanggaran/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: pasalFormData(csv),
      }),
    );
    const res = await app.handle(
      new Request('http://localhost/pasal-pelanggaran/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: pasalFormData(csv),
      }),
    );
    const result = await res.json();
    expect(result.successCount).toBe(0);
    expect(result.errors).toBeArray();
    expect(result.errors.some((e: { error: string }) => e.error.includes('sudah ada'))).toBe(true);
  });

  it('harus menimpa pasal yang sama pada mode update', async () => {
    await app.handle(
      new Request('http://localhost/pasal-pelanggaran/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: pasalFormData('nomor_pasal,bunyi_pasal,jenis_sanksi\nPasal 201,Merokok di kampus,L\n'),
      }),
    );
    const res = await app.handle(
      new Request('http://localhost/pasal-pelanggaran/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: pasalFormData('nomor_pasal,bunyi_pasal,jenis_sanksi\nPasal 201,Berbuat tidak sopan,T\n', 'update'),
      }),
    );
    const result = await res.json();
    expect(result.successCount).toBe(1);
    expect(result.errors.length).toBe(0);

    const [stored] = await db.select().from(pasalPelanggaran).where(eq(pasalPelanggaran.nomorPasal, 'Pasal 201'));
    expect(stored.nomorPasal).toBe('Pasal 201');
    expect(stored.bunyiPasal).toBe('Berbuat tidak sopan');
    expect(stored.jenisSanksi).toBe(4);
  });

  it('harus melaporkan error per baris untuk jenis sanksi tidak valid tanpa menyimpan', async () => {
    const csv = 'nomor_pasal,bunyi_pasal,jenis_sanksi\nPasal 201,Merokok di kampus,X\n';
    const res = await app.handle(
      new Request('http://localhost/pasal-pelanggaran/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: pasalFormData(csv),
      }),
    );
    const result = await res.json();
    expect(result.successCount).toBe(0);
    expect(result.errors).toBeArray();
    expect(result.errors.some((e: { error: string }) => e.error.includes('Jenis sanksi tidak valid'))).toBe(true);
    const stored = await db.select().from(pasalPelanggaran);
    expect(stored).toHaveLength(0);
  });
});

describe('Impor Pelanggaran via CSV (referensi pasal BPA)', () => {
  let adminToken: string;

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin-pelanggaran@test.com', 'admin');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: 'PLG', nama: 'Prodi Pelanggaran', jenjang: 'D4' })
      .returning();
    await db
      .insert(mahasiswa)
      .values({
        nim: '20239999',
        nama: 'Mahasiswa Pelanggaran',
        email: 'mhs_plg@test.com',
        programStudiId: prodi.id,
        jenisKelamin: 'L',
        tanggalLahir: '2001-01-01',
      })
      .returning();

    await db.insert(pasalPelanggaran).values({ nomorPasal: 'Pasal 202', bunyiPasal: 'Pasal BPA', jenisSanksi: 4 });
  });

  function formData(csvContent: string): FormData {
    const formData = new FormData();
    formData.append('file', new File([csvContent], 'pelanggaran.csv', { type: 'text/csv' }));
    return formData;
  }

  it('harus mengimpor pelanggaran dan menghubungkan pasal BPA dengan jenis sanksinya', async () => {
    const csv = [
      'nim,tanggal,jenis_pelanggaran,jenis_sanksi,nomor_pasal,keterangan',
      '20239999,2026-08-10,Mencontek,,Pasal 202,Kedapatan mencontek',
      '',
    ].join('\n');
    const res = await app.handle(
      new Request('http://localhost/pelanggaran/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData(csv),
      }),
    );
    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.successCount).toBe(1);
    expect(result.errors).toBeArray();
    expect(result.errors.length).toBe(0);
  });
});
