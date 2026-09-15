import { CsvImportService } from '../services/csv-import.service';
import { DosenService } from '../services/dosen.service';
import { hasRole } from '../utils/role';
import { AuthContext, PaginationQuery } from '../utils/types';

export class DosenController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    const q = query as PaginationQuery & { programStudiId?: number; sortBy?: string; sortOrder?: string };
    const user = await getCurrentUser();
    if (!user || hasRole(user, ['guest'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Guest tidak diizinkan mengakses data dosen.' };
    }
    const page = q?.page ? parseInt(String(q.page)) : 1;
    const limit = q?.limit ? parseInt(String(q.limit)) : 10;
    const search = q?.search || '';
    const programStudiId = q?.programStudiId ? parseInt(String(q.programStudiId)) : undefined;
    const sortBy = q?.sortBy || 'nama';
    const sortOrder: 'asc' | 'desc' = q?.sortOrder === 'desc' ? 'desc' : 'asc';
    return await DosenService.getAll(page, limit, search, programStudiId, sortBy, sortOrder);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getById({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || hasRole(user, ['guest'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Guest tidak diizinkan mengakses data dosen.' };
    }
    const data = await DosenService.getById(parseInt(String(params.id)));
    if (!data) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return data;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async create({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const newDosen = await DosenService.create(body);
    set.status = 201;
    return newDosen;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async update({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const updated = await DosenService.update(parseInt(params.id), body);
    if (!updated) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return updated;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async delete({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const deleted = await DosenService.delete(parseInt(params.id));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'Dosen berhasil dihapus' };
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
    const result = await CsvImportService.importDosen(text, mode);
    return result;
  }
}
