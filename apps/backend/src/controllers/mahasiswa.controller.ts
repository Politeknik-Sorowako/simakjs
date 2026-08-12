import { CsvImportService } from '../services/csv-import.service';
import { MahasiswaService } from '../services/mahasiswa.service';
import { hasRole } from '../utils/role';
import { AuthContext, PaginationQuery, parsePagination } from '../utils/types';

export class MahasiswaController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll({ query, set, getCurrentUser }: AuthContext<any, any>): Promise<any> {
    const user = await getCurrentUser();
    if (!user || hasRole(user, ['guest'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Guest tidak diizinkan mengakses data mahasiswa.' };
    }
    const { page, limit } = parsePagination(query);
    const search = query?.search || '';
    const programStudiId = query?.programStudiId ? Number(query.programStudiId) : undefined;

    if (hasRole(user, ['mahasiswa'])) {
      const myMhsId = await MahasiswaService.getMahasiswaIdByEmail(user.email);
      if (!myMhsId) {
        return {
          data: [],
          meta: { total: 0, page, limit, totalPages: 0 },
        };
      }
      const mhs = await MahasiswaService.getById(myMhsId);
      return {
        data: mhs ? [mhs] : [],
        meta: { total: mhs ? 1 : 0, page: 1, limit, totalPages: mhs ? 1 : 0 },
      };
    }

    const filters = {
      sortBy: query?.sortBy,
      sortOrder: query?.sortOrder,
      filterNim: query?.filterNim,
      filterNama: query?.filterNama,
      filterEmail: query?.filterEmail,
      filterStatus: query?.filterStatus,
      hasAccount:
        query?.hasAccount !== undefined && query?.hasAccount !== '' ? String(query.hasAccount) === 'true' : undefined,
    };

    const allStudents = query?.allStudents === true || query?.allStudents === 'true';

    if (hasRole(user, ['dosen']) && !allStudents) {
      const dsnId = await MahasiswaService.getDosenIdByEmail(user.email);
      if (!dsnId) {
        return {
          data: [],
          meta: { total: 0, page, limit, totalPages: 0 },
        };
      }
      return await MahasiswaService.getAll(page, limit, search, dsnId, programStudiId, filters);
    }

    return await MahasiswaService.getAll(page, limit, search, undefined, programStudiId, filters);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getById({ params, query, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || hasRole(user, ['guest'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Guest tidak diizinkan mengakses data mahasiswa.' };
    }
    const targetId = parseInt(params.id);
    if (hasRole(user, ['mahasiswa'])) {
      const myMhsId = await MahasiswaService.getMahasiswaIdByEmail(user.email);
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

    const allStudents = query?.allStudents === true || query?.allStudents === 'true';
    if (hasRole(user, ['dosen']) && !allStudents) {
      const dsnId = await MahasiswaService.getDosenIdByEmail(user.email);
      if (!dsnId || mhs.dosenPaId !== dsnId) {
        set.status = 403;
        return { error: 'Akses ditolak. Anda hanya diizinkan mengakses data mahasiswa bimbingan Anda.' };
      }
    }

    return mhs;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async create({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin dan Kaprodi yang dapat menambahkan data mahasiswa baru.' };
    }
    const newMhs = await MahasiswaService.create(body);
    set.status = 201;
    return newMhs;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async update({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'prodi', 'dosen'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const targetId = parseInt(params.id);
    const mhs = await MahasiswaService.getById(targetId);
    if (!mhs) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }

    if (hasRole(user, ['dosen'])) {
      const dsnId = await MahasiswaService.getDosenIdByEmail(user.email);
      if (!dsnId || mhs.dosenPaId !== dsnId) {
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

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async delete({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'prodi'])) {
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

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async importCsv({ request, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin'])) {
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

  static async getStats({
    query,
    set,
    getCurrentUser,
    // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  }: AuthContext<any, { angkatan?: string; programStudiId?: string }>): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const angkatan = query?.angkatan;
    const prodiId = query?.programStudiId ? parseInt(query.programStudiId) : undefined;
    return await MahasiswaService.getStats(angkatan, prodiId);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getMahasiswaBaru({ query, set, getCurrentUser }: AuthContext<any, { angkatan?: string }>): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    return await MahasiswaService.getMahasiswaBaru(query?.angkatan);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async importPaCsv({ request, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'prodi'])) {
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

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async bulkSetDosenPa({ body, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin dan Kaprodi yang dapat mengubah Dosen PA secara massal.' };
    }

    const { mahasiswaIds, dosenPaId } = body as { mahasiswaIds: number[]; dosenPaId: number | null };
    if (!Array.isArray(mahasiswaIds) || mahasiswaIds.length === 0) {
      set.status = 400;
      return { error: 'Daftar ID Mahasiswa tidak boleh kosong.' };
    }

    const result = await MahasiswaService.bulkSetDosenPa(mahasiswaIds, dosenPaId);
    return { message: `Berhasil menetapkan Dosen PA untuk ${result.updated} mahasiswa.`, data: result };
  }
}
