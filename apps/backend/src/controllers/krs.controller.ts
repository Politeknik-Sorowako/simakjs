import { KrsService } from '../services/krs.service';
import { AuthContext, PaginationQuery } from '../utils/types';
import { db } from '../utils/db';
import { mahasiswa } from '../models/schema';
import { eq } from 'drizzle-orm';
import { CsvImportService } from '../services/csv-import.service';

export class KrsController {
  private static async getMahasiswaIdByEmail(email: string): Promise<number | null> {
    const [mhs] = await db
      .select({ id: mahasiswa.id })
      .from(mahasiswa)
      .where(eq(mahasiswa.email, email));
    return mhs ? mhs.id : null;
  }

  static async getAll({ query, set, getCurrentUser }: AuthContext<any, PaginationQuery>) {
    const user = await getCurrentUser();
    if (!user || user.role === 'guest') {
      set.status = 403;
      return { error: 'Akses ditolak. Guest tidak diizinkan mengakses data KRS.' };
    }
    const page = query?.page ? parseInt(query.page) : 1;
    const limit = query?.limit ? parseInt(query.limit) : 10;
    const search = query?.search || '';

    let filterMhsId: number | undefined = undefined;
    if (user.role === 'mahasiswa') {
      const myMhsId = await KrsController.getMahasiswaIdByEmail(user.email);
      if (!myMhsId) {
        return {
          data: [],
          meta: { total: 0, page, limit, totalPages: 0 }
        };
      }
      filterMhsId = myMhsId;
    }

    return await KrsService.getAll(page, limit, search, filterMhsId);
  }

  static async getById({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role === 'guest') {
      set.status = 403;
      return { error: 'Akses ditolak. Guest tidak diizinkan mengakses data KRS.' };
    }
    const data = await KrsService.getById(parseInt(params.id));
    if (!data) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    if (user.role === 'mahasiswa') {
      const myMhsId = await KrsController.getMahasiswaIdByEmail(user.email);
      if (!myMhsId || myMhsId !== data.mahasiswaId) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
    }
    return data;
  }

  static async create({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 403;
      return { error: 'Akses ditolak. Silakan login.' };
    }
    if (user.role === 'mahasiswa') {
      const myMhsId = await KrsController.getMahasiswaIdByEmail(user.email);
      if (!myMhsId || myMhsId !== body.mahasiswaId) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
    }
    try {
      const newKrs = await KrsService.create(body);
      set.status = 201;
      return newKrs;
    } catch (e: any) {
      set.status = 400;
      return { error: e.message || 'Gagal membuat KRS' };
    }
  }

  static async approve({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'dosen' && user.role !== 'admin' && user.role !== 'prodi')) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Dosen Pembimbing Akademik, Prodi, atau Admin yang dapat menyetujui KRS.' };
    }
    try {
      const updated = await KrsService.approveKrs(body.mahasiswaId, body.periodeId, user.email);
      return { message: 'KRS berhasil disetujui', count: updated.length, data: updated };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message || 'Gagal menyetujui KRS' };
    }
  }

  static async update({ params, body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 403;
      return { error: 'Akses ditolak. Silakan login.' };
    }
    if (user.role !== 'admin' && user.role !== 'dosen' && user.role !== 'prodi') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin, Dosen, atau Prodi yang dapat mengubah KRS.' };
    }
    const updated = await KrsService.update(parseInt(params.id), body);
    if (!updated) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return updated;
  }

  static async delete({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 403;
      return { error: 'Akses ditolak. Silakan login.' };
    }
    const deleted = await KrsService.delete(parseInt(params.id));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'KRS berhasil dihapus' };
  }

  static async getPendingStudents({ query, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'dosen' && user.role !== 'admin' && user.role !== 'prodi')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const periodeId = query?.periodeId;
    if (!periodeId) {
      set.status = 400;
      return { error: 'periodeId wajib disertakan.' };
    }
    try {
      return await KrsService.getPendingStudents(periodeId);
    } catch (e: any) {
      set.status = 400;
      return { error: e.message || 'Gagal mengambil mahasiswa pending' };
    }
  }

  static async approveBatch({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'dosen' && user.role !== 'admin' && user.role !== 'prodi')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const updated = await KrsService.approveBatchKrs(body.mahasiswaIds, body.periodeId, user.email);
      return { message: 'KRS mahasiswa terpilih berhasil disetujui', count: updated.length, data: updated };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message || 'Gagal menyetujui KRS secara massal' };
    }
  }

  static async importCsv({ request, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      set.status = 400;
      return { error: 'File CSV tidak ditemukan.' };
    }

    const text = await file.text();
    const result = await CsvImportService.importKrs(text);
    return result;
  }
}
