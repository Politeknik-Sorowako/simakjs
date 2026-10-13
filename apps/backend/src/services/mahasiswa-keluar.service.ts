import { and, count, desc, eq, ilike, or, SQL } from 'drizzle-orm';
import { mahasiswa, mahasiswaKeluar, periodeAkademik } from '../models/schema';
import { db } from '../utils/db';
import { LampiranStatusService } from './lampiran-status.service';

const lampiranMeta = {
  columns: { id: true, jenis: true, fileName: true, fileSize: true, fileType: true, keterangan: true, createdAt: true },
} as const;

export interface UpdateMahasiswaKeluarDto {
  periodeId?: string;
  statusBaru?: string;
  tanggalKeluar?: string;
  alasanKeluar?: string | null;
  noSk?: string | null;
  tanggalSk?: string | null;
  ipk?: number | null;
  nomorIjazah?: string | null;
}

export interface CreateMahasiswaKeluarDto {
  mahasiswaId: number;
  periodeId: string;
  statusBaru: string;
  tanggalKeluar: string;
  alasanKeluar?: string;
  noSk?: string;
  tanggalSk?: string;
  ipk?: number;
  nomorIjazah?: string;
}

export class MahasiswaKeluarService {
  static async create(data: CreateMahasiswaKeluarDto) {
    const mhs = await db.query.mahasiswa.findFirst({
      where: eq(mahasiswa.id, data.mahasiswaId),
    });

    if (!mhs) {
      throw new Error('Mahasiswa tidak ditemukan.');
    }

    // Insert into mahasiswa_keluar
    const [newKeluar] = await db
      .insert(mahasiswaKeluar)
      .values({
        mahasiswaId: data.mahasiswaId,
        periodeId: data.periodeId,
        statusBaru: data.statusBaru,
        tanggalKeluar: data.tanggalKeluar,
        alasanKeluar: data.alasanKeluar,
        noSk: data.noSk,
        tanggalSk: data.tanggalSk,
        ipk: data.ipk ? String(data.ipk) : null,
        nomorIjazah: data.nomorIjazah,
      })
      .returning();

    // Side effect: update mahasiswa status
    await db.update(mahasiswa).set({ status: data.statusBaru }).where(eq(mahasiswa.id, data.mahasiswaId));

    return newKeluar;
  }

  static async update(id: number, data: UpdateMahasiswaKeluarDto) {
    return db.transaction(async (tx) => {
      const record = await tx.query.mahasiswaKeluar.findFirst({ where: eq(mahasiswaKeluar.id, id) });
      if (!record) throw new Error('Data riwayat mahasiswa keluar tidak ditemukan.');

      const [updated] = await tx
        .update(mahasiswaKeluar)
        .set({
          periodeId: data.periodeId ?? record.periodeId,
          statusBaru: data.statusBaru ?? record.statusBaru,
          tanggalKeluar: data.tanggalKeluar ?? record.tanggalKeluar,
          alasanKeluar: data.alasanKeluar === undefined ? record.alasanKeluar : data.alasanKeluar,
          noSk: data.noSk === undefined ? record.noSk : data.noSk,
          tanggalSk: data.tanggalSk === undefined ? record.tanggalSk : data.tanggalSk,
          ipk: data.ipk === undefined ? record.ipk : data.ipk === null ? null : String(data.ipk),
          nomorIjazah: data.nomorIjazah === undefined ? record.nomorIjazah : data.nomorIjazah,
          updatedAt: new Date(),
        })
        .where(eq(mahasiswaKeluar.id, id))
        .returning();

      if (data.statusBaru && data.statusBaru !== record.statusBaru) {
        await tx.update(mahasiswa).set({ status: data.statusBaru }).where(eq(mahasiswa.id, record.mahasiswaId));
      }
      return updated;
    });
  }

  static async getById(id: number) {
    return (
      (await db.query.mahasiswaKeluar.findFirst({
        where: eq(mahasiswaKeluar.id, id),
        with: { lampiran: lampiranMeta },
      })) || null
    );
  }

  static async getAll(params: { page?: number; limit?: number; search?: string; periodeId?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    const data = await db.query.mahasiswaKeluar.findMany({
      where: (table, { eq, and }) => {
        const conds = [];
        if (params.periodeId) conds.push(eq(table.periodeId, params.periodeId));
        return conds.length > 0 ? and(...conds) : undefined;
      },
      limit,
      offset,
      orderBy: [desc(mahasiswaKeluar.createdAt)],
      with: {
        mahasiswa: {
          with: {
            programStudi: true,
          },
        },
        periodeAkademik: true,
        lampiran: lampiranMeta,
      },
    });

    // If search exists, filter by name or NIM in memory
    let filteredData = data;
    if (params.search) {
      const q = params.search.toLowerCase();
      filteredData = data.filter((d) => d.mahasiswa?.nama.toLowerCase().includes(q) || d.mahasiswa?.nim.includes(q));
    }

    const total = filteredData.length;
    const totalPages = Math.ceil(total / limit);

    return {
      data: filteredData,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  static async getStats(periodeId?: string) {
    const { count: count2 } = await import('drizzle-orm');
    const { programStudi: ps } = await import('../models/schema');

    const conditions: SQL<unknown>[] = [];
    if (periodeId) conditions.push(eq(mahasiswaKeluar.periodeId, periodeId));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [total] = await db.select({ count: count2() }).from(mahasiswaKeluar).where(whereClause);

    const perStatus = await db
      .select({ status: mahasiswaKeluar.statusBaru, count: count2() })
      .from(mahasiswaKeluar)
      .where(whereClause)
      .groupBy(mahasiswaKeluar.statusBaru);

    const perProdi = await db
      .select({
        prodiId: mahasiswa.programStudiId,
        prodiNama: ps.nama,
        total: count2(),
      })
      .from(mahasiswaKeluar)
      .innerJoin(mahasiswa, eq(mahasiswaKeluar.mahasiswaId, mahasiswa.id))
      .leftJoin(ps, eq(mahasiswa.programStudiId, ps.id))
      .where(whereClause)
      .groupBy(mahasiswa.programStudiId, ps.nama);

    return {
      total: Number(total?.count || 0),
      perStatus: perStatus.map((s) => ({ status: s.status, jumlah: Number(s.count) })),
      perProdi: perProdi.map((p) => ({ prodiId: p.prodiId, prodiNama: p.prodiNama || '-', total: Number(p.total) })),
    };
  }

  static async delete(id: number) {
    const record = await db.query.mahasiswaKeluar.findFirst({
      where: eq(mahasiswaKeluar.id, id),
    });

    if (!record) {
      throw new Error('Data riwayat mahasiswa keluar tidak ditemukan.');
    }

    // Delete record (row lampiran ikut terhapus via CASCADE; berkas fisik dibersihkan sesudahnya)
    const cleanupFiles = await LampiranStatusService.removeFilesForParent({ type: 'keluar', id });
    const [deleted] = await db.delete(mahasiswaKeluar).where(eq(mahasiswaKeluar.id, id)).returning();
    await cleanupFiles();

    // Revert status to aktif
    await db.update(mahasiswa).set({ status: 'aktif' }).where(eq(mahasiswa.id, record.mahasiswaId));

    return deleted;
  }
}
