import { and, asc, eq } from 'drizzle-orm';
import { tugasAkhirNilaiDetail, tugasAkhirRubrikKriteria } from '../models/schema';
import { db } from '../utils/db';

export interface CreateRubrikKriteriaInput {
  programStudiId: number;
  jenisSidang: 'proposal' | 'kemajuan' | 'akhir';
  kode: string;
  nama: string;
  kategori?: 'pembimbingan' | 'alat_mesin' | 'laporan' | 'umum';
  deskripsi?: string | null;
  bobot: number;
  isIndividu?: boolean;
  urutan?: number;
}

export interface UpdateRubrikKriteriaInput {
  kode?: string;
  nama?: string;
  kategori?: 'pembimbingan' | 'alat_mesin' | 'laporan' | 'umum';
  deskripsi?: string | null;
  bobot?: number;
  isIndividu?: boolean;
  urutan?: number;
  isAktif?: boolean;
}

export class TugasAkhirRubrikService {
  /**
   * Mengambil seluruh kriteria rubrik aktif untuk program studi dan jenis sidang tertentu.
   */
  static async getByProdiAndJenis(programStudiId: number, jenisSidang?: string) {
    const conditions = [
      eq(tugasAkhirRubrikKriteria.programStudiId, programStudiId),
      eq(tugasAkhirRubrikKriteria.isAktif, true),
    ];

    if (jenisSidang) {
      conditions.push(eq(tugasAkhirRubrikKriteria.jenisSidang, jenisSidang));
    }

    return await db
      .select()
      .from(tugasAkhirRubrikKriteria)
      .where(and(...conditions))
      .orderBy(asc(tugasAkhirRubrikKriteria.urutan), asc(tugasAkhirRubrikKriteria.kode));
  }

  /**
   * Menambah butir kriteria rubrik baru ke database.
   */
  static async create(input: CreateRubrikKriteriaInput) {
    const [created] = await db
      .insert(tugasAkhirRubrikKriteria)
      .values({
        programStudiId: input.programStudiId,
        jenisSidang: input.jenisSidang,
        kode: input.kode.trim().toUpperCase(),
        nama: input.nama.trim(),
        kategori: input.kategori || 'umum',
        deskripsi: input.deskripsi ? input.deskripsi.trim() : null,
        bobot: input.bobot,
        isIndividu: input.isIndividu ?? false,
        urutan: input.urutan ?? 0,
        isAktif: true,
      })
      .returning();

    return created;
  }

  /**
   * Memperbarui data kriteria rubrik.
   */
  static async update(id: number, input: UpdateRubrikKriteriaInput) {
    const updateData: Partial<typeof tugasAkhirRubrikKriteria.$inferInsert> = {};

    if (input.kode !== undefined) updateData.kode = input.kode.trim().toUpperCase();
    if (input.nama !== undefined) updateData.nama = input.nama.trim();
    if (input.kategori !== undefined) updateData.kategori = input.kategori;
    if (input.deskripsi !== undefined) updateData.deskripsi = input.deskripsi ? input.deskripsi.trim() : null;
    if (input.bobot !== undefined) updateData.bobot = input.bobot;
    if (input.isIndividu !== undefined) updateData.isIndividu = input.isIndividu;
    if (input.urutan !== undefined) updateData.urutan = input.urutan;
    if (input.isAktif !== undefined) updateData.isAktif = input.isAktif;

    const [updated] = await db
      .update(tugasAkhirRubrikKriteria)
      .set(updateData)
      .where(eq(tugasAkhirRubrikKriteria.id, id))
      .returning();

    if (!updated) {
      throw new Error('Kriteria rubrik tidak ditemukan.');
    }

    return updated;
  }

  /**
   * Menghapus kriteria rubrik.
   * Bila sudah pernah digunakan dalam penilaian sidang terdahulu, lakukan soft-deactivate (isAktif = false)
   * agar integritas foreign key dan nilai historis tetap aman.
   */
  static async delete(id: number) {
    const [existing] = await db
      .select({ id: tugasAkhirRubrikKriteria.id, programStudiId: tugasAkhirRubrikKriteria.programStudiId })
      .from(tugasAkhirRubrikKriteria)
      .where(eq(tugasAkhirRubrikKriteria.id, id))
      .limit(1);

    if (!existing) {
      throw new Error('Kriteria rubrik tidak ditemukan.');
    }

    // Cek apakah pernah dipakai di nilai detail
    const [used] = await db
      .select({ id: tugasAkhirNilaiDetail.id })
      .from(tugasAkhirNilaiDetail)
      .where(eq(tugasAkhirNilaiDetail.kriteriaId, id))
      .limit(1);

    if (used) {
      // Soft-deactivate
      await db.update(tugasAkhirRubrikKriteria).set({ isAktif: false }).where(eq(tugasAkhirRubrikKriteria.id, id));

      return {
        message: 'Kriteria telah dinonaktifkan karena telah memiliki riwayat penilaian sidang.',
        softDeleted: true,
      };
    }

    // Hard-delete jika belum pernah ada nilai yang merujuknya
    await db.delete(tugasAkhirRubrikKriteria).where(eq(tugasAkhirRubrikKriteria.id, id));
    return { message: 'Kriteria rubrik berhasil dihapus.', softDeleted: false };
  }

  /**
   * Menyalin template standar Politeknik Sorowako (BPA 2025) ke Program Studi.
   */
  static async salinTemplateStandar(programStudiId: number, jenisSidang: 'proposal' | 'kemajuan' | 'akhir') {
    let templateItems: Array<{
      kode: string;
      kategori: 'pembimbingan' | 'alat_mesin' | 'laporan' | 'umum';
      nama: string;
      bobot: number;
      isIndividu: boolean;
      urutan: number;
    }> = [];

    if (jenisSidang === 'proposal') {
      templateItems = [
        {
          kode: 'P.1',
          kategori: 'umum',
          nama: 'Sistematika & Kerapian Dokumen Proposal',
          bobot: 20,
          isIndividu: false,
          urutan: 1,
        },
        {
          kode: 'P.2',
          kategori: 'umum',
          nama: 'Urgensi Masalah & Relevansi Vokasi',
          bobot: 25,
          isIndividu: false,
          urutan: 2,
        },
        {
          kode: 'P.3',
          kategori: 'umum',
          nama: 'Ketepatan Metodologi & Rancangan Desain',
          bobot: 25,
          isIndividu: false,
          urutan: 3,
        },
        {
          kode: 'P.4',
          kategori: 'umum',
          nama: 'Presentasi & Penguasaan Materi Ilmiah',
          bobot: 30,
          isIndividu: true,
          urutan: 4,
        },
      ];
    } else if (jenisSidang === 'kemajuan') {
      templateItems = [
        {
          kode: 'K.1',
          kategori: 'umum',
          nama: 'Kemajuan Pengerjaan Alat / Prototipe (Fisik / Desain)',
          bobot: 35,
          isIndividu: false,
          urutan: 1,
        },
        {
          kode: 'K.2',
          kategori: 'umum',
          nama: 'Kesesuaian dengan Metodologi & Jadwal Pelaksanaan',
          bobot: 20,
          isIndividu: false,
          urutan: 2,
        },
        {
          kode: 'K.3',
          kategori: 'umum',
          nama: 'Draft Naskah Laporan Kemajuan (Bab 1 s/d Bab 4)',
          bobot: 20,
          isIndividu: false,
          urutan: 3,
        },
        {
          kode: 'K.4',
          kategori: 'umum',
          nama: 'Presentasi Kemajuan & Pemahaman Solusi Kendala',
          bobot: 25,
          isIndividu: true,
          urutan: 4,
        },
      ];
    } else {
      // Standar Sidang Akhir / Tugas Akhir Vokasi (Kategori A, B, C)
      templateItems = [
        // KATEGORI A: PEMBIMBINGAN (Individu, Total Bobot 30%)
        {
          kode: 'A.1',
          kategori: 'pembimbingan',
          nama: 'Kehadiran dan Keaktifan',
          bobot: 20,
          isIndividu: true,
          urutan: 1,
        },
        {
          kode: 'A.2',
          kategori: 'pembimbingan',
          nama: 'Inisiatif, Kreatifitas, Kemampuan Akademis dan Kecepatan Kerja/Tugas',
          bobot: 30,
          isIndividu: true,
          urutan: 2,
        },
        { kode: 'A.3', kategori: 'pembimbingan', nama: 'Sikap dan Perilaku', bobot: 15, isIndividu: true, urutan: 3 },
        { kode: 'A.4', kategori: 'pembimbingan', nama: 'Kedisiplinan', bobot: 15, isIndividu: true, urutan: 4 },
        { kode: 'A.5', kategori: 'pembimbingan', nama: 'Kerjasama Kelompok', bobot: 20, isIndividu: true, urutan: 5 },

        // KATEGORI B: ALAT / MESIN (Kelompok, Total Bobot 35%)
        {
          kode: 'B.1',
          kategori: 'alat_mesin',
          nama: 'Konstruksi alat dan tingkat kompleksitas',
          bobot: 35,
          isIndividu: false,
          urutan: 6,
        },
        {
          kode: 'B.2',
          kategori: 'alat_mesin',
          nama: 'Pengoperasian dan fungsi alat/ mesin',
          bobot: 40,
          isIndividu: false,
          urutan: 7,
        },
        { kode: 'B.3', kategori: 'alat_mesin', nama: 'Estetika dan keamanan', bobot: 25, isIndividu: false, urutan: 8 },

        // KATEGORI C: LAPORAN TUGAS AKHIR (Kelompok, Total Bobot 35%)
        {
          kode: 'C.1',
          kategori: 'laporan',
          nama: 'Bagian awal (sampul, daftar isi, dll)',
          bobot: 5,
          isIndividu: false,
          urutan: 9,
        },
        {
          kode: 'C.2',
          kategori: 'laporan',
          nama: 'Bab 1. Pendahuluan (latar belakang, tujuan dll)',
          bobot: 10,
          isIndividu: false,
          urutan: 10,
        },
        { kode: 'C.3', kategori: 'laporan', nama: 'Bab 2. Tinjauan Pustaka', bobot: 10, isIndividu: false, urutan: 11 },
        {
          kode: 'C.4',
          kategori: 'laporan',
          nama: 'Bab 3. Metodologi Penelitian',
          bobot: 15,
          isIndividu: false,
          urutan: 12,
        },
        {
          kode: 'C.5.A',
          kategori: 'laporan',
          nama: 'Bab 4. Hasil & Pembahasan: Pemilihan dan Perhitungan Kekuatan Bahan',
          bobot: 15,
          isIndividu: false,
          urutan: 13,
        },
        {
          kode: 'C.5.B',
          kategori: 'laporan',
          nama: 'Bab 4. Hasil & Pembahasan: Data Pengujian alat/ mesin',
          bobot: 10,
          isIndividu: false,
          urutan: 14,
        },
        {
          kode: 'C.6',
          kategori: 'laporan',
          nama: 'Bab 5. Kesimpulan & Saran',
          bobot: 5,
          isIndividu: false,
          urutan: 15,
        },
        { kode: 'C.7', kategori: 'laporan', nama: 'Daftar Pustaka', bobot: 5, isIndividu: false, urutan: 16 },
        {
          kode: 'C.8',
          kategori: 'laporan',
          nama: 'Gambar Susunan & Gambar Bagian',
          bobot: 15,
          isIndividu: false,
          urutan: 17,
        },
        {
          kode: 'C.9',
          kategori: 'laporan',
          nama: 'Pemakaian tata bahasa dan sistematika penulisan',
          bobot: 10,
          isIndividu: false,
          urutan: 18,
        },
      ];
    }

    const insertedRows: Array<typeof tugasAkhirRubrikKriteria.$inferSelect> = [];
    for (const item of templateItems) {
      const [row] = await db
        .insert(tugasAkhirRubrikKriteria)
        .values({
          programStudiId,
          jenisSidang,
          kode: item.kode,
          nama: item.nama,
          kategori: item.kategori,
          bobot: item.bobot,
          isIndividu: item.isIndividu,
          urutan: item.urutan,
          isAktif: true,
        })
        .returning();
      insertedRows.push(row);
    }

    return {
      message: `Berhasil menyalin ${insertedRows.length} butir kriteria template standar untuk sidang ${jenisSidang}.`,
      count: insertedRows.length,
      items: insertedRows,
    };
  }
}
