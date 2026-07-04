import { db } from '../utils/db';
import { pengajuanCuti, mahasiswa, periodeAkademik } from '../models/schema';
import { count, eq, and, desc } from 'drizzle-orm';

export interface CreateCutiDto {
  mahasiswaId: number;
  periodeId: string;
  alasan: string;
}

export class CutiService {
  static async create(data: CreateCutiDto) {
    // Check if duplicate for the same period
    const existing = await db.query.pengajuanCuti.findFirst({
      where: and(
        eq(pengajuanCuti.mahasiswaId, data.mahasiswaId),
        eq(pengajuanCuti.periodeId, data.periodeId)
      )
    });

    if (existing) {
      throw new Error('Anda sudah mengajukan cuti pada periode akademik ini.');
    }

    const [newCuti] = await db.insert(pengajuanCuti).values({
      mahasiswaId: data.mahasiswaId,
      periodeId: data.periodeId,
      alasan: data.alasan,
      status: 'pending'
    }).returning();

    return newCuti;
  }

  static async getAll(params: {
    page?: number;
    limit?: number;
    periodeId?: string;
    status?: string;
    mahasiswaId?: number;
    dosenPaId?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (params.periodeId) {
      conditions.push(eq(pengajuanCuti.periodeId, params.periodeId));
    }
    if (params.status) {
      conditions.push(eq(pengajuanCuti.status, params.status));
    }
    if (params.mahasiswaId) {
      conditions.push(eq(pengajuanCuti.mahasiswaId, params.mahasiswaId));
    }

    // Filter by Dosen PA
    if (params.dosenPaId) {
      // We need to join with mahasiswa table
      const subquery = await db
        .select({ id: mahasiswa.id })
        .from(mahasiswa)
        .where(eq(mahasiswa.dosenPaId, params.dosenPaId));
      
      const mhsIds = subquery.map(m => m.id);
      if (mhsIds.length === 0) {
        return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
      }
      // Dosen PA can only see cuti requests from their bimbingan
      // Using an inArray or manually filtering in memory. Let's filter by checking if mahasiswaId is in advisee list.
      // Drizzle support inArray: import { inArray } from 'drizzle-orm';
      // For simplicity:
      conditions.push(
        and(
          // Since we need to match many, let's query with a custom where.
        )
      );
    }

    let whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // We can also query using findMany
    const data = await db.query.pengajuanCuti.findMany({
      where: (table, { eq, and, inArray }) => {
        const conds = [];
        if (params.periodeId) conds.push(eq(table.periodeId, params.periodeId));
        if (params.status) conds.push(eq(table.status, params.status));
        if (params.mahasiswaId) conds.push(eq(table.mahasiswaId, params.mahasiswaId));
        
        // Return final conditions
        return conds.length > 0 ? and(...conds) : undefined;
      },
      limit,
      offset,
      orderBy: [desc(pengajuanCuti.createdAt)],
      with: {
        mahasiswa: {
          with: {
            programStudi: true,
            dosenPa: true
          }
        },
        periodeAkademik: true
      }
    });

    // If filter by dosenPaId is active, filter in memory
    let filteredData = data;
    if (params.dosenPaId) {
      filteredData = data.filter(d => d.mahasiswa?.dosenPaId === params.dosenPaId);
    }

    const total = filteredData.length; // Approximate for pagination in memory if filtered
    const totalPages = Math.ceil(total / limit);

    return {
      data: filteredData,
      meta: {
        total,
        page,
        limit,
        totalPages
      }
    };
  }

  static async getById(id: number) {
    return await db.query.pengajuanCuti.findFirst({
      where: eq(pengajuanCuti.id, id),
      with: {
        mahasiswa: {
          with: {
            programStudi: true,
            dosenPa: true
          }
        },
        periodeAkademik: true
      }
    }) || null;
  }

  static async approve(id: number, role: string, userRefId: number | null, payload: {
    action: 'approve' | 'reject';
    catatan?: string;
    noSuratIzin?: string;
    tanggalSuratIzin?: string;
  }) {
    const cuti = await this.getById(id);
    if (!cuti) {
      throw new Error('Pengajuan cuti tidak ditemukan.');
    }

    let nextStatus = cuti.status;

    if (payload.action === 'reject') {
      nextStatus = 'ditolak';
    } else {
      // Action is approve
      if (role === 'dosen') {
        if (cuti.status !== 'pending') {
          throw new Error('Hanya pengajuan berstatus PENDING yang dapat disetujui Dosen PA.');
        }
        nextStatus = 'disetujui_pa';
      } else if (role === 'keuangan') {
        if (cuti.status !== 'disetujui_pa') {
          throw new Error('Hanya pengajuan berstatus DISETUJUI DOSEN PA yang dapat diverifikasi Keuangan.');
        }
        nextStatus = 'disetujui_keuangan';
      } else if (role === 'admin' || role === 'prodi') {
        if (cuti.status !== 'disetujui_keuangan') {
          throw new Error('Hanya pengajuan berstatus DISETUJUI KEUANGAN yang dapat disetujui Prodi/Admin.');
        }
        if (!payload.noSuratIzin || !payload.tanggalSuratIzin) {
          throw new Error('Nomor surat dan tanggal surat izin cuti wajib diisi.');
        }
        nextStatus = 'disetujui_prodi';
      } else {
        throw new Error('Role Anda tidak memiliki akses untuk persetujuan ini.');
      }
    }

    const [updated] = await db
      .update(pengajuanCuti)
      .set({
        status: nextStatus,
        catatan: payload.catatan || cuti.catatan,
        noSuratIzin: payload.noSuratIzin || cuti.noSuratIzin,
        tanggalSuratIzin: payload.tanggalSuratIzin ? new Date(payload.tanggalSuratIzin).toISOString().split('T')[0] : cuti.tanggalSuratIzin,
        updatedAt: new Date()
      })
      .where(eq(pengajuanCuti.id, id))
      .returning();

    // Side effect: If final approval, update student status to cuti
    if (nextStatus === 'disetujui_prodi') {
      await db
        .update(mahasiswa)
        .set({ status: 'cuti' })
        .where(eq(mahasiswa.id, cuti.mahasiswaId));
    }

    return updated;
  }

  static async delete(id: number, mahasiswaId?: number) {
    const cuti = await this.getById(id);
    if (!cuti) {
      throw new Error('Pengajuan cuti tidak ditemukan.');
    }

    if (mahasiswaId && cuti.mahasiswaId !== mahasiswaId) {
      throw new Error('Anda tidak memiliki akses untuk menghapus pengajuan ini.');
    }

    if (cuti.status !== 'pending') {
      throw new Error('Hanya pengajuan berstatus PENDING yang dapat dihapus.');
    }

    const [deleted] = await db
      .delete(pengajuanCuti)
      .where(eq(pengajuanCuti.id, id))
      .returning();

    return deleted;
  }
}
