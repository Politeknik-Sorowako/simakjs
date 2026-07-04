import { MahasiswaService } from '../services/mahasiswa.service';
import { CsvImportService } from '../services/csv-import.service';
import { AuthContext, PaginationQuery } from '../utils/types';
import { db } from '../utils/db';
import { mahasiswa, dosen } from '../models/schema';
import { eq } from 'drizzle-orm';

export class MahasiswaController {
  private static async getMahasiswaIdByEmail(email: string): Promise<number | null> {
    const [mhs] = await db
      .select({ id: mahasiswa.id })
      .from(mahasiswa)
      .where(eq(mahasiswa.email, email));
    return mhs ? mhs.id : null;
  }

  static async getAll({ query, set, getCurrentUser }: AuthContext<any, PaginationQuery & { programStudiId?: string }>) {
    const user = await getCurrentUser();
    if (!user || user.role === 'guest') {
      set.status = 403;
      return { error: 'Akses ditolak. Guest tidak diizinkan mengakses data mahasiswa.' };
    }
    const page = query?.page ? parseInt(query.page) : 1;
    const limit = query?.limit ? parseInt(query.limit) : 10;
    const search = query?.search || '';
    const programStudiId = query?.programStudiId ? parseInt(query.programStudiId) : undefined;

    if (user.role === 'mahasiswa') {
      const myMhsId = await MahasiswaController.getMahasiswaIdByEmail(user.email);
      if (!myMhsId) {
        return {
          data: [],
          meta: { total: 0, page, limit, totalPages: 0 }
        };
      }
      const mhs = await MahasiswaService.getById(myMhsId);
      return {
        data: mhs ? [mhs] : [],
        meta: { total: mhs ? 1 : 0, page: 1, limit, totalPages: mhs ? 1 : 0 }
      };
    }

    if (user.role === 'dosen') {
      const [dsn] = await db
        .select({ id: dosen.id })
        .from(dosen)
        .where(eq(dosen.email, user.email));
      if (!dsn) {
        return {
          data: [],
          meta: { total: 0, page, limit, totalPages: 0 }
        };
      }
      return await MahasiswaService.getAll(page, limit, search, dsn.id, programStudiId);
    }

    return await MahasiswaService.getAll(page, limit, search, undefined, programStudiId);
  }

  static async getById({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role === 'guest') {
      set.status = 403;
      return { error: 'Akses ditolak. Guest tidak diizinkan mengakses data mahasiswa.' };
    }
    const targetId = parseInt(params.id);
    if (user.role === 'mahasiswa') {
      const myMhsId = await MahasiswaController.getMahasiswaIdByEmail(user.email);
      if (!myMhsId || myMhsId !== targetId) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
    }
    const mhs = await MahasiswaService.getById(targetId);
    if (!mhs) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }

    if (user.role === 'dosen') {
      const [dsn] = await db
        .select({ id: dosen.id })
        .from(dosen)
        .where(eq(dosen.email, user.email));
      if (!dsn || mhs.dosenPaId !== dsn.id) {
        set.status = 403;
        return { error: 'Akses ditolak. Anda hanya diizinkan mengakses data mahasiswa bimbingan Anda.' };
      }
    }

    return mhs;
  }

  static async create({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'prodi')) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin dan Kaprodi yang dapat menambahkan data mahasiswa baru.' };
    }
    const newMhs = await MahasiswaService.create(body);
    set.status = 201;
    return newMhs;
  }

  static async update({ params, body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'prodi' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const targetId = parseInt(params.id);
    const mhs = await MahasiswaService.getById(targetId);
    if (!mhs) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }

    if (user.role === 'dosen') {
      const [dsn] = await db
        .select({ id: dosen.id })
        .from(dosen)
        .where(eq(dosen.email, user.email));
      if (!dsn || mhs.dosenPaId !== dsn.id) {
        set.status = 403;
        return { error: 'Akses ditolak. Anda hanya dapat mengubah data mahasiswa bimbingan Anda.' };
      }
      if (body.dosenPaId !== undefined && body.dosenPaId !== mhs.dosenPaId) {
        set.status = 403;
        return { error: 'Akses ditolak. Anda tidak diizinkan mengubah Dosen Wali/PA.' };
      }
    }

    const updated = await MahasiswaService.update(targetId, body);
    return updated;
  }

  static async delete({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'prodi')) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin dan Kaprodi yang dapat menghapus data mahasiswa.' };
    }
    const deleted = await MahasiswaService.delete(parseInt(params.id));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'Mahasiswa berhasil dihapus' };
  }

  static async importCsv({ request, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mode = (formData.get('mode') as string) || 'skip';
    if (!file) {
      set.status = 400;
      return { error: 'File CSV tidak ditemukan.' };
    }

    const text = await file.text();
    const result = await CsvImportService.importMahasiswa(text, mode);
    return result;
  }

  static async importPaCsv({ request, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'prodi')) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin dan Kaprodi.' };
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      set.status = 400;
      return { error: 'File CSV tidak ditemukan.' };
    }

    const text = await file.text();
    const result = await CsvImportService.importDosenPaMapping(text);
    return result;
  }
}
