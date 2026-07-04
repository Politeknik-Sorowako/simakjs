import { CutiService } from '../services/cuti.service';
import { AuthContext } from '../utils/types';
import { db } from '../utils/db';
import { mahasiswa, dosen } from '../models/schema';
import { eq } from 'drizzle-orm';

export class CutiController {
  private static async getMahasiswaIdByEmail(email: string): Promise<number | null> {
    const [mhs] = await db
      .select({ id: mahasiswa.id })
      .from(mahasiswa)
      .where(eq(mahasiswa.email, email));
    return mhs ? mhs.id : null;
  }

  private static async getDosenIdByEmail(email: string): Promise<number | null> {
    const [dsn] = await db
      .select({ id: dosen.id })
      .from(dosen)
      .where(eq(dosen.email, email));
    return dsn ? dsn.id : null;
  }

  static async create({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'mahasiswa') {
      set.status = 403;
      return { error: 'Hanya mahasiswa yang dapat mengajukan cuti.' };
    }

    const mahasiswaId = await CutiController.getMahasiswaIdByEmail(user.email);
    if (!mahasiswaId) {
      set.status = 404;
      return { error: 'Profil mahasiswa tidak ditemukan.' };
    }

    try {
      const data = await CutiService.create({
        mahasiswaId,
        periodeId: body.periodeId,
        alasan: body.alasan
      });
      set.status = 201;
      return data;
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async getAll({ query, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role === 'guest') {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    let filterMhsId: number | undefined = undefined;
    let filterDsnId: number | undefined = undefined;

    if (user.role === 'mahasiswa') {
      const myMhsId = await CutiController.getMahasiswaIdByEmail(user.email);
      if (!myMhsId) {
        return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
      }
      filterMhsId = myMhsId;
    } else if (user.role === 'dosen') {
      const myDsnId = await CutiController.getDosenIdByEmail(user.email);
      if (!myDsnId) {
        return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
      }
      filterDsnId = myDsnId;
    }

    const page = query?.page ? parseInt(query.page) : 1;
    const limit = query?.limit ? parseInt(query.limit) : 10;
    const status = query?.status;
    const periodeId = query?.periodeId;

    return await CutiService.getAll({
      page,
      limit,
      periodeId,
      status,
      mahasiswaId: filterMhsId,
      dosenPaId: filterDsnId
    });
  }

  static async getById({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role === 'guest') {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    const data = await CutiService.getById(parseInt(params.id));
    if (!data) {
      set.status = 404;
      return { error: 'Data tidak ditemukan.' };
    }

    if (user.role === 'mahasiswa') {
      const myMhsId = await CutiController.getMahasiswaIdByEmail(user.email);
      if (myMhsId !== data.mahasiswaId) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
    } else if (user.role === 'dosen') {
      const myDsnId = await CutiController.getDosenIdByEmail(user.email);
      if (myDsnId !== data.mahasiswa?.dosenPaId) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
    }

    return data;
  }

  static async approve({ params, body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || ['mahasiswa', 'guest'].includes(user.role)) {
      set.status = 403;
      return { error: 'Akses ditolak. Anda tidak memiliki wewenang untuk memberikan persetujuan.' };
    }

    let userRefId: number | null = null;
    if (user.role === 'dosen') {
      userRefId = await CutiController.getDosenIdByEmail(user.email);
      if (!userRefId) {
        set.status = 403;
        return { error: 'Profil dosen Anda tidak ditemukan.' };
      }
    }

    try {
      const data = await CutiService.approve(parseInt(params.id), user.role, userRefId, {
        action: body.action,
        catatan: body.catatan,
        noSuratIzin: body.noSuratIzin,
        tanggalSuratIzin: body.tanggalSuratIzin
      });
      return data;
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async delete({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    let filterMhsId: number | undefined = undefined;
    if (user.role === 'mahasiswa') {
      const myMhsId = await CutiController.getMahasiswaIdByEmail(user.email);
      if (!myMhsId) {
        set.status = 404;
        return { error: 'Profil mahasiswa tidak ditemukan.' };
      }
      filterMhsId = myMhsId;
    }

    try {
      const data = await CutiService.delete(parseInt(params.id), filterMhsId);
      return { message: 'Pengajuan cuti berhasil dihapus.', data };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }
}
