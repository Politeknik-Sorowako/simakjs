import { and, count, eq, ilike, inArray, or } from 'drizzle-orm';
import { dosen, kelasKuliah, krs, mahasiswa } from '../models/schema';
import { db } from '../utils/db';

export interface CreateKrsDto {
  mahasiswaId: number;
  kelasKuliahId: number;
  nilaiAngka?: number | string;
  nilaiHuruf?: string;
  nilaiIndeks?: number | string;
  idPddikti?: string;
}

export class KrsService {
  static async getAll(page = 1, limit = 10, search = '', mahasiswaId?: number) {
    const offset = (page - 1) * limit;

    const searchConditions: any[] = [];
    if (search) {
      searchConditions.push(or(ilike(mahasiswa.nama, `%${search}%`), ilike(mahasiswa.nim, `%${search}%`)));
    }
    if (mahasiswaId !== undefined) {
      searchConditions.push(eq(krs.mahasiswaId, mahasiswaId));
    }

    const whereClause = searchConditions.length > 0 ? and(...searchConditions) : undefined;

    const [totalResult] = await db
      .select({ total: count() })
      .from(krs)
      .leftJoin(mahasiswa, eq(krs.mahasiswaId, mahasiswa.id))
      .where(whereClause);

    const total = totalResult?.total || 0;

    const rows = await db
      .select({
        id: krs.id,
        mahasiswaId: krs.mahasiswaId,
        kelasKuliahId: krs.kelasKuliahId,
        nilaiAngka: krs.nilaiAngka,
        nilaiHuruf: krs.nilaiHuruf,
        nilaiIndeks: krs.nilaiIndeks,
        isApproved: krs.isApproved,
        approvedById: krs.approvedById,
        approvedAt: krs.approvedAt,
        idPddikti: krs.idPddikti,
        isSynced: krs.isSynced,
        lastSyncAt: krs.lastSyncAt,
        createdAt: krs.createdAt,
        updatedAt: krs.updatedAt,
        mahasiswa: {
          id: mahasiswa.id,
          nim: mahasiswa.nim,
          nama: mahasiswa.nama,
          email: mahasiswa.email,
          status: mahasiswa.status,
        },
        kelasKuliah: {
          id: kelasKuliah.id,
          namaKelas: kelasKuliah.namaKelas,
          periodeId: kelasKuliah.periodeId,
        },
        approvedBy: {
          id: dosen.id,
          nip: dosen.nip,
          nama: dosen.nama,
        },
      })
      .from(krs)
      .leftJoin(mahasiswa, eq(krs.mahasiswaId, mahasiswa.id))
      .leftJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
      .leftJoin(dosen, eq(krs.approvedById, dosen.id))
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

  static async getById(id: number) {
    const [row] = await db
      .select({
        id: krs.id,
        mahasiswaId: krs.mahasiswaId,
        kelasKuliahId: krs.kelasKuliahId,
        nilaiAngka: krs.nilaiAngka,
        nilaiHuruf: krs.nilaiHuruf,
        nilaiIndeks: krs.nilaiIndeks,
        isApproved: krs.isApproved,
        approvedById: krs.approvedById,
        approvedAt: krs.approvedAt,
        idPddikti: krs.idPddikti,
        isSynced: krs.isSynced,
        lastSyncAt: krs.lastSyncAt,
        createdAt: krs.createdAt,
        updatedAt: krs.updatedAt,
        mahasiswa: {
          id: mahasiswa.id,
          nim: mahasiswa.nim,
          nama: mahasiswa.nama,
          email: mahasiswa.email,
          status: mahasiswa.status,
        },
        kelasKuliah: {
          id: kelasKuliah.id,
          namaKelas: kelasKuliah.namaKelas,
          periodeId: kelasKuliah.periodeId,
        },
        approvedBy: {
          id: dosen.id,
          nip: dosen.nip,
          nama: dosen.nama,
        },
      })
      .from(krs)
      .leftJoin(mahasiswa, eq(krs.mahasiswaId, mahasiswa.id))
      .leftJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
      .leftJoin(dosen, eq(krs.approvedById, dosen.id))
      .where(eq(krs.id, id));

    return row || null;
  }

  static async create(data: CreateKrsDto) {
    const student = await db.query.mahasiswa.findFirst({
      where: eq(mahasiswa.id, data.mahasiswaId),
    });

    if (!student) {
      throw new Error('Mahasiswa tidak ditemukan');
    }

    if (student.status !== 'aktif') {
      throw new Error('Mahasiswa tidak berstatus aktif. Silakan selesaikan pembayaran SPP/UKT terlebih dahulu.');
    }

    const existingKrs = await db.query.krs.findFirst({
      where: and(eq(krs.mahasiswaId, data.mahasiswaId), eq(krs.kelasKuliahId, data.kelasKuliahId)),
    });

    if (existingKrs) {
      throw new Error('Mahasiswa sudah terdaftar di kelas kuliah ini (duplikat KRS tidak diperbolehkan).');
    }

    const insertData: any = {
      mahasiswaId: data.mahasiswaId,
      kelasKuliahId: data.kelasKuliahId,
      nilaiHuruf: data.nilaiHuruf,
      idPddikti: data.idPddikti,
      isApproved: false,
    };
    if (data.nilaiAngka !== undefined) insertData.nilaiAngka = String(data.nilaiAngka);
    if (data.nilaiIndeks !== undefined) insertData.nilaiIndeks = String(data.nilaiIndeks);

    const [newKrs] = await db.insert(krs).values(insertData).returning();
    return newKrs;
  }

  static async approveKrs(mahasiswaId: number | undefined | null, periodeId: string, approvedByEmail: string) {
    let dosenRecord = await db.query.dosen.findFirst({
      where: eq(dosen.email, approvedByEmail),
    });

    if (!dosenRecord) {
      dosenRecord = await db.query.dosen.findFirst();
    }

    if (!dosenRecord) {
      throw new Error('Dosen Pembimbing tidak ditemukan untuk melakukan approval.');
    }

    const classes = await db
      .select({ id: kelasKuliah.id })
      .from(kelasKuliah)
      .where(eq(kelasKuliah.periodeId, periodeId));

    if (classes.length === 0) {
      return [];
    }

    const classIds = classes.map((c) => c.id);

    const conditions = [inArray(krs.kelasKuliahId, classIds)];
    if (mahasiswaId) {
      conditions.push(eq(krs.mahasiswaId, mahasiswaId));
    }

    const updated = await db
      .update(krs)
      .set({
        isApproved: true,
        approvedById: dosenRecord.id,
        approvedAt: new Date(),
      })
      .where(and(...conditions))
      .returning();

    return updated;
  }

  static async update(id: number, data: Partial<CreateKrsDto>) {
    const updateData: any = { ...data };
    if (data.nilaiAngka !== undefined) updateData.nilaiAngka = String(data.nilaiAngka);
    if (data.nilaiIndeks !== undefined) updateData.nilaiIndeks = String(data.nilaiIndeks);

    const [updatedKrs] = await db.update(krs).set(updateData).where(eq(krs.id, id)).returning();
    return updatedKrs || null;
  }

  static async delete(id: number) {
    const [deletedKrs] = await db.delete(krs).where(eq(krs.id, id)).returning();
    return deletedKrs || null;
  }

  static async getPendingStudents(periodeId: string) {
    return await db
      .selectDistinct({
        id: mahasiswa.id,
        nim: mahasiswa.nim,
        nama: mahasiswa.nama,
        email: mahasiswa.email,
        status: mahasiswa.status,
      })
      .from(mahasiswa)
      .innerJoin(krs, eq(mahasiswa.id, krs.mahasiswaId))
      .innerJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
      .where(and(eq(kelasKuliah.periodeId, periodeId), eq(krs.isApproved, false)));
  }

  static async approveBatchKrs(mahasiswaIds: number[], periodeId: string, approvedByEmail: string) {
    let dosenRecord = await db.query.dosen.findFirst({
      where: eq(dosen.email, approvedByEmail),
    });

    if (!dosenRecord) {
      dosenRecord = await db.query.dosen.findFirst();
    }

    if (!dosenRecord) {
      throw new Error('Dosen Pembimbing tidak ditemukan untuk melakukan approval.');
    }

    const classes = await db
      .select({ id: kelasKuliah.id })
      .from(kelasKuliah)
      .where(eq(kelasKuliah.periodeId, periodeId));

    if (classes.length === 0 || mahasiswaIds.length === 0) {
      return [];
    }

    const classIds = classes.map((c) => c.id);

    return await db
      .update(krs)
      .set({
        isApproved: true,
        approvedById: dosenRecord.id,
        approvedAt: new Date(),
      })
      .where(and(inArray(krs.mahasiswaId, mahasiswaIds), inArray(krs.kelasKuliahId, classIds)))
      .returning();
  }
}
