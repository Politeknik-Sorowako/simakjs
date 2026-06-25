import { db } from '../utils/db';
import { krs, mahasiswa, kelasKuliah } from '../models/schema';
import { count, eq, ilike, or } from 'drizzle-orm';

export interface CreateKrsDto {
  mahasiswaId: number;
  kelasKuliahId: number;
  nilaiAngka?: number | string;
  nilaiHuruf?: string;
  nilaiIndeks?: number | string;
  idPddikti?: string;
}

export class KrsService {
  static async getAll(page = 1, limit = 10, search = '') {
    const offset = (page - 1) * limit;
    
    // We filter by Mahasiswa name or NIM
    let searchCondition = undefined;
    if (search) {
      searchCondition = or(
        ilike(mahasiswa.nama, `%${search}%`),
        ilike(mahasiswa.nim, `%${search}%`)
      );
    }

    const [totalResult] = await db
      .select({ total: count() })
      .from(krs)
      .leftJoin(mahasiswa, eq(krs.mahasiswaId, mahasiswa.id))
      .where(searchCondition);

    const total = totalResult?.total || 0;

    const rows = await db
      .select({
        id: krs.id,
        mahasiswaId: krs.mahasiswaId,
        kelasKuliahId: krs.kelasKuliahId,
        nilaiAngka: krs.nilaiAngka,
        nilaiHuruf: krs.nilaiHuruf,
        nilaiIndeks: krs.nilaiIndeks,
        idPddikti: krs.idPddikti,
        isSynced: krs.isSynced,
        lastSyncAt: krs.lastSyncAt,
        createdAt: krs.createdAt,
        updatedAt: krs.updatedAt,
        mahasiswa: {
          id: mahasiswa.id,
          nim: mahasiswa.nim,
          nama: mahasiswa.nama,
          email: mahasiswa.email
        },
        kelasKuliah: {
          id: kelasKuliah.id,
          namaKelas: kelasKuliah.namaKelas,
          periodeId: kelasKuliah.periodeId
        }
      })
      .from(krs)
      .leftJoin(mahasiswa, eq(krs.mahasiswaId, mahasiswa.id))
      .leftJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
      .where(searchCondition)
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
        id: krs.id,
        mahasiswaId: krs.mahasiswaId,
        kelasKuliahId: krs.kelasKuliahId,
        nilaiAngka: krs.nilaiAngka,
        nilaiHuruf: krs.nilaiHuruf,
        nilaiIndeks: krs.nilaiIndeks,
        idPddikti: krs.idPddikti,
        isSynced: krs.isSynced,
        lastSyncAt: krs.lastSyncAt,
        createdAt: krs.createdAt,
        updatedAt: krs.updatedAt,
        mahasiswa: {
          id: mahasiswa.id,
          nim: mahasiswa.nim,
          nama: mahasiswa.nama,
          email: mahasiswa.email
        },
        kelasKuliah: {
          id: kelasKuliah.id,
          namaKelas: kelasKuliah.namaKelas,
          periodeId: kelasKuliah.periodeId
        }
      })
      .from(krs)
      .leftJoin(mahasiswa, eq(krs.mahasiswaId, mahasiswa.id))
      .leftJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
      .where(eq(krs.id, id));

    return row || null;
  }

  static async create(data: CreateKrsDto) {
    // values expect type compatible with schema
    const insertData: any = {
      mahasiswaId: data.mahasiswaId,
      kelasKuliahId: data.kelasKuliahId,
      nilaiHuruf: data.nilaiHuruf,
      idPddikti: data.idPddikti
    };
    if (data.nilaiAngka !== undefined) insertData.nilaiAngka = String(data.nilaiAngka);
    if (data.nilaiIndeks !== undefined) insertData.nilaiIndeks = String(data.nilaiIndeks);

    const [newKrs] = await db.insert(krs).values(insertData).returning();
    return newKrs;
  }

  static async update(id: number, data: Partial<CreateKrsDto>) {
    const updateData: any = { ...data };
    if (data.nilaiAngka !== undefined) updateData.nilaiAngka = String(data.nilaiAngka);
    if (data.nilaiIndeks !== undefined) updateData.nilaiIndeks = String(data.nilaiIndeks);

    const [updatedKrs] = await db
      .update(krs)
      .set(updateData)
      .where(eq(krs.id, id))
      .returning();
    return updatedKrs || null;
  }

  static async delete(id: number) {
    const [deletedKrs] = await db
      .delete(krs)
      .where(eq(krs.id, id))
      .returning();
    return deletedKrs || null;
  }
}
