import { and, count, eq, ilike, or } from 'drizzle-orm';
import { evaluasiKurikulum, kurikulum, periodeAkademik, users } from '../models/schema';
import { db } from '../utils/db';

export interface CreateEvaluasiKurikulumDto {
  kurikulumId: number;
  periodeId?: string | null;
  sumber?: string;
  aspek: string;
  temuan: string;
  rekomendasi?: string | null;
  tindakLanjut?: string | null;
  status?: string;
  createdBy?: number | null;
}

export class EvaluasiKurikulumService {
  static async getAll(page = 1, limit = 10, kurikulumId?: number, periodeId?: string, status?: string) {
    const offset = (page - 1) * limit;
    const conditions = [];

    if (kurikulumId) conditions.push(eq(evaluasiKurikulum.kurikulumId, kurikulumId));
    if (periodeId) conditions.push(eq(evaluasiKurikulum.periodeId, periodeId));
    if (status) conditions.push(eq(evaluasiKurikulum.status, status));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ total: count() }).from(evaluasiKurikulum).where(whereClause);
    const total = totalResult?.total || 0;

    const data = await db.query.evaluasiKurikulum.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: (e, { desc }) => [desc(e.createdAt)],
      with: {
        kurikulum: { columns: { id: true, kode: true, nama: true } },
        periode: { columns: { id: true, nama: true } },
        createdByUser: { columns: { id: true, nama: true, email: true } },
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: { total, page, limit, totalPages },
    };
  }

  static async getById(id: number) {
    return db.query.evaluasiKurikulum.findFirst({
      where: eq(evaluasiKurikulum.id, id),
      with: {
        kurikulum: true,
        periode: true,
        createdByUser: { columns: { id: true, nama: true, email: true } },
      },
    });
  }

  static async create(data: CreateEvaluasiKurikulumDto) {
    const kur = await db.query.kurikulum.findFirst({
      where: eq(kurikulum.id, data.kurikulumId),
    });
    if (!kur) {
      throw new Error('Kurikulum tidak ditemukan');
    }

    const [newData] = await db
      .insert(evaluasiKurikulum)
      .values({
        kurikulumId: data.kurikulumId,
        periodeId: data.periodeId || null,
        sumber: data.sumber || 'kaprodi',
        aspek: data.aspek,
        temuan: data.temuan,
        rekomendasi: data.rekomendasi || null,
        tindakLanjut: data.tindakLanjut || null,
        status: data.status || 'open',
        createdBy: data.createdBy || null,
      })
      .returning();
    return newData;
  }

  static async update(
    id: number,
    data: {
      aspek?: string;
      temuan?: string;
      rekomendasi?: string | null;
      tindakLanjut?: string | null;
      status?: string;
    },
  ) {
    const [updated] = await db
      .update(evaluasiKurikulum)
      .set({
        ...(data.aspek !== undefined && { aspek: data.aspek }),
        ...(data.temuan !== undefined && { temuan: data.temuan }),
        ...(data.rekomendasi !== undefined && { rekomendasi: data.rekomendasi }),
        ...(data.tindakLanjut !== undefined && { tindakLanjut: data.tindakLanjut }),
        ...(data.status !== undefined && { status: data.status }),
        updatedAt: new Date(),
      })
      .where(eq(evaluasiKurikulum.id, id))
      .returning();
    return updated || null;
  }

  static async delete(id: number) {
    const [deleted] = await db.delete(evaluasiKurikulum).where(eq(evaluasiKurikulum.id, id)).returning();
    return deleted || null;
  }
}
