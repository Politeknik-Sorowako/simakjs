import { describe, it, expect } from 'bun:test';
import { app } from '../app';
import { clearDatabase, getAuthToken } from './test-helper';
import { db } from '../utils/db';
import { programStudi, mahasiswa, dosen, mataKuliah, kelasKuliah, krs, periodeAkademik } from '../models/schema';

describe('KRS Batch Approval Test', () => {
  it('harus menyetujui semua KRS yang pending untuk mahasiswa dalam satu periode', async () => {
    await clearDatabase();
    const adminToken = await getAuthToken('admin-test@test.com', 'admin');

    // Create Prodi
    const [prodi] = await db.insert(programStudi).values({
      kode: 'TI',
      nama: 'Teknik Informatika',
      jenjang: 'D4',
    }).returning();

    // Create Dosen
    const [dsn] = await db.insert(dosen).values({
      nip: '198001012010121001',
      nama: 'Dosen Pembimbing',
      email: 'dosen@test.com',
      programStudiId: prodi.id,
      nik: '1234567890123456',
      jenisKelamin: 'L',
      tanggalLahir: '1980-01-01',
    }).returning();

    // Create Mahasiswa
    const [mhs] = await db.insert(mahasiswa).values({
      nim: '123456',
      nama: 'Test Student',
      email: 'student@test.com',
      programStudiId: prodi.id,
      namaIbuKandung: 'Ibu',
      nik: '1234567890123456',
      jenisKelamin: 'L',
      tanggalLahir: '2000-01-01',
    }).returning();

    // Create 2 Mata Kuliah
    const [mk1] = await db.insert(mataKuliah).values({
      kode: 'MK1',
      nama: 'Mata Kuliah 1',
      sksTotal: 3,
      programStudiId: prodi.id,
    }).returning();

    const [mk2] = await db.insert(mataKuliah).values({
      kode: 'MK2',
      nama: 'Mata Kuliah 2',
      sksTotal: 3,
      programStudiId: prodi.id,
    }).returning();

    // Create Periode Akademik
    await db.insert(periodeAkademik).values({
      id: '20252',
      nama: 'Genap 2025/2026',
      aktif: true,
    });

    // Create 2 Kelas Kuliah in the same period
    const [kelas1] = await db.insert(kelasKuliah).values({
      mataKuliahId: mk1.id,
      periodeId: '20252',
      namaKelas: 'Kelas A',
    }).returning();

    const [kelas2] = await db.insert(kelasKuliah).values({
      mataKuliahId: mk2.id,
      periodeId: '20252',
      namaKelas: 'Kelas B',
    }).returning();

    // Create KRS records
    const [krs1] = await db.insert(krs).values({
      mahasiswaId: mhs.id,
      kelasKuliahId: kelas1.id,
      isApproved: false,
    }).returning();

    const [krs2] = await db.insert(krs).values({
      mahasiswaId: mhs.id,
      kelasKuliahId: kelas2.id,
      isApproved: false,
    }).returning();

    // Approve KRS
    const response = await app.handle(
      new Request('http://localhost/krs/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          mahasiswaId: mhs.id,
          periodeId: '20252',
        }),
      })
    );

    const json = await response.json();
    console.log("APPROVE RESPONSE:", JSON.stringify(json, null, 2));
    expect(response.status).toBe(200);
    const data = json as { count: number };
    expect(data.count).toBe(2);

    // Verify in DB
    const results = await db.select().from(krs);
    expect(results.every(r => r.isApproved === true)).toBe(true);
  });
});
