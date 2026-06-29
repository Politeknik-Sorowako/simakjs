import { db } from '../utils/db';
import { kurikulum, kurikulumMataKuliah } from '../models/schema';
import { count, eq, ilike, or } from 'drizzle-orm';

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
      whereClause = or(
        ilike(kurikulum.nama, `%${search}%`),
        ilike(kurikulum.kode, `%${search}%`)
      );
    }

    if (prodiId) {
      if (whereClause) {
        whereClause = or(whereClause, eq(kurikulum.programStudiId, prodiId));
      } else {
        whereClause = eq(kurikulum.programStudiId, prodiId);
      }
    }

    const [totalResult] = await db
      .select({ total: count() })
      .from(kurikulum)
      .where(whereClause);
    
    const total = totalResult?.total || 0;
    
    const data = await db.query.kurikulum.findMany({
      where: whereClause,
      limit,
      offset,
      with: {
        programStudi: true,
        semesterMulaiPeriode: true,
      }
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages
      }
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
            mataKuliah: true
          }
        }
      }
    });
    return data || null;
  }

  static async create(data: CreateKurikulumDto) {
    // Jika isAktif = true, nonaktifkan kurikulum lain di prodi yang sama
    if (data.isAktif) {
      await db.update(kurikulum)
        .set({ isAktif: false })
        .where(eq(kurikulum.programStudiId, data.programStudiId));
    }

    const [newKur] = await db.insert(kurikulum).values(data).returning();
    return newKur;
  }

  static async update(id: number, data: Partial<CreateKurikulumDto>) {
    if (data.isAktif) {
      const existing = await this.getById(id);
      if (existing) {
        await db.update(kurikulum)
          .set({ isAktif: false })
          .where(eq(kurikulum.programStudiId, existing.programStudiId));
      }
    }

    const [updatedKur] = await db
      .update(kurikulum)
      .set(data)
      .where(eq(kurikulum.id, id))
      .returning();
    return updatedKur || null;
  }

  static async delete(id: number) {
    const [deletedKur] = await db
      .delete(kurikulum)
      .where(eq(kurikulum.id, id))
      .returning();
    return deletedKur || null;
  }

  static async addMataKuliah(kurikulumId: number, data: AddMataKuliahDto) {
    const [newKmk] = await db
      .insert(kurikulumMataKuliah)
      .values({
        kurikulumId,
        ...data
      })
      .returning();
    return newKmk;
  }

  static async removeMataKuliah(kurikulumId: number, mataKuliahId: number) {
    const [deletedKmk] = await db
      .delete(kurikulumMataKuliah)
      .where(
        eq(kurikulumMataKuliah.kurikulumId, kurikulumId) &&
        eq(kurikulumMataKuliah.mataKuliahId, mataKuliahId)
      )
      .returning();
    return deletedKmk || null;
  }
}
