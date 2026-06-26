import { db } from '../utils/db';
import { tagihan, mahasiswa } from '../models/schema';
import { count, eq, ilike, or, and } from 'drizzle-orm';

export class TagihanService {
  static async generateTagihanPeriode(periodeId: string) {
    const students = await db.select().from(mahasiswa);
    let createdCount = 0;

    for (const student of students) {
      // Check if tagihan already exists for this student in this period
      const [existing] = await db
        .select()
        .from(tagihan)
        .where(
          and(
            eq(tagihan.mahasiswaId, student.id),
            eq(tagihan.periodeId, periodeId)
          )
        )
        .limit(1);

      if (!existing) {
        await db.insert(tagihan).values({
          mahasiswaId: student.id,
          periodeId: periodeId,
          nominal: 5000000,
          status: 'belum_bayar'
        });

        // Set status to non_aktif until they pay
        await db
          .update(mahasiswa)
          .set({ status: 'non_aktif' })
          .where(eq(mahasiswa.id, student.id));

        createdCount++;
      }
    }

    return createdCount;
  }

  static async bayarTagihan(tagihanId: number) {
    const [tag] = await db.select().from(tagihan).where(eq(tagihan.id, tagihanId)).limit(1);
    if (!tag) {
      throw new Error('Tagihan tidak ditemukan');
    }

    if (tag.status === 'lunas') {
      throw new Error('Tagihan sudah lunas');
    }

    const [updatedTagihan] = await db
      .update(tagihan)
      .set({
        status: 'lunas',
        tanggalBayar: new Date()
      })
      .where(eq(tagihan.id, tagihanId))
      .returning();

    await db
      .update(mahasiswa)
      .set({ status: 'aktif' })
      .where(eq(mahasiswa.id, tag.mahasiswaId));

    return updatedTagihan;
  }

  static async getAll(page = 1, limit = 10, search = '', statusFilter?: string) {
    const offset = (page - 1) * limit;

    const searchConditions: any[] = [];
    if (search) {
      searchConditions.push(
        or(
          ilike(mahasiswa.nama, `%${search}%`),
          ilike(mahasiswa.nim, `%${search}%`)
        )
      );
    }
    if (statusFilter) {
      searchConditions.push(eq(tagihan.status, statusFilter as any));
    }

    const whereClause = searchConditions.length > 0 ? and(...searchConditions) : undefined;

    const [totalResult] = await db
      .select({ total: count() })
      .from(tagihan)
      .leftJoin(mahasiswa, eq(tagihan.mahasiswaId, mahasiswa.id))
      .where(whereClause);

    const total = totalResult?.total || 0;

    const rows = await db
      .select({
        id: tagihan.id,
        mahasiswaId: tagihan.mahasiswaId,
        periodeId: tagihan.periodeId,
        nominal: tagihan.nominal,
        status: tagihan.status,
        tanggalBayar: tagihan.tanggalBayar,
        createdAt: tagihan.createdAt,
        updatedAt: tagihan.updatedAt,
        mahasiswa: {
          id: mahasiswa.id,
          nim: mahasiswa.nim,
          nama: mahasiswa.nama,
          email: mahasiswa.email,
          status: mahasiswa.status
        }
      })
      .from(tagihan)
      .leftJoin(mahasiswa, eq(tagihan.mahasiswaId, mahasiswa.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(total / limit);

    return {
      data: rows,
      meta: {
        total,
        page,
        limit,
        totalPages
      }
    };
  }

  static async getById(id: number) {
    const [row] = await db
      .select({
        id: tagihan.id,
        mahasiswaId: tagihan.mahasiswaId,
        periodeId: tagihan.periodeId,
        nominal: tagihan.nominal,
        status: tagihan.status,
        tanggalBayar: tagihan.tanggalBayar,
        createdAt: tagihan.createdAt,
        updatedAt: tagihan.updatedAt,
        mahasiswa: {
          id: mahasiswa.id,
          nim: mahasiswa.nim,
          nama: mahasiswa.nama,
          email: mahasiswa.email,
          status: mahasiswa.status
        }
      })
      .from(tagihan)
      .leftJoin(mahasiswa, eq(tagihan.mahasiswaId, mahasiswa.id))
      .where(eq(tagihan.id, id))
      .limit(1);

    return row || null;
  }
}
