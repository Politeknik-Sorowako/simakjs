import { and, count, desc, eq, inArray, like, or, sql } from 'drizzle-orm';
import { mahasiswa, pengajuanCuti } from '../models/schema';
import { db } from '../utils/db';

export interface CreateCutiDto {
  mahasiswaId: number;
  periodeId: string;
  alasan: string;
}

export class CutiService {
  static hitungSemesterBerakhir(mulai: string): string {
    const tahun = parseInt(mulai.slice(0, 4));
    const semester = parseInt(mulai.slice(4));
    if (semester === 1) return `${tahun}2`;
    return `${tahun + 1}1`;
  }

  static async create(data: CreateCutiDto) {
    const existing = await db.query.pengajuanCuti.findFirst({
      where: and(eq(pengajuanCuti.mahasiswaId, data.mahasiswaId), eq(pengajuanCuti.periodeId, data.periodeId)),
    });

    if (existing) {
      throw new Error('Anda sudah mengajukan cuti pada periode akademik ini.');
    }

    const [newCuti] = await db
      .insert(pengajuanCuti)
      .values({
        mahasiswaId: data.mahasiswaId,
        periodeId: data.periodeId,
        alasan: data.alasan,
        status: 'pending',
      })
      .returning();

    return newCuti;
  }

  static async inputByAdmin(data: {
    mahasiswaId: number;
    periodeId: string;
    alasan: string;
    semesterMulaiCuti?: string;
    semesterBerakhirCuti?: string;
    noSuratIzin?: string;
    tanggalSuratIzin?: string;
  }) {
    const existing = await db.query.pengajuanCuti.findFirst({
      where: and(eq(pengajuanCuti.mahasiswaId, data.mahasiswaId), eq(pengajuanCuti.periodeId, data.periodeId)),
    });

    if (existing) {
      throw new Error('Mahasiswa sudah memiliki catatan cuti pada periode ini.');
    }

    const semesterMulai = data.semesterMulaiCuti || data.periodeId;
    const semesterBerakhir = data.semesterBerakhirCuti || CutiService.hitungSemesterBerakhir(semesterMulai);

    const [newCuti] = await db
      .insert(pengajuanCuti)
      .values({
        mahasiswaId: data.mahasiswaId,
        periodeId: data.periodeId,
        alasan: data.alasan,
        status: 'disetujui_prodi',
        semesterMulaiCuti: semesterMulai,
        semesterBerakhirCuti: semesterBerakhir,
        noSuratIzin: data.noSuratIzin,
        tanggalSuratIzin: data.tanggalSuratIzin ? new Date(data.tanggalSuratIzin).toISOString().split('T')[0] : null,
      })
      .returning();

    await db.update(mahasiswa).set({ status: 'cuti' }).where(eq(mahasiswa.id, data.mahasiswaId));

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

    const data = await db.query.pengajuanCuti.findMany({
      where: (table, { eq, and: andFn }) => {
        const conds = [];
        if (params.periodeId) conds.push(eq(table.periodeId, params.periodeId));
        if (params.status) conds.push(eq(table.status, params.status));
        if (params.mahasiswaId) conds.push(eq(table.mahasiswaId, params.mahasiswaId));
        return conds.length > 0 ? andFn(...conds) : undefined;
      },
      limit,
      offset,
      orderBy: [desc(pengajuanCuti.createdAt)],
      with: {
        mahasiswa: {
          with: {
            programStudi: true,
            dosenPa: true,
          },
        },
        periodeAkademik: true,
      },
    });

    let filteredData = data;
    if (params.dosenPaId) {
      filteredData = data.filter((d) => d.mahasiswa?.dosenPaId === params.dosenPaId);
    }

    const total = filteredData.length;
    const totalPages = Math.ceil(total / limit);

    return {
      data: filteredData,
      meta: { total, page, limit, totalPages },
    };
  }

  static async getMahasiswaCuti(params: { page?: number; limit?: number; search?: string; periodeId?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    const conditions = [eq(mahasiswa.status, 'cuti')];

    if (params.search) {
      conditions.push(or(like(mahasiswa.nama, `%${params.search}%`), like(mahasiswa.nim, `%${params.search}%`)));
    }

    const mahasiswaData = await db.query.mahasiswa.findMany({
      where: and(...conditions),
      limit,
      offset,
      orderBy: [desc(mahasiswa.updatedAt)],
      with: {
        programStudi: true,
        dosenPa: true,
        pengajuanCuti: {
          where: (table, { eq: eqFn }) => (params.periodeId ? eqFn(table.periodeId, params.periodeId) : undefined),
          with: {
            periodeAkademik: true,
          },
          orderBy: [desc(pengajuanCuti.createdAt)],
          limit: 1,
        },
      },
    });

    const [{ count: total }] = await db
      .select({ count: count() })
      .from(mahasiswa)
      .where(and(...conditions));

    const totalPages = Math.ceil(total / limit);

    return {
      data: mahasiswaData,
      meta: { total, page, limit, totalPages },
    };
  }

  static async getById(id: number) {
    return (
      (await db.query.pengajuanCuti.findFirst({
        where: eq(pengajuanCuti.id, id),
        with: {
          mahasiswa: {
            with: {
              programStudi: true,
              dosenPa: true,
            },
          },
          periodeAkademik: true,
        },
      })) || null
    );
  }

  static async approve(
    id: number,
    role: string,
    userRefId: number | null,
    payload: {
      action: 'approve' | 'reject';
      catatan?: string;
      noSuratIzin?: string;
      tanggalSuratIzin?: string;
    },
  ) {
    const cuti = await this.getById(id);
    if (!cuti) {
      throw new Error('Pengajuan cuti tidak ditemukan.');
    }

    let nextStatus = cuti.status;

    if (payload.action === 'reject') {
      nextStatus = 'ditolak';
    } else {
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
        tanggalSuratIzin: payload.tanggalSuratIzin
          ? new Date(payload.tanggalSuratIzin).toISOString().split('T')[0]
          : cuti.tanggalSuratIzin,
        updatedAt: new Date(),
      })
      .where(eq(pengajuanCuti.id, id))
      .returning();

    if (nextStatus === 'disetujui_prodi') {
      await db.update(mahasiswa).set({ status: 'cuti' }).where(eq(mahasiswa.id, cuti.mahasiswaId));
    }

    return updated;
  }

  static async aktifKembali(id: number) {
    const cuti = await this.getById(id);
    if (!cuti) {
      throw new Error('Pengajuan cuti tidak ditemukan.');
    }

    if (cuti.status !== 'disetujui_prodi') {
      throw new Error('Hanya pengajuan cuti yang sudah disetujui final yang dapat diaktifkan kembali.');
    }

    const [updated] = await db
      .update(pengajuanCuti)
      .set({
        status: 'kembali_aktif',
        updatedAt: new Date(),
      })
      .where(eq(pengajuanCuti.id, id))
      .returning();

    await db.update(mahasiswa).set({ status: 'aktif' }).where(eq(mahasiswa.id, cuti.mahasiswaId));

    return updated;
  }

  static async delete(id: number, mahasiswaId?: number, isAdmin?: boolean) {
    const cuti = await this.getById(id);
    if (!cuti) {
      throw new Error('Pengajuan cuti tidak ditemukan.');
    }

    if (mahasiswaId && cuti.mahasiswaId !== mahasiswaId && !isAdmin) {
      throw new Error('Anda tidak memiliki akses untuk menghapus pengajuan ini.');
    }

    if (!isAdmin && cuti.status !== 'pending') {
      throw new Error('Hanya pengajuan berstatus PENDING yang dapat dihapus.');
    }

    if (cuti.status === 'disetujui_prodi') {
      await db.update(mahasiswa).set({ status: 'aktif' }).where(eq(mahasiswa.id, cuti.mahasiswaId));
    }

    const [deleted] = await db.delete(pengajuanCuti).where(eq(pengajuanCuti.id, id)).returning();

    return deleted;
  }
}
