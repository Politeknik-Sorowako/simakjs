import { beforeEach, describe, expect, it } from 'bun:test';
import { mahasiswa, pengajuanCuti, periodeAkademik, programStudi } from '../models/schema';
import { KhsService } from '../services/khs.service';
import { db } from '../utils/db';
import { clearDatabase } from './test-helper';

describe('KHS hitungSemester (angkatan + periode - cuti)', () => {
  let mhsId: number;

  beforeEach(async () => {
    await clearDatabase();
    await db.insert(periodeAkademik).values([
      { id: '20241', nama: 'Ganjil 2024/2025', aktif: false },
      { id: '20242', nama: 'Genap 2025', aktif: false },
      { id: '20251', nama: 'Ganjil 2025/2026', aktif: false },
      { id: '20252', nama: 'Genap 2026', aktif: true },
    ]);
    const [prodi] = await db
      .insert(programStudi)
      .values({ kode: `SEM_${Date.now()}`, nama: 'Teknik Komputer', jenjang: 'D4' })
      .returning();
    const [mhs] = await db
      .insert(mahasiswa)
      .values({
        nim: '20240001',
        nama: 'Mahasiswa Semester',
        email: `mhs_sem_${Date.now()}@test.com`,
        angkatan: '2024',
        programStudiId: prodi.id,
        status: 'aktif',
        namaIbuKandung: 'Ibu SEM',
        nik: '1234567890123300',
        jenisKelamin: 'L',
        tanggalLahir: '2003-01-01',
      })
      .returning();
    mhsId = mhs.id;
  });

  it('semester 1 pada periode angkatan (20241)', async () => {
    expect(await KhsService.hitungSemester(mhsId, '20241')).toBe(1);
  });

  it('semester 2 pada periode 20242 (tanpa cuti)', async () => {
    expect(await KhsService.hitungSemester(mhsId, '20242')).toBe(2);
  });

  it('semester 3 pada periode 20251 (tanpa cuti)', async () => {
    expect(await KhsService.hitungSemester(mhsId, '20251')).toBe(3);
  });

  it('cuti satu semester: semester 3 menjadi 2', async () => {
    await db.insert(pengajuanCuti).values({
      mahasiswaId: mhsId,
      periodeId: '20242',
      alasan: 'Sakit',
      status: 'disetujui_prodi',
      semesterMulaiCuti: '20242',
      semesterBerakhirCuti: '20242',
    });
    expect(await KhsService.hitungSemester(mhsId, '20251')).toBe(2);
  });

  it('cuti dua semester (20242-20251): semester 20252 menjadi 2', async () => {
    await db.insert(pengajuanCuti).values({
      mahasiswaId: mhsId,
      periodeId: '20242',
      alasan: 'Alasan keluarga',
      status: 'kembali_aktif',
      semesterMulaiCuti: '20242',
      semesterBerakhirCuti: '20251',
    });
    expect(await KhsService.hitungSemester(mhsId, '20252')).toBe(2);
  });

  it('cuti yang belum dimulai tidak mempengaruhi semester', async () => {
    await db.insert(pengajuanCuti).values({
      mahasiswaId: mhsId,
      periodeId: '20242',
      alasan: 'Cuti mendatang',
      status: 'disetujui_prodi',
      semesterMulaiCuti: '20242',
      semesterBerakhirCuti: '20242',
    });
    // Sebelum masa cuti, semester normal.
    expect(await KhsService.hitungSemester(mhsId, '20241')).toBe(1);
  });

  it('cuti overlap/duplikat tidak mengurangi dua kali', async () => {
    // Dua record cuti yang sama (20242-20242) — tidak boleh dikurangi 2×.
    await db.insert(pengajuanCuti).values({
      mahasiswaId: mhsId,
      periodeId: '20242',
      alasan: 'Duplikat cuti',
      status: 'disetujui_pa',
      semesterMulaiCuti: '20242',
      semesterBerakhirCuti: '20242',
    });
    await db.insert(pengajuanCuti).values({
      mahasiswaId: mhsId,
      periodeId: '20242',
      alasan: 'Duplikat cuti kedua',
      status: 'disetujui_prodi',
      semesterMulaiCuti: '20242',
      semesterBerakhirCuti: '20242',
    });
    // Satu semester cuti yang sama → dikurangi 1× saja.
    expect(await KhsService.hitungSemester(mhsId, '20251')).toBe(2);
  });
});
