import { and, asc, eq, inArray } from 'drizzle-orm';
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
  nilaiSubKomponenMahasiswa,
  pengajuanYudisium,
  programStudi,
  subCpmk,
  subKomponenNilai,
} from '../models/schema';
import { db } from '../utils/db';
import {
  buildFinalScore,
  computeKomponenScore,
  type KonversiRule,
  resolveGradeFromRules,
  type SubKomponenDef,
} from '../utils/grade-calc';

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

  static async getSubKomponen(kelasKuliahId: number) {
    const components = await db
      .select({ id: komponenNilai.id })
      .from(komponenNilai)
      .where(eq(komponenNilai.kelasKuliahId, kelasKuliahId));

    const componentIds = components.map((c) => c.id);
    if (componentIds.length === 0) return [];

    return await db
      .select()
      .from(subKomponenNilai)
      .where(inArray(subKomponenNilai.komponenNilaiId, componentIds))
      .orderBy(asc(subKomponenNilai.urutan), asc(subKomponenNilai.id));
  }

  static async saveSubKomponen(
    kelasKuliahId: number,
    komponenNilaiId: number,
    list: Array<{ nama: string; bobot: number; urutan?: number }>,
  ) {
    const foundKelas = await db.query.kelasKuliah.findFirst({
      where: eq(kelasKuliah.id, kelasKuliahId),
    });
    if (!foundKelas) {
      throw new Error('Kelas kuliah tidak ditemukan.');
    }
    if (foundKelas.isLocked) {
      throw new Error('Nilai kelas ini telah dikunci dan tidak dapat diubah.');
    }

    const [foundKomponen] = await db
      .select()
      .from(komponenNilai)
      .where(and(eq(komponenNilai.id, komponenNilaiId), eq(komponenNilai.kelasKuliahId, kelasKuliahId)));
    if (!foundKomponen) {
      throw new Error('Komponen nilai tidak ditemukan pada kelas ini.');
    }

    if (list.length > 0) {
      const totalBobot = list.reduce((sum, item) => sum + item.bobot, 0);
      if (totalBobot !== 100) {
        throw new Error('Total bobot sub-komponen harus tepat 100%.');
      }
      for (const item of list) {
        if (!item.nama.trim()) {
          throw new Error('Nama sub-komponen tidak boleh kosong.');
        }
      }
    }

    return await db.transaction(async (tx) => {
      // Replace set: hapus sub lama (cascade nilai sub) lalu reset nilai akhir kelas.
      await tx.delete(subKomponenNilai).where(eq(subKomponenNilai.komponenNilaiId, komponenNilaiId));

      // Nilai langsung pada komponen ini tidak lagi relevan bila kini memakai sub-komponen.
      await tx.delete(nilaiKomponenMahasiswa).where(eq(nilaiKomponenMahasiswa.komponenNilaiId, komponenNilaiId));

      await tx
        .update(krs)
        .set({
          nilaiAngka: null,
          nilaiHuruf: null,
          nilaiIndeks: null,
          updatedAt: new Date(),
        })
        .where(eq(krs.kelasKuliahId, kelasKuliahId));

      if (list.length === 0) return [];

      const inserts = list.map((item, index) => ({
        komponenNilaiId,
        nama: item.nama,
        bobot: item.bobot,
        urutan: item.urutan ?? index,
      }));

      return await tx.insert(subKomponenNilai).values(inserts).returning();
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
        foto: mahasiswa.foto,
        nilaiAngka: krs.nilaiAngka,
        nilaiHuruf: krs.nilaiHuruf,
        nilaiIndeks: krs.nilaiIndeks,
      })
      .from(krs)
      .innerJoin(mahasiswa, eq(krs.mahasiswaId, mahasiswa.id))
      .where(eq(krs.kelasKuliahId, kelasKuliahId))
      .orderBy(asc(mahasiswa.nim));

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

    const krsIds = studentList.map((stud) => stud.krsId);
    const subGrades =
      krsIds.length > 0
        ? await db.select().from(nilaiSubKomponenMahasiswa).where(inArray(nilaiSubKomponenMahasiswa.krsId, krsIds))
        : [];

    const subGradesMap = new Map<number, (typeof nilaiSubKomponenMahasiswa.$inferSelect)[]>();
    for (const g of subGrades) {
      const arr = subGradesMap.get(g.krsId) || [];
      arr.push(g);
      subGradesMap.set(g.krsId, arr);
    }

    return studentList.map((stud) => ({
      ...stud,
      nilaiKomponen: gradesMap.get(stud.krsId) || [],
      nilaiSub: subGradesMap.get(stud.krsId) || [],
    }));
  }

  private static buildSubDefsMap(
    rows: Array<{ id: number; komponenNilaiId: number; bobot: number }>,
  ): Map<number, SubKomponenDef[]> {
    const map = new Map<number, SubKomponenDef[]>();
    for (const row of rows) {
      const arr = map.get(row.komponenNilaiId) ?? [];
      arr.push({ id: row.id, bobot: row.bobot });
      map.set(row.komponenNilaiId, arr);
    }
    return map;
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
    const activeRules = allRules.filter((r) => r.programStudiId === null) as KonversiRule[];

    const components = await this.getKomponen(kelasKuliahId);
    const componentDefs = components.map((c) => ({ id: c.id, bobot: c.bobot }));

    const componentIds = components.map((c) => c.id);
    const subDefsByKomponen =
      componentIds.length > 0
        ? this.buildSubDefsMap(
            await db.select().from(subKomponenNilai).where(inArray(subKomponenNilai.komponenNilaiId, componentIds)),
          )
        : new Map<number, SubKomponenDef[]>();

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

        // Recalculate Final Grade for this student (sub-komponen aware)
        const directRows = await tx
          .select()
          .from(nilaiKomponenMahasiswa)
          .where(eq(nilaiKomponenMahasiswa.krsId, item.krsId));
        const subRows = await tx
          .select()
          .from(nilaiSubKomponenMahasiswa)
          .where(eq(nilaiSubKomponenMahasiswa.krsId, item.krsId));

        const directGrades = new Map(directRows.map((g) => [g.komponenNilaiId, parseFloat(g.nilai)]));
        const subGrades = new Map(subRows.map((g) => [g.subKomponenNilaiId, parseFloat(g.nilai)]));

        const calc = buildFinalScore(componentDefs, subDefsByKomponen, directGrades, subGrades);

        // Update KRS only if weights are correct (e.g. all components/sub are entered)
        if (calc.registeredWeight === 100) {
          const conversion = resolveGradeFromRules(activeRules, calc.finalScore);

          const [updatedKrs] = await tx
            .update(krs)
            .set({
              nilaiAngka: String(calc.finalScore),
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

  static async saveNilaiSub(
    kelasKuliahId: number,
    list: Array<{
      krsId: number;
      subNilaiList: Array<{ subKomponenNilaiId: number; nilai: number | string }>;
    }>,
  ) {
    const foundKelas = await db.query.kelasKuliah.findFirst({
      where: eq(kelasKuliah.id, kelasKuliahId),
    });
    if (foundKelas?.isLocked) {
      throw new Error('Nilai kelas ini telah dikunci dan tidak dapat diubah.');
    }

    const allRules = await db.select().from(konversiNilai);
    const activeRules = allRules.filter((r) => r.programStudiId === null) as KonversiRule[];

    const components = await this.getKomponen(kelasKuliahId);
    const componentDefs = components.map((c) => ({ id: c.id, bobot: c.bobot }));

    const componentIds = components.map((c) => c.id);
    const subDefsByKomponen =
      componentIds.length > 0
        ? this.buildSubDefsMap(
            await db.select().from(subKomponenNilai).where(inArray(subKomponenNilai.komponenNilaiId, componentIds)),
          )
        : new Map<number, SubKomponenDef[]>();

    return await db.transaction(async (tx) => {
      const results = [];

      for (const item of list) {
        const subIds = item.subNilaiList.map((v) => v.subKomponenNilaiId);
        if (subIds.length > 0) {
          await tx
            .delete(nilaiSubKomponenMahasiswa)
            .where(
              and(
                eq(nilaiSubKomponenMahasiswa.krsId, item.krsId),
                inArray(nilaiSubKomponenMahasiswa.subKomponenNilaiId, subIds),
              ),
            );
        }

        const inserts = item.subNilaiList.map((v) => ({
          krsId: item.krsId,
          subKomponenNilaiId: v.subKomponenNilaiId,
          nilai: String(v.nilai),
        }));

        if (inserts.length > 0) {
          await tx.insert(nilaiSubKomponenMahasiswa).values(inserts);
        }

        const directRows = await tx
          .select()
          .from(nilaiKomponenMahasiswa)
          .where(eq(nilaiKomponenMahasiswa.krsId, item.krsId));
        const subRows = await tx
          .select()
          .from(nilaiSubKomponenMahasiswa)
          .where(eq(nilaiSubKomponenMahasiswa.krsId, item.krsId));

        const directGrades = new Map(directRows.map((g) => [g.komponenNilaiId, parseFloat(g.nilai)]));
        const subGrades = new Map(subRows.map((g) => [g.subKomponenNilaiId, parseFloat(g.nilai)]));

        const calc = buildFinalScore(componentDefs, subDefsByKomponen, directGrades, subGrades);

        if (calc.registeredWeight === 100) {
          const conversion = resolveGradeFromRules(activeRules, calc.finalScore);

          const [updatedKrs] = await tx
            .update(krs)
            .set({
              nilaiAngka: String(calc.finalScore),
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
      const componentDefs = components.map((c) => ({ id: c.id, bobot: c.bobot }));
      let totalWeight = 0;
      for (const c of components) {
        totalWeight += c.bobot;
      }

      // Load sub-komponen definitions for this class
      const componentIds = components.map((c) => c.id);
      const subRows =
        componentIds.length > 0
          ? await tx.select().from(subKomponenNilai).where(inArray(subKomponenNilai.komponenNilaiId, componentIds))
          : [];
      const subDefsByKomponen = this.buildSubDefsMap(subRows);

      // Load conversion rules
      const allRules = await tx.select().from(konversiNilai);
      const activeRules = allRules.filter((r) => r.programStudiId === null) as KonversiRule[];

      // Get all KRS records for this class
      const krsRecords = await tx.select().from(krs).where(eq(krs.kelasKuliahId, kelasKuliahId));

      // Map of aggregated level-1 scores per KRS (used for capaian_cpmk)
      const l1MapByKrs = new Map<number, Map<number, number>>();

      // Calculate NA_MK for each student (sub-komponen aware)
      for (const krsItem of krsRecords) {
        const directRows = await tx
          .select()
          .from(nilaiKomponenMahasiswa)
          .where(eq(nilaiKomponenMahasiswa.krsId, krsItem.id));
        const subRowsForKrs = await tx
          .select()
          .from(nilaiSubKomponenMahasiswa)
          .where(eq(nilaiSubKomponenMahasiswa.krsId, krsItem.id));

        const directGrades = new Map(directRows.map((g) => [g.komponenNilaiId, parseFloat(g.nilai)]));
        const subGrades = new Map(subRowsForKrs.map((g) => [g.subKomponenNilaiId, parseFloat(g.nilai)]));

        const calc = buildFinalScore(componentDefs, subDefsByKomponen, directGrades, subGrades);

        // Build aggregated level-1 score map for OBE (capaian_cpmk)
        const l1Map = new Map<number, number>();
        for (const comp of components) {
          const subs = subDefsByKomponen.get(comp.id) ?? [];
          if (subs.length > 0) {
            const subResult = computeKomponenScore(subGrades, subs);
            if (subResult.complete && subResult.score !== null) {
              l1Map.set(comp.id, subResult.score);
            }
          } else {
            const direct = directGrades.get(comp.id);
            if (direct !== undefined) {
              l1Map.set(comp.id, direct);
            }
          }
        }
        l1MapByKrs.set(krsItem.id, l1Map);

        if (totalWeight === 100 && calc.registeredWeight === 100) {
          const conversion = resolveGradeFromRules(activeRules, calc.finalScore);

          await tx
            .update(krs)
            .set({
              nilaiAngka: String(calc.finalScore),
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
        const subCpmkMap = new Map<number, number>();
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

          // Aggregated level-1 scores (sub-komponen aware)
          const gradeMap = l1MapByKrs.get(krsItem.id) ?? new Map<number, number>();

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
