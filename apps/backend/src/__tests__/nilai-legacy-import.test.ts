import { beforeEach, describe, expect, it } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { app } from '../app';
import {
  kelasKuliah,
  konversiNilai,
  krs,
  mahasiswa,
  mataKuliah,
  periodeAkademik,
  programStudi,
} from '../models/schema';
import { CsvImportService } from '../services/csv-import.service';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

const PERIODE_ID = '20241';

async function seedKonversi() {
  const rules = [
    { nilaiHuruf: 'A', bobotIndeks: 4.0, nilaiMin: 85, nilaiMax: 100 },
    { nilaiHuruf: 'A-', bobotIndeks: 3.7, nilaiMin: 80, nilaiMax: 84.99 },
    { nilaiHuruf: 'B+', bobotIndeks: 3.3, nilaiMin: 75, nilaiMax: 79.99 },
    { nilaiHuruf: 'B', bobotIndeks: 3.0, nilaiMin: 70, nilaiMax: 74.99 },
    { nilaiHuruf: 'B-', bobotIndeks: 2.7, nilaiMin: 65, nilaiMax: 69.99 },
    { nilaiHuruf: 'C+', bobotIndeks: 2.3, nilaiMin: 60, nilaiMax: 64.99 },
    { nilaiHuruf: 'C', bobotIndeks: 2.0, nilaiMin: 55, nilaiMax: 59.99 },
    { nilaiHuruf: 'D+', bobotIndeks: 1.5, nilaiMin: 50, nilaiMax: 54.99 },
    { nilaiHuruf: 'D', bobotIndeks: 1.0, nilaiMin: 45, nilaiMax: 49.99 },
    { nilaiHuruf: 'E', bobotIndeks: 0.0, nilaiMin: 0, nilaiMax: 44.99 },
  ];
  for (const rule of rules) {
    await db.insert(konversiNilai).values({ programStudiId: null, predikat: rule.nilaiHuruf, ...rule });
  }
}

describe('Impor nilai legacy (huruf mutu)', () => {
  let adminToken: string;
  let prodiId: number;
  let mkId: number;

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin-legacy@test.com', 'admin');

    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: 'PM', nama: 'Perawatan dan Perbaikan Mesin', jenjang: 'D3' })
      .returning();
    prodiId = prodi.id;

    await db.insert(periodeAkademik).values({ id: PERIODE_ID, nama: 'Ganjil 2024/2025', aktif: true });

    const [mk] = await db
      .insert(mataKuliah)
      .values({ kode: '1001PM1T', nama: 'Bahasa Inggris 1', sksTotal: 1, programStudiId: prodiId })
      .returning();
    mkId = mk.id;

    await db.insert(mahasiswa).values({
      nim: '22401001',
      nama: 'Aan Ridwan',
      email: 'aan@test.com',
      programStudiId: prodiId,
      status: 'aktif',
      jenisKelamin: 'L',
    });

    await seedKonversi();
  });

  it('mengimpor nilai huruf valid menjadi kelas LEGACY + KRS + nilai', async () => {
    const csv = 'NIM,KodeMatakuliah,Nilai\n22401001,1001PM1T,A-\n';
    const result = await CsvImportService.importNilaiLegacy(csv, PERIODE_ID);

    expect(result.successCount).toBe(1);
    expect(result.errors).toHaveLength(0);

    const [kelas] = await db
      .select()
      .from(kelasKuliah)
      .where(and(eq(kelasKuliah.mataKuliahId, mkId), eq(kelasKuliah.periodeId, PERIODE_ID)));
    expect(kelas).toBeDefined();
    expect(kelas.namaKelas).toBe('LEGACY');

    const [krsRecord] = await db.select().from(krs).where(eq(krs.kelasKuliahId, kelas.id));
    expect(krsRecord.nilaiHuruf).toBe('A-');
    expect(krsRecord.nilaiIndeks).toBe('3.70');
    // midpoint A- = (80 + 84.99) / 2 = 82.50
    expect(krsRecord.nilaiAngka).toBe('82.50');
    expect(krsRecord.isApproved).toBe(true);
  });

  it('menolak huruf mutu yang tidak ada di konversi global', async () => {
    const csv = 'NIM,KodeMatakuliah,Nilai\n22401001,1001PM1T,Z\n';
    const result = await CsvImportService.importNilaiLegacy(csv, PERIODE_ID);

    expect(result.successCount).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].line).toBe(2);
    expect(result.errors[0].error).toContain('Z');
  });

  it('melaporkan NIM yang tidak ditemukan tanpa menggagalkan baris lain', async () => {
    const csv = 'NIM,KodeMatakuliah,Nilai\n99999999,1001PM1T,A\n22401001,1001PM1T,B\n';
    const result = await CsvImportService.importNilaiLegacy(csv, PERIODE_ID);

    expect(result.successCount).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain('99999999');
  });

  it('menganggap entri terakhir menang untuk duplikat (NIM,KodeMatakuliah)', async () => {
    const csv = 'NIM,KodeMatakuliah,Nilai\n22401001,1001PM1T,C\n22401001,1001PM1T,A\n';
    const result = await CsvImportService.importNilaiLegacy(csv, PERIODE_ID);

    expect(result.successCount).toBe(1);
    const [kelas] = await db
      .select()
      .from(kelasKuliah)
      .where(and(eq(kelasKuliah.mataKuliahId, mkId), eq(kelasKuliah.periodeId, PERIODE_ID)));
    const [krsRecord] = await db.select().from(krs).where(eq(krs.kelasKuliahId, kelas.id));
    expect(krsRecord.nilaiHuruf).toBe('A');
  });

  it('idempoten: impor ulang tidak menggandakan KRS', async () => {
    const csv = 'NIM,KodeMatakuliah,Nilai\n22401001,1001PM1T,B+\n';
    await CsvImportService.importNilaiLegacy(csv, PERIODE_ID);
    await CsvImportService.importNilaiLegacy(csv, PERIODE_ID);

    const [kelas] = await db
      .select()
      .from(kelasKuliah)
      .where(and(eq(kelasKuliah.mataKuliahId, mkId), eq(kelasKuliah.periodeId, PERIODE_ID)));
    const rows = await db.select().from(krs).where(eq(krs.kelasKuliahId, kelas.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].nilaiHuruf).toBe('B+');
  });

  it('menolak bila periode akademik tidak ditemukan', async () => {
    const csv = 'NIM,KodeMatakuliah,Nilai\n22401001,1001PM1T,A\n';
    const result = await CsvImportService.importNilaiLegacy(csv, '99999');

    expect(result.successCount).toBe(0);
    expect(result.errors[0].error).toContain('99999');
  });

  it('endpoint POST /yudisium/import-nilai-legacy menerima multipart dan mengimpor', async () => {
    const formData = new FormData();
    formData.append(
      'file',
      new File(['NIM,KodeMatakuliah,Nilai\n22401001,1001PM1T,A\n'], 'nilai.csv', { type: 'text/csv' }),
    );
    formData.append('periodeId', PERIODE_ID);

    const response = await app.handle(
      new Request('http://localhost/yudisium/import-nilai-legacy', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData,
      }),
    );

    expect(response.status).toBe(200);
    const data = (await response.json()) as { successCount: number; errors: unknown[] };
    expect(data.successCount).toBe(1);
    expect(data.errors).toHaveLength(0);
  });
});
