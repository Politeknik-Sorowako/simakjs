import { and, count, desc, eq, ilike, or } from 'drizzle-orm';
import { mahasiswa, mahasiswaKeluar, periodeAkademik } from '../models/schema';
import { db } from '../utils/db';

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
        tanggalKeluar: new Date(data.tanggalKeluar).toISOString().split('T')[0],
        alasanKeluar: data.alasanKeluar,
        noSk: data.noSk,
        tanggalSk: data.tanggalSk ? new Date(data.tanggalSk).toISOString().split('T')[0] : null,
        ipk: data.ipk ? String(data.ipk) : null,
        nomorIjazah: data.nomorIjazah,
      })
      .returning();

    // Side effect: update mahasiswa status
    await db.update(mahasiswa).set({ status: data.statusBaru }).where(eq(mahasiswa.id, data.mahasiswaId));

    return newKeluar;
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

    const conditions: any[] = [];
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

    // Delete record
    const [deleted] = await db.delete(mahasiswaKeluar).where(eq(mahasiswaKeluar.id, id)).returning();

    // Revert status to aktif
    await db.update(mahasiswa).set({ status: 'aktif' }).where(eq(mahasiswa.id, record.mahasiswaId));

    return deleted;
  }
}
