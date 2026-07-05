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
