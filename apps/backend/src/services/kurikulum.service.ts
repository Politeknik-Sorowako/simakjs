import { and, count, eq, ilike, inArray, or } from 'drizzle-orm';
import { kurikulum, kurikulumMataKuliah, mataKuliah } from '../models/schema';
import { db } from '../utils/db';

export interface CreateKurikulumDto {
  kode: string;
  nama: string;
  programStudiId: number;
  semesterMulai: string;
  jumlahSksLulus: number;
  jumlahSksWajib: number;
  jumlahSksPilihan: number;
  isAktif?: boolean;
  idPddikti?: string;
}

export interface AddMataKuliahDto {
  mataKuliahId: number;
  semester: number;
  sksMataKuliah: number;
  sksTatapMuka?: number;
  sksPraktek?: number;
  sksPraktekLapangan?: number;
  sksSimulasi?: number;
  isWajib?: boolean;
}

export class KurikulumService {
  static async getAll(page = 1, limit = 10, search = '', prodiId?: number) {
    const offset = (page - 1) * limit;
    let whereClause = undefined;

    if (search) {
      whereClause = or(ilike(kurikulum.nama, `%${search}%`), ilike(kurikulum.kode, `%${search}%`));
    }

    if (prodiId) {
      if (whereClause) {
        whereClause = and(whereClause, eq(kurikulum.programStudiId, prodiId));
      } else {
        whereClause = eq(kurikulum.programStudiId, prodiId);
      }
    }

    const [totalResult] = await db.select({ total: count() }).from(kurikulum).where(whereClause);

    const total = totalResult?.total || 0;

    const data = await db.query.kurikulum.findMany({
      where: whereClause,
      limit,
      offset,
      with: {
        programStudi: true,
        semesterMulaiPeriode: true,
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  static async getById(id: number) {
    const data = await db.query.kurikulum.findFirst({
      where: eq(kurikulum.id, id),
      with: {
        programStudi: true,
        semesterMulaiPeriode: true,
        kurikulumMataKuliah: {
          with: {
            mataKuliah: true,
          },
        },
      },
    });
    return data || null;
  }

  static async create(data: CreateKurikulumDto) {
    return await db.transaction(async (tx) => {
      if (data.isAktif) {
        await tx.update(kurikulum).set({ isAktif: false }).where(eq(kurikulum.programStudiId, data.programStudiId));
      }
      const [newKur] = await tx.insert(kurikulum).values(data).returning();
      return newKur;
    });
  }

  static async update(id: number, data: Partial<CreateKurikulumDto>) {
    return await db.transaction(async (tx) => {
      if (data.isAktif) {
        const existing = await this.getById(id);
        if (existing) {
          await tx.update(kurikulum).set({ isAktif: false }).where(eq(kurikulum.programStudiId, existing.programStudiId));
        }
      }
      const [updatedKur] = await tx.update(kurikulum).set(data).where(eq(kurikulum.id, id)).returning();
      return updatedKur || null;
    });
  }

  static async delete(id: number) {
    const [deletedKur] = await db.delete(kurikulum).where(eq(kurikulum.id, id)).returning();
    return deletedKur || null;
  }

  static async addMataKuliah(kurikulumId: number, data: AddMataKuliahDto) {
    const [newKmk] = await db
      .insert(kurikulumMataKuliah)
      .values({
        kurikulumId,
        ...data,
      })
      .returning();
    return newKmk;
  }

  static async removeMataKuliah(kurikulumId: number, mataKuliahId: number) {
    const [deletedKmk] = await db
      .delete(kurikulumMataKuliah)
      .where(and(eq(kurikulumMataKuliah.kurikulumId, kurikulumId), eq(kurikulumMataKuliah.mataKuliahId, mataKuliahId)))
      .returning();
    return deletedKmk || null;
  }

  static async copyFromKurikulum(targetKurikulumId: number, sourceKurikulumId: number) {
    const source = await this.getById(sourceKurikulumId);
    if (!source) throw new Error('Kurikulum sumber tidak ditemukan');

    const target = await this.getById(targetKurikulumId);
    if (!target) throw new Error('Kurikulum target tidak ditemukan');

    const existingSet = new Set(target.kurikulumMataKuliah.map((kmk) => kmk.mataKuliahId));
    const toInsert = source.kurikulumMataKuliah.filter((kmk) => !existingSet.has(kmk.mataKuliahId));

    if (toInsert.length === 0) {
      return { copied: 0, skipped: source.kurikulumMataKuliah.length, sourceKode: source.kode, sourceNama: source.nama };
    }

    return await db.transaction(async (tx) => {
      await tx.insert(kurikulumMataKuliah).values(
        toInsert.map((kmk) => ({
          kurikulumId: targetKurikulumId,
          mataKuliahId: kmk.mataKuliahId,
          semester: kmk.semester,
          sksMataKuliah: kmk.sksMataKuliah,
          sksTatapMuka: kmk.sksTatapMuka,
          sksPraktek: kmk.sksPraktek,
          sksPraktekLapangan: kmk.sksPraktekLapangan,
          sksSimulasi: kmk.sksSimulasi,
          isWajib: kmk.isWajib,
        })),
      );
      return { copied: toInsert.length, skipped: source.kurikulumMataKuliah.length - toInsert.length, sourceKode: source.kode, sourceNama: source.nama };
    });
  }

  static async importMkCsv(kurikulumId: number, csvText: string) {
    // Robust CSV parsing: handle BOM, CRLF
    const cleanText = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = cleanText.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV harus memiliki header dan minimal 1 baris data');

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const kodeIdx = headers.indexOf('kode_mata_kuliah');
    const semIdx = headers.indexOf('semester');
    const sksIdx = headers.indexOf('sks');
    const wajibIdx = headers.indexOf('is_wajib');

    if (kodeIdx === -1 || semIdx === -1) throw new Error('CSV harus memiliki kolom kode_mata_kuliah dan semester');

    const target = await this.getById(kurikulumId);
    if (!target) throw new Error('Kurikulum tidak ditemukan');

    const existingSet = new Set(target.kurikulumMataKuliah.map((kmk) => kmk.mataKuliahId));

    // Pre-fetch all MK codes in one query
    const allKodes = lines.slice(1).map((l) => l.split(',')[kodeIdx]?.trim()).filter(Boolean);
    const uniqueKodes = [...new Set(allKodes)];
    const allMk = await db.query.mataKuliah.findMany({
      where: inArray(mataKuliah.kode, uniqueKodes),
    });
    const mkMap = new Map(allMk.map((mk) => [mk.kode, mk]));

    const toInsert: (typeof kurikulumMataKuliah.$inferInsert)[] = [];
    const errors: { baris: number; pesan: string }[] = [];
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      const mkKode = cols[kodeIdx]?.trim();
      if (!mkKode) continue;

      const semester = parseInt(cols[semIdx]);
      if (isNaN(semester) || semester < 1) {
        errors.push({ baris: i + 1, pesan: `Semester tidak valid: "${cols[semIdx]}"` });
        continue;
      }

      const mk = mkMap.get(mkKode);
      if (!mk) {
        errors.push({ baris: i + 1, pesan: `Mata kuliah dengan kode "${mkKode}" tidak ditemukan` });
        continue;
      }

      if (existingSet.has(mk.id)) {
        skipped++;
        continue;
      }

      const sks = sksIdx !== -1 && cols[sksIdx] ? parseInt(cols[sksIdx]) : undefined;
      const isWajib = wajibIdx !== -1 ? cols[wajibIdx]?.toLowerCase() === 'true' || cols[wajibIdx] === '1' : true;

      toInsert.push({
        kurikulumId,
        mataKuliahId: mk.id,
        semester,
        sksMataKuliah: sks || mk.sksTotal,
        sksTatapMuka: mk.sksTatapMuka,
        sksPraktek: mk.sksPraktek,
        sksPraktekLapangan: mk.sksPraktekLapangan,
        sksSimulasi: mk.sksSimulasi,
        isWajib,
      });
      existingSet.add(mk.id);
    }

    let imported = 0;
    if (toInsert.length > 0) {
      await db.transaction(async (tx) => {
        await tx.insert(kurikulumMataKuliah).values(toInsert);
        imported = toInsert.length;
      });
    }

    return { imported, skipped, errors };
  }

  static async duplicate(id: number, kodeBaru: string, namaBaru: string) {
    const source = await this.getById(id);
    if (!source || !source.kurikulumMataKuliah) throw new Error('Kurikulum sumber tidak ditemukan');

    return await db.transaction(async (tx) => {
      const [newKur] = await tx
        .insert(kurikulum)
        .values({
          kode: kodeBaru,
          nama: namaBaru,
          programStudiId: source.programStudiId,
          semesterMulai: source.semesterMulai,
          jumlahSksLulus: source.jumlahSksLulus,
          jumlahSksWajib: source.jumlahSksWajib,
          jumlahSksPilihan: source.jumlahSksPilihan,
        })
        .returning();

      if (source.kurikulumMataKuliah.length > 0) {
        await tx.insert(kurikulumMataKuliah).values(
          source.kurikulumMataKuliah.map((kmk) => ({
            kurikulumId: newKur.id,
            mataKuliahId: kmk.mataKuliahId,
            semester: kmk.semester,
            sksMataKuliah: kmk.sksMataKuliah,
            sksTatapMuka: kmk.sksTatapMuka,
            sksPraktek: kmk.sksPraktek,
            sksPraktekLapangan: kmk.sksPraktekLapangan,
            sksSimulasi: kmk.sksSimulasi,
            isWajib: kmk.isWajib,
          })),
        );
      }

      return newKur;
    });
  }
}
