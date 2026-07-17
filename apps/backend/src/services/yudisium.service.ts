import { and, eq, inArray } from 'drizzle-orm';
import {
  angkatanKurikulum,
  capaianCpmk,
  cpmk,
  kelasKuliah,
  komponenNilai,
  konversiNilai,
  krs,
  mahasiswa,
  mataKuliah,
  nilaiKomponenMahasiswa,
  pengajuanYudisium,
  programStudi,
  subCpmk,
} from '../models/schema';
import { db } from '../utils/db';

export class YudisiumService {
  // --- YUDISIUM ---

  static async getPengajuan(mahasiswaId: number) {
    const record = await db.query.pengajuanYudisium.findFirst({
      where: eq(pengajuanYudisium.mahasiswaId, mahasiswaId),
      with: {
        mahasiswa: {
          columns: {
            nim: true,
            nama: true,
            status: true,
          },
          with: {
            programStudi: {
              columns: {
                nama: true,
              },
            },
          },
        },
      },
    });

    if (!record) return null;

    return {
      ...record,
      prodi: record.mahasiswa?.programStudi ? { nama: record.mahasiswa.programStudi.nama } : undefined,
    };
  }

  static async createOrUpdatePengajuan(
    mahasiswaId: number,
    data: {
      judulTa: string;
      skorToefl: number;
      bebasPerpustakaan: boolean;
      bebasLab: boolean;
      buktiPembayaranWisuda: boolean;
    },
  ) {
    const existing = await this.getPengajuan(mahasiswaId);

    if (existing) {
      const [updated] = await db
        .update(pengajuanYudisium)
        .set({
          ...data,
          status: 'diajukan', // Reset status to diajukan upon updates
          catatan: null,
          updatedAt: new Date(),
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
        status: 'diajukan',
      })
      .returning();
    return created;
  }

  static async updateStatus(
    mahasiswaId: number,
    status: 'diajukan' | 'diverifikasi' | 'disetujui' | 'ditolak',
    catatan?: string | null,
  ) {
    return await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(pengajuanYudisium)
        .set({
          status,
          catatan: catatan || null,
          updatedAt: new Date(),
        })
        .where(eq(pengajuanYudisium.mahasiswaId, mahasiswaId))
        .returning();

      // If approved, update student status to 'lulus'
      if (status === 'disetujui') {
        await tx.update(mahasiswa).set({ status: 'lulus', updatedAt: new Date() }).where(eq(mahasiswa.id, mahasiswaId));
      } else {
        const currentMhs = await tx.query.mahasiswa.findFirst({
          where: eq(mahasiswa.id, mahasiswaId),
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
          status: mahasiswa.status,
        },
        prodi: {
          nama: programStudi.nama,
        },
      })
      .from(pengajuanYudisium)
      .innerJoin(mahasiswa, eq(pengajuanYudisium.mahasiswaId, mahasiswa.id))
      .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id));
  }

  static async getStats(periodeId?: string) {
    const { count: count2 } = await import('drizzle-orm');
    const { pengajuanYudisium: py, programStudi: ps } = await import('../models/schema');

    const [total] = await db.select({ count: count2() }).from(py);

    const statusBreakdown = await db.select({ status: py.status, count: count2() }).from(py).groupBy(py.status);

    const perProdi = await db
      .select({
        prodiId: mahasiswa.programStudiId,
        prodiNama: ps.nama,
        total: count2(),
      })
      .from(py)
      .innerJoin(mahasiswa, eq(py.mahasiswaId, mahasiswa.id))
      .leftJoin(ps, eq(mahasiswa.programStudiId, ps.id))
      .groupBy(mahasiswa.programStudiId, ps.nama);

    const statusMap: Record<string, number> = {};
    for (const s of statusBreakdown) statusMap[s.status] = s.count;

    return {
      totalPengajuan: Number(total?.count || 0),
      statusBreakdown: statusMap,
      perProdi: perProdi.map((p) => ({ prodiId: p.prodiId, prodiNama: p.prodiNama || '-', total: Number(p.total) })),
    };
  }

  // --- GRADE COMPONENTS & GRADING INTEGRITY ---

  static async getKomponen(kelasKuliahId: number) {
    const data = await db.select().from(komponenNilai).where(eq(komponenNilai.kelasKuliahId, kelasKuliahId));
    return data.map((d) => ({
      ...d,
      subCpmkId: d.subCpmkId,
      rencanaEvaluasiId: d.rencanaEvaluasiId,
    }));
  }

  static async saveKomponen(
    kelasKuliahId: number,
    list: Array<{ nama: string; bobot: number; subCpmkId?: number | null; rencanaEvaluasiId?: number | null }>,
  ) {
    const foundKelas = await db.query.kelasKuliah.findFirst({
      where: eq(kelasKuliah.id, kelasKuliahId),
    });
    if (foundKelas?.isLocked) {
      throw new Error('Nilai kelas ini telah dikunci dan tidak dapat diubah.');
    }

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
          updatedAt: new Date(),
        })
        .where(eq(krs.kelasKuliahId, kelasKuliahId));

      const inserts = list.map((item) => ({
        kelasKuliahId,
        nama: item.nama,
        bobot: item.bobot,
        subCpmkId: item.subCpmkId || null,
        rencanaEvaluasiId: item.rencanaEvaluasiId || null,
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
        nilaiIndeks: krs.nilaiIndeks,
      })
      .from(krs)
      .innerJoin(mahasiswa, eq(krs.mahasiswaId, mahasiswa.id))
      .where(eq(krs.kelasKuliahId, kelasKuliahId));

    const components = await this.getKomponen(kelasKuliahId);
    const componentIds = components.map((c) => c.id);

    const grades =
      componentIds.length > 0
        ? await db
            .select()
            .from(nilaiKomponenMahasiswa)
            .where(and(inArray(nilaiKomponenMahasiswa.komponenNilaiId, componentIds)))
        : [];

    // Map grades per KRS
    const gradesMap = new Map<number, (typeof nilaiKomponenMahasiswa.$inferSelect)[]>();
    for (const g of grades) {
      const arr = gradesMap.get(g.krsId) || [];
      arr.push(g);
      gradesMap.set(g.krsId, arr);
    }

    return studentList.map((stud) => ({
      ...stud,
      nilaiKomponen: gradesMap.get(stud.krsId) || [],
    }));
  }

  static async saveNilaiMahasiswa(
    kelasKuliahId: number,
    list: Array<{
      krsId: number;
      nilaiKomponenList: Array<{ komponenNilaiId: number; nilai: number | string }>;
    }>,
  ) {
    const foundKelas = await db.query.kelasKuliah.findFirst({
      where: eq(kelasKuliah.id, kelasKuliahId),
    });
    if (foundKelas?.isLocked) {
      throw new Error('Nilai kelas ini telah dikunci dan tidak dapat diubah.');
    }

    // Load global conversion rules (mata kuliah global, tidak terikat prodi)
    const allRules = await db.select().from(konversiNilai);
    const activeRules = allRules.filter((r) => r.programStudiId === null);

    const getGradeFromRules = (score: number) => {
      for (const rule of activeRules) {
        const min = parseFloat(rule.nilaiMin);
        const max = parseFloat(rule.nilaiMax);
        if (score >= min && score <= max) {
          return { huruf: rule.nilaiHuruf, indeks: parseFloat(rule.bobotIndeks) };
        }
      }
      // Fallback statis
      if (score >= 80) return { huruf: 'A', indeks: 4.0 };
      if (score >= 75) return { huruf: 'B+', indeks: 3.5 };
      if (score >= 70) return { huruf: 'B', indeks: 3.0 };
      if (score >= 65) return { huruf: 'C+', indeks: 2.5 };
      if (score >= 60) return { huruf: 'C', indeks: 2.0 };
      if (score >= 50) return { huruf: 'D', indeks: 1.0 };
      return { huruf: 'E', indeks: 0.0 };
    };

    const components = await this.getKomponen(kelasKuliahId);
    const compMap = new Map<number, number>();
    for (const c of components) {
      compMap.set(c.id, c.bobot);
    }

    return await db.transaction(async (tx) => {
      const results = [];

      for (const item of list) {
        // Delete existing grades for this KRS and components
        const compIds = item.nilaiKomponenList.map((v) => v.komponenNilaiId);
        if (compIds.length > 0) {
          await tx
            .delete(nilaiKomponenMahasiswa)
            .where(
              and(
                eq(nilaiKomponenMahasiswa.krsId, item.krsId),
                inArray(nilaiKomponenMahasiswa.komponenNilaiId, compIds),
              ),
            );
        }

        // Insert new component grades
        const inserts = item.nilaiKomponenList.map((v) => ({
          krsId: item.krsId,
          komponenNilaiId: v.komponenNilaiId,
          nilai: String(v.nilai),
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
          const conversion = getGradeFromRules(finalScoreFixed);

          const [updatedKrs] = await tx
            .update(krs)
            .set({
              nilaiAngka: String(finalScoreFixed),
              nilaiHuruf: conversion.huruf,
              nilaiIndeks: String(conversion.indeks),
              updatedAt: new Date(),
            })
            .where(eq(krs.id, item.krsId))
            .returning();
          results.push(updatedKrs);
        }
      }

      return results;
    });
  }

  static async lockKelas(kelasKuliahId: number) {
    return await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(kelasKuliah)
        .set({ isLocked: true, updatedAt: new Date() })
        .where(eq(kelasKuliah.id, kelasKuliahId))
        .returning();
      if (!updated) {
        throw new Error('Kelas kuliah tidak ditemukan.');
      }

      // Load components for this class
      const components = await tx.select().from(komponenNilai).where(eq(komponenNilai.kelasKuliahId, kelasKuliahId));
      const compMap = new Map<number, number>();
      let totalWeight = 0;
      for (const c of components) {
        compMap.set(c.id, c.bobot);
        totalWeight += c.bobot;
      }

      // Load conversion rules
      const allRules = await tx.select().from(konversiNilai);
      const activeRules = allRules.filter((r) => r.programStudiId === null);

      const getGradeFromRules = (score: number) => {
        for (const rule of activeRules) {
          const min = parseFloat(rule.nilaiMin);
          const max = parseFloat(rule.nilaiMax);
          if (score >= min && score <= max) {
            return { huruf: rule.nilaiHuruf, indeks: parseFloat(rule.bobotIndeks) };
          }
        }
        if (score >= 80) return { huruf: 'A', indeks: 4.0 };
        if (score >= 75) return { huruf: 'B+', indeks: 3.5 };
        if (score >= 70) return { huruf: 'B', indeks: 3.0 };
        if (score >= 65) return { huruf: 'C+', indeks: 2.5 };
        if (score >= 60) return { huruf: 'C', indeks: 2.0 };
        if (score >= 50) return { huruf: 'D', indeks: 1.0 };
        return { huruf: 'E', indeks: 0.0 };
      };

      // Get all KRS records for this class
      const krsRecords = await tx.select().from(krs).where(eq(krs.kelasKuliahId, kelasKuliahId));

      // Calculate NA_MK for each student
      for (const krsItem of krsRecords) {
        const studentGrades = await tx
          .select()
          .from(nilaiKomponenMahasiswa)
          .where(eq(nilaiKomponenMahasiswa.krsId, krsItem.id));

        let finalScore = 0;
        let registeredWeight = 0;
        for (const g of studentGrades) {
          const weight = compMap.get(g.komponenNilaiId) || 0;
          finalScore += parseFloat(g.nilai) * (weight / 100);
          registeredWeight += weight;
        }

        if (totalWeight === 100 && registeredWeight === 100) {
          const finalScoreFixed = parseFloat(finalScore.toFixed(2));
          const conversion = getGradeFromRules(finalScoreFixed);

          await tx
            .update(krs)
            .set({
              nilaiAngka: String(finalScoreFixed),
              nilaiHuruf: conversion.huruf,
              nilaiIndeks: String(conversion.indeks),
              updatedAt: new Date(),
            })
            .where(eq(krs.id, krsItem.id));
        }
      }

      // Calculate capaian_cpmk for each student
      const kelas = await tx.query.kelasKuliah.findFirst({
        where: eq(kelasKuliah.id, kelasKuliahId),
        with: { mataKuliah: true },
      });
      if (kelas) {
        const cpmkInMk = await tx.query.cpmk.findMany({
          where: eq(cpmk.mataKuliahId, kelas.mataKuliahId),
        });

        const komponenWithSubCpmk = await tx.query.komponenNilai.findMany({
          where: eq(komponenNilai.kelasKuliahId, kelasKuliahId),
        });

        // Get subCpmk for each komponen
        const subCpmkIds = komponenWithSubCpmk.map((k) => k.subCpmkId).filter((id): id is number => id !== null);
        let subCpmkMap = new Map<number, number>();
        if (subCpmkIds.length > 0) {
          const subCpmkList = await tx.query.subCpmk.findMany({
            where: inArray(subCpmk.id, subCpmkIds),
          });
          for (const sc of subCpmkList) {
            subCpmkMap.set(sc.id, sc.cpmkId);
          }
        }

        // Clear existing capaian_cpmk for this kelas
        await tx.delete(capaianCpmk).where(eq(capaianCpmk.kelasKuliahId, kelasKuliahId));

        // Get mahasiswa details for kurikulum lookup
        const mahasiswaIds = [...new Set(krsRecords.map((k) => k.mahasiswaId))];
        const mahasiswaList = await tx.query.mahasiswa.findMany({
          where: inArray(mahasiswa.id, mahasiswaIds),
        });
        const mahasiswaMap = new Map(mahasiswaList.map((m) => [m.id, m]));

        // Build kurikulumId map per mahasiswa
        const kurikulumPerMahasiswa = new Map<number, number | null>();
        for (const mhs of mahasiswaList) {
          if (!mhs.angkatan || !mhs.programStudiId) {
            kurikulumPerMahasiswa.set(mhs.id, null);
            continue;
          }
          const angkatanKur = await tx.query.angkatanKurikulum.findFirst({
            where: and(
              eq(angkatanKurikulum.angkatan, mhs.angkatan),
              eq(angkatanKurikulum.programStudiId, mhs.programStudiId),
            ),
          });
          kurikulumPerMahasiswa.set(mhs.id, angkatanKur?.kurikulumId ?? null);
        }

        for (const krsItem of krsRecords) {
          const mahasiswaId = krsItem.mahasiswaId;
          const kurikulumId = kurikulumPerMahasiswa.get(mahasiswaId) ?? null;

          const compIds = komponenWithSubCpmk.map((c) => c.id);
          let studentGrades: (typeof nilaiKomponenMahasiswa.$inferSelect)[] = [];
          if (compIds.length > 0) {
            studentGrades = await tx
              .select()
              .from(nilaiKomponenMahasiswa)
              .where(
                and(
                  eq(nilaiKomponenMahasiswa.krsId, krsItem.id),
                  inArray(nilaiKomponenMahasiswa.komponenNilaiId, compIds),
                ),
              );
          }

          const gradeMap = new Map<number, number>();
          for (const g of studentGrades) {
            gradeMap.set(g.komponenNilaiId, parseFloat(g.nilai));
          }

          for (const cpmkItem of cpmkInMk) {
            const relevantKomponen = komponenWithSubCpmk.filter(
              (k) => k.subCpmkId && subCpmkMap.get(k.subCpmkId) === cpmkItem.id,
            );

            if (relevantKomponen.length === 0) continue;

            let totalScore = 0;
            let count = 0;
            for (const komp of relevantKomponen) {
              const score = gradeMap.get(komp.id);
              if (score !== undefined) {
                totalScore += score;
                count++;
              }
            }

            if (count === 0) continue;

            const nilaiCpmk = parseFloat((totalScore / count).toFixed(2));

            await tx.insert(capaianCpmk).values({
              mahasiswaId: krsItem.mahasiswaId,
              cpmkId: cpmkItem.id,
              kelasKuliahId,
              kurikulumId,
              nilai: nilaiCpmk.toString(),
            });
          }
        }
      }

      return updated;
    });
  }

  static async unlockKelas(kelasKuliahId: number) {
    const [updated] = await db
      .update(kelasKuliah)
      .set({ isLocked: false, updatedAt: new Date() })
      .where(eq(kelasKuliah.id, kelasKuliahId))
      .returning();
    if (!updated) {
      throw new Error('Kelas kuliah tidak ditemukan.');
    }
    return updated;
  }
}
