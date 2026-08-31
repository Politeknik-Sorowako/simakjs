import { mkdir, stat, writeFile } from 'node:fs/promises';
import { extname, join, parse } from 'node:path';
import { and, asc, count, desc, eq, ilike, inArray, notExists, or, SQL, sql } from 'drizzle-orm';
import { dosen, mahasiswa, programStudi, users } from '../models/schema';
import { db } from '../utils/db';

export interface MahasiswaFilters {
  filterNim?: string;
  filterNama?: string;
  filterEmail?: string;
  filterStatus?: string;
  hasAccount?: boolean;
  sortBy?: string;
  sortOrder?: string;
}

export interface CreateMahasiswaDto {
  nim: string;
  nama: string;
  email: string;
  programStudiId: number;
  dosenPaId?: number | null;
  status?: string;
  idPddikti?: string;
  namaIbuKandung?: string | null;
  nik?: string | null;
  jenisKelamin: 'L' | 'P';
  tanggalLahir?: string | null;
}

export class MahasiswaService {
  static async getAll(
    page = 1,
    limit = 10,
    search = '',
    dosenPaId?: number,
    programStudiId?: number,
    filters?: MahasiswaFilters,
  ) {
    const offset = (page - 1) * limit;

    let conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(mahasiswa.nama, `%${search}%`),
          ilike(mahasiswa.nim, `%${search}%`),
          ilike(mahasiswa.email, `%${search}%`),
        ),
      );
    }
    if (dosenPaId !== undefined) {
      conditions.push(eq(mahasiswa.dosenPaId, dosenPaId));
    }
    if (programStudiId !== undefined) {
      conditions.push(eq(mahasiswa.programStudiId, programStudiId));
    }

    if (filters?.filterNim) {
      conditions.push(ilike(mahasiswa.nim, `%${filters.filterNim}%`));
    }
    if (filters?.filterNama) {
      conditions.push(ilike(mahasiswa.nama, `%${filters.filterNama}%`));
    }
    if (filters?.hasAccount !== undefined) {
      const userSubquery = db.select({ id: users.id }).from(users).where(eq(users.email, mahasiswa.email));
      if (filters.hasAccount) {
        conditions.push(sql`EXISTS (${userSubquery})`);
      } else {
        conditions.push(notExists(userSubquery));
      }
    }
    if (filters?.filterEmail) {
      conditions.push(ilike(mahasiswa.email, `%${filters.filterEmail}%`));
    }
    if (filters?.filterStatus) {
      conditions.push(ilike(mahasiswa.status, `%${filters.filterStatus}%`));
    }

    let whereClause = undefined;
    if (conditions.length > 0) {
      whereClause = and(...conditions);
    }

    const [totalResult] = await db.select({ total: count() }).from(mahasiswa).where(whereClause);

    const total = totalResult?.total || 0;

    let orderByClause = undefined;
    if (filters?.sortBy) {
      // Map valid sortBy string to actual column
      // biome-ignore lint/suspicious/noExplicitAny: Drizzle column type for dynamic sort
      const sortMap: Record<string, any> = {
        nim: mahasiswa.nim,
        nama: mahasiswa.nama,
        email: mahasiswa.email,
        status: mahasiswa.status,
      };

      const sortColumn = sortMap[filters.sortBy];
      if (sortColumn) {
        orderByClause = filters.sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn);
      }
    }
    if (!orderByClause) {
      orderByClause = asc(mahasiswa.nim);
    }

    const data = await db.query.mahasiswa.findMany({
      where: whereClause,
      orderBy: orderByClause,
      limit,
      offset,
      with: {
        programStudi: true,
        dosenPa: true,
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
    const data = await db.query.mahasiswa.findFirst({
      where: eq(mahasiswa.id, id),
      with: {
        programStudi: true,
        dosenPa: true,
      },
    });
    return data || null;
  }

  static async create(data: CreateMahasiswaDto) {
    const [newMhs] = await db.insert(mahasiswa).values(data).returning();
    return newMhs;
  }

  static async update(id: number, data: Partial<CreateMahasiswaDto>) {
    const [updatedMhs] = await db.update(mahasiswa).set(data).where(eq(mahasiswa.id, id)).returning();
    return updatedMhs || null;
  }

  static async delete(id: number) {
    const [deletedMhs] = await db.delete(mahasiswa).where(eq(mahasiswa.id, id)).returning();
    return deletedMhs || null;
  }

  static async getMahasiswaIdByEmail(email: string): Promise<number | null> {
    const [mhs] = await db.select({ id: mahasiswa.id }).from(mahasiswa).where(eq(mahasiswa.email, email));
    return mhs ? mhs.id : null;
  }

  static async getDosenIdByEmail(email: string): Promise<number | null> {
    const [dsn] = await db.select({ id: dosen.id }).from(dosen).where(eq(dosen.email, email));
    return dsn ? dsn.id : null;
  }

  static async getStats(angkatan?: string, programStudiId?: number) {
    const conditions: SQL<unknown>[] = [];
    if (angkatan) conditions.push(eq(mahasiswa.angkatan, angkatan));
    if (programStudiId) conditions.push(eq(mahasiswa.programStudiId, programStudiId));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [total] = await db.select({ count: count() }).from(mahasiswa).where(whereClause);

    const statusRows = await db
      .select({ status: mahasiswa.status, count: count() })
      .from(mahasiswa)
      .where(whereClause)
      .groupBy(mahasiswa.status)
      .orderBy(mahasiswa.status);

    const perAngkatan = await db
      .select({ angkatan: mahasiswa.angkatan, count: count() })
      .from(mahasiswa)
      .where(whereClause)
      .groupBy(mahasiswa.angkatan)
      .orderBy(mahasiswa.angkatan);

    const perProdi = await db
      .select({ prodiId: mahasiswa.programStudiId, prodiNama: programStudi.nama, count: count() })
      .from(mahasiswa)
      .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id))
      .where(whereClause)
      .groupBy(mahasiswa.programStudiId, programStudi.nama)
      .orderBy(programStudi.nama);

    const statusMap: Record<string, number> = {};
    for (const r of statusRows) statusMap[r.status] = r.count;

    return {
      total: total?.count || 0,
      statusBreakdown: statusMap,
      perAngkatan,
      perProdi: perProdi.map((p) => ({ prodiId: p.prodiId, prodiNama: p.prodiNama || '-', count: p.count })),
    };
  }

  static async getMahasiswaBaru(angkatan?: string) {
    const conditions: SQL<unknown>[] = [];
    if (angkatan) conditions.push(eq(mahasiswa.angkatan, angkatan));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const perProdi = await db
      .select({
        prodiId: mahasiswa.programStudiId,
        prodiNama: programStudi.nama,
        total: count(),
        laki: sql<number>`COALESCE(SUM(CASE WHEN ${mahasiswa.jenisKelamin} = 'L' THEN 1 ELSE 0 END), 0)`,
        perempuan: sql<number>`COALESCE(SUM(CASE WHEN ${mahasiswa.jenisKelamin} = 'P' THEN 1 ELSE 0 END), 0)`,
      })
      .from(mahasiswa)
      .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id))
      .where(whereClause)
      .groupBy(mahasiswa.programStudiId, programStudi.nama)
      .orderBy(programStudi.nama);

    const trend = await db
      .select({ angkatan: mahasiswa.angkatan, total: count() })
      .from(mahasiswa)
      .where(whereClause)
      .groupBy(mahasiswa.angkatan)
      .orderBy(mahasiswa.angkatan);

    const totalCount = perProdi.reduce((s, p) => s + p.total, 0);

    return {
      total: totalCount,
      perProdi: perProdi.map((p) => ({
        prodiId: p.prodiId,
        prodiNama: p.prodiNama || '-',
        total: p.total,
        laki: Number(p.laki),
        perempuan: Number(p.perempuan),
      })),
      trend: trend.map((t) => ({ angkatan: t.angkatan || '-', total: t.total })),
    };
  }

  static async bulkSetDosenPa(mahasiswaIds: number[], dosenPaId: number | null) {
    if (mahasiswaIds.length === 0) return { updated: 0 };
    await db.update(mahasiswa).set({ dosenPaId, updatedAt: new Date() }).where(inArray(mahasiswa.id, mahasiswaIds));
    return { updated: mahasiswaIds.length };
  }

  static async updateFoto(mahasiswaId: number, fotoPath: string) {
    const [updated] = await db
      .update(mahasiswa)
      .set({ foto: fotoPath, updatedAt: new Date() })
      .where(eq(mahasiswa.id, mahasiswaId))
      .returning();
    return updated || null;
  }

  private static sanitizeNim(filename: string): string {
    const { name } = parse(filename);
    return name.replace(/[^a-zA-Z0-9]/g, '').trim();
  }

  private static getStoragePath(): string {
    return join(process.cwd(), 'storage', 'photos', 'mahasiswa');
  }

  static async saveFileToStorage(
    filename: string,
    buffer: Uint8Array | ArrayBuffer,
  ): Promise<{ filePath: string; relativePath: string }> {
    const storageDir = this.getStoragePath();
    await mkdir(storageDir, { recursive: true });

    const ext = extname(filename).toLowerCase() || '.jpg';
    const nim = this.sanitizeNim(filename);
    const safeFilename = `${nim}${ext}`;
    const filePath = join(storageDir, safeFilename);

    await writeFile(filePath, buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer);

    const relativePath = `/storage/photos/mahasiswa/${safeFilename}`;
    return { filePath, relativePath };
  }

  static async bulkProcessPhotos(
    files: Array<{ filename: string; buffer: Uint8Array | ArrayBuffer }>,
    overwrite = false,
  ): Promise<{
    total: number;
    successCount: number;
    failedCount: number;
    details: Array<{ nim: string; filename: string; status: 'success' | 'failed'; error?: string }>;
  }> {
    const storageDir = this.getStoragePath();
    await mkdir(storageDir, { recursive: true });

    const details: Array<{ nim: string; filename: string; status: 'success' | 'failed'; error?: string }> = [];
    let successCount = 0;
    let failedCount = 0;

    const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

    for (const file of files) {
      const ext = extname(file.filename).toLowerCase();
      const nim = this.sanitizeNim(file.filename);

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        details.push({
          nim,
          filename: file.filename,
          status: 'failed',
          error: `Ekstensi file tidak didukung: ${ext}`,
        });
        failedCount++;
        continue;
      }

      if (!nim) {
        details.push({
          nim: '',
          filename: file.filename,
          status: 'failed',
          error: 'Nama file tidak mengandung NIM yang valid',
        });
        failedCount++;
        continue;
      }

      try {
        const [existing] = await db
          .select({ id: mahasiswa.id, foto: mahasiswa.foto })
          .from(mahasiswa)
          .where(eq(mahasiswa.nim, nim))
          .limit(1);

        if (!existing) {
          details.push({
            nim,
            filename: file.filename,
            status: 'failed',
            error: `Mahasiswa dengan NIM ${nim} tidak ditemukan di database`,
          });
          failedCount++;
          continue;
        }

        if (!overwrite && existing.foto) {
          details.push({
            nim,
            filename: file.filename,
            status: 'failed',
            error: `Foto untuk NIM ${nim} sudah ada. Centang opsi "Timpa" untuk mengganti.`,
          });
          failedCount++;
          continue;
        }

        const safeFilename = `${nim}${ext}`;
        const filePath = join(storageDir, safeFilename);
        await writeFile(filePath, file.buffer instanceof ArrayBuffer ? new Uint8Array(file.buffer) : file.buffer);

        const relativePath = `/storage/photos/mahasiswa/${safeFilename}`;

        await db
          .update(mahasiswa)
          .set({ foto: relativePath, updatedAt: new Date() })
          .where(eq(mahasiswa.id, existing.id));

        details.push({
          nim,
          filename: file.filename,
          status: 'success',
        });
        successCount++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Terjadi kesalahan saat memproses file';
        details.push({
          nim,
          filename: file.filename,
          status: 'failed',
          error: msg,
        });
        failedCount++;
      }
    }

    return {
      total: files.length,
      successCount,
      failedCount,
      details,
    };
  }

  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
