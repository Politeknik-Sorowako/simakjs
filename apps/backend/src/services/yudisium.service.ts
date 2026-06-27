import { db } from '../utils/db';
import { pengajuanYudisium, mahasiswa, programStudi, komponenNilai, nilaiKomponenMahasiswa, krs } from '../models/schema';
import { eq, and, inArray } from 'drizzle-orm';

export class YudisiumService {
  // --- YUDISIUM ---

  static async getPengajuan(mahasiswaId: number) {
    const record = await db.query.pengajuanYudisium.findFirst({
      where: eq(pengajuanYudisium.mahasiswaId, mahasiswaId)
    });
    return record || null;
  }

  static async createOrUpdatePengajuan(mahasiswaId: number, data: {
    judulTa: string;
    skorToefl: number;
    bebasPerpustakaan: boolean;
    bebasLab: boolean;
    buktiPembayaranWisuda: boolean;
  }) {
    const existing = await this.getPengajuan(mahasiswaId);

    if (existing) {
      const [updated] = await db
        .update(pengajuanYudisium)
        .set({
          ...data,
          status: 'diajukan', // Reset status to diajukan upon updates
          catatan: null,
          updatedAt: new Date()
        })
        .where(eq(pengajuanYudisium.mahasiswaId, mahasiswaId))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(pengajuanYudisium)
      .values({
        mahasiswaId,
        ...data,
        status: 'diajukan'
      })
      .returning();
    return created;
  }

  static async updateStatus(mahasiswaId: number, status: 'diajukan' | 'diverifikasi' | 'disetujui' | 'ditolak', catatan?: string | null) {
    return await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(pengajuanYudisium)
        .set({
          status,
          catatan: catatan || null,
          updatedAt: new Date()
        })
        .where(eq(pengajuanYudisium.mahasiswaId, mahasiswaId))
        .returning();

      // If approved, update student status to 'lulus'
      if (status === 'disetujui') {
        await tx
          .update(mahasiswa)
          .set({ status: 'lulus', updatedAt: new Date() })
          .where(eq(mahasiswa.id, mahasiswaId));
      } else {
        const currentMhs = await tx.query.mahasiswa.findFirst({
          where: eq(mahasiswa.id, mahasiswaId)
        });
        if (currentMhs && currentMhs.status === 'lulus') {
          await tx
            .update(mahasiswa)
            .set({ status: 'aktif', updatedAt: new Date() })
            .where(eq(mahasiswa.id, mahasiswaId));
        }
      }

      return updated;
    });
  }

  static async getAllPengajuan() {
    return await db
      .select({
        id: pengajuanYudisium.id,
        mahasiswaId: pengajuanYudisium.mahasiswaId,
        judulTa: pengajuanYudisium.judulTa,
        skorToefl: pengajuanYudisium.skorToefl,
        bebasPerpustakaan: pengajuanYudisium.bebasPerpustakaan,
        bebasLab: pengajuanYudisium.bebasLab,
        buktiPembayaranWisuda: pengajuanYudisium.buktiPembayaranWisuda,
        status: pengajuanYudisium.status,
        catatan: pengajuanYudisium.catatan,
        createdAt: pengajuanYudisium.createdAt,
        mahasiswa: {
          nim: mahasiswa.nim,
          nama: mahasiswa.nama,
          status: mahasiswa.status
        },
        prodi: {
          nama: programStudi.nama
        }
      })
      .from(pengajuanYudisium)
      .innerJoin(mahasiswa, eq(pengajuanYudisium.mahasiswaId, mahasiswa.id))
      .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id));
  }

  // --- GRADE COMPONENTS & GRADING INTEGRITY ---

  static async getKomponen(kelasKuliahId: number) {
    return await db
      .select()
      .from(komponenNilai)
      .where(eq(komponenNilai.kelasKuliahId, kelasKuliahId));
  }

  static async saveKomponen(kelasKuliahId: number, list: Array<{ nama: string; bobot: number }>) {
    const totalBobot = list.reduce((sum, item) => sum + item.bobot, 0);
    if (totalBobot !== 100) {
      throw new Error('Total bobot komponen nilai harus tepat 100%.');
    }

    return await db.transaction(async (tx) => {
      // Clear old components (will cascade delete grades in nilai_komponen_mahasiswa)
      await tx.delete(komponenNilai).where(eq(komponenNilai.kelasKuliahId, kelasKuliahId));

      // Reset KRS grades for this class to ensure integrity
      await tx
        .update(krs)
        .set({
          nilaiAngka: null,
          nilaiHuruf: null,
          nilaiIndeks: null,
          updatedAt: new Date()
        })
        .where(eq(krs.kelasKuliahId, kelasKuliahId));

      const inserts = list.map((item) => ({
        kelasKuliahId,
        nama: item.nama,
        bobot: item.bobot
      }));

      if (inserts.length > 0) {
        return await tx.insert(komponenNilai).values(inserts).returning();
      }
      return [];
    });
  }

  static async getNilaiMahasiswa(kelasKuliahId: number) {
    // Get students in KRS
    const studentList = await db
      .select({
        krsId: krs.id,
        mahasiswaId: krs.mahasiswaId,
        nim: mahasiswa.nim,
        nama: mahasiswa.nama,
        nilaiAngka: krs.nilaiAngka,
        nilaiHuruf: krs.nilaiHuruf,
        nilaiIndeks: krs.nilaiIndeks
      })
      .from(krs)
      .innerJoin(mahasiswa, eq(krs.mahasiswaId, mahasiswa.id))
      .where(eq(krs.kelasKuliahId, kelasKuliahId));

    const components = await this.getKomponen(kelasKuliahId);
    const componentIds = components.map(c => c.id);

    const grades = componentIds.length > 0 ? await db
      .select()
      .from(nilaiKomponenMahasiswa)
      .where(
        and(
          inArray(nilaiKomponenMahasiswa.komponenNilaiId, componentIds)
        )
      ) : [];

    // Map grades per KRS
    const gradesMap = new Map<number, typeof nilaiKomponenMahasiswa.$inferSelect[]>();
    for (const g of grades) {
      const arr = gradesMap.get(g.krsId) || [];
      arr.push(g);
      gradesMap.set(g.krsId, arr);
    }

    return studentList.map((stud) => ({
      ...stud,
      nilaiKomponen: gradesMap.get(stud.krsId) || []
    }));
  }

  static async saveNilaiMahasiswa(kelasKuliahId: number, list: Array<{
    krsId: number;
    nilaiKomponenList: Array<{ komponenNilaiId: number; nilai: number | string }>
  }>) {
    const components = await this.getKomponen(kelasKuliahId);
    const compMap = new Map<number, number>();
    for (const c of components) {
      compMap.set(c.id, c.bobot);
    }

    return await db.transaction(async (tx) => {
      const results = [];

      for (const item of list) {
        // Delete existing grades for this KRS and components
        const compIds = item.nilaiKomponenList.map(v => v.komponenNilaiId);
        if (compIds.length > 0) {
          await tx
            .delete(nilaiKomponenMahasiswa)
            .where(
              and(
                eq(nilaiKomponenMahasiswa.krsId, item.krsId),
                inArray(nilaiKomponenMahasiswa.komponenNilaiId, compIds)
              )
            );
        }

        // Insert new component grades
        const inserts = item.nilaiKomponenList.map(v => ({
          krsId: item.krsId,
          komponenNilaiId: v.komponenNilaiId,
          nilai: String(v.nilai)
        }));

        if (inserts.length > 0) {
          await tx.insert(nilaiKomponenMahasiswa).values(inserts);
        }

        // Recalculate Final Grade for this student
        const currentGrades = await tx
          .select()
          .from(nilaiKomponenMahasiswa)
          .where(eq(nilaiKomponenMahasiswa.krsId, item.krsId));

        let finalScore = 0;
        let registeredWeight = 0;

        for (const g of currentGrades) {
          const weight = compMap.get(g.komponenNilaiId) || 0;
          finalScore += parseFloat(g.nilai) * (weight / 100);
          registeredWeight += weight;
        }

        // Update KRS only if weights are correct (e.g. all components are entered)
        if (registeredWeight === 100) {
          const finalScoreFixed = parseFloat(finalScore.toFixed(2));
          const conversion = this.getNilaiHurufDanIndeks(finalScoreFixed);

          const [updatedKrs] = await tx
            .update(krs)
            .set({
              nilaiAngka: String(finalScoreFixed),
              nilaiHuruf: conversion.huruf,
              nilaiIndeks: String(conversion.indeks),
              updatedAt: new Date()
            })
            .where(eq(krs.id, item.krsId))
            .returning();
          results.push(updatedKrs);
        }
      }

      return results;
    });
  }

  private static getNilaiHurufDanIndeks(score: number) {
    if (score >= 80) return { huruf: 'A', indeks: 4.0 };
    if (score >= 75) return { huruf: 'B+', indeks: 3.5 };
    if (score >= 70) return { huruf: 'B', indeks: 3.0 };
    if (score >= 65) return { huruf: 'C+', indeks: 2.5 };
    if (score >= 60) return { huruf: 'C', indeks: 2.0 };
    if (score >= 50) return { huruf: 'D', indeks: 1.0 };
    return { huruf: 'E', indeks: 0.0 };
  }
}
