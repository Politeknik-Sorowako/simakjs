import { and, count, eq } from 'drizzle-orm';
import { dosen, dosenPengajarKelas, kelasKuliah, mataKuliah } from '../models/schema';
import { db } from '../utils/db';

export interface CreateDosenPengajarDto {
  dosenId: number;
  kelasKuliahId: number;
  sksBebanMengajar?: number;
  idPddikti?: string;
}

export class DosenPengajarService {
  static async getAll(page = 1, limit = 10, kelasKuliahId?: number, dosenId?: number) {
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (kelasKuliahId) {
      conditions.push(eq(dosenPengajarKelas.kelasKuliahId, kelasKuliahId));
    }
    if (dosenId) {
      conditions.push(eq(dosenPengajarKelas.dosenId, dosenId));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ total: count() }).from(dosenPengajarKelas).where(whereClause);

    const total = totalResult?.total || 0;

    const rows = await (db as any)
      .select({
        id: dosenPengajarKelas.id,
        dosenId: dosenPengajarKelas.dosenId,
        kelasKuliahId: dosenPengajarKelas.kelasKuliahId,
        sksBebanMengajar: dosenPengajarKelas.sksBebanMengajar,
        idPddikti: dosenPengajarKelas.idPddikti,
        createdAt: dosenPengajarKelas.createdAt,
        updatedAt: dosenPengajarKelas.updatedAt,
        dosen: {
          id: dosen.id,
          nip: dosen.nip,
          nama: dosen.nama,
          email: dosen.email,
        },
        kelasKuliah: {
          id: kelasKuliah.id,
          namaKelas: kelasKuliah.namaKelas,
          periodeId: kelasKuliah.periodeId,
          mataKuliah: {
            id: mataKuliah.id,
            kode: mataKuliah.kode,
            nama: mataKuliah.nama,
            sksTotal: mataKuliah.sksTotal,
          },
        },
      })
      .from(dosenPengajarKelas)
      .leftJoin(dosen, eq(dosenPengajarKelas.dosenId, dosen.id))
      .leftJoin(kelasKuliah, eq(dosenPengajarKelas.kelasKuliahId, kelasKuliah.id))
      .leftJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
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
        totalPages,
      },
    };
  }

  static async create(data: CreateDosenPengajarDto) {
    const existing = await db.query.dosenPengajarKelas.findFirst({
      where: and(
        eq(dosenPengajarKelas.dosenId, data.dosenId),
        eq(dosenPengajarKelas.kelasKuliahId, data.kelasKuliahId),
      ),
    });
    if (existing) {
      throw new Error('Dosen sudah di-plot pada kelas ini.');
    }

    const [newPlotting] = await db
      .insert(dosenPengajarKelas)
      .values({
        dosenId: data.dosenId,
        kelasKuliahId: data.kelasKuliahId,
        sksBebanMengajar: data.sksBebanMengajar,
        idPddikti: data.idPddikti,
      })
      .returning();

    return newPlotting;
  }

  static async delete(id: number) {
    const [deletedPlotting] = await db.delete(dosenPengajarKelas).where(eq(dosenPengajarKelas.id, id)).returning();

    return deletedPlotting || null;
  }
}
