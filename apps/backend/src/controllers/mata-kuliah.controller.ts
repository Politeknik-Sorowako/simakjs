import { MataKuliahService } from '../services/mata-kuliah.service';
import { hasRole } from '../utils/role';
import { AuthContext, PaginationQuery } from '../utils/types';

export class MataKuliahController {
  static async getAll({
    query,
    set,
  }: AuthContext<
    // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
    any,
    PaginationQuery & {
      programStudiId?: number;
      kurikulumId?: number;
      semester?: number;
      sortBy?: string;
      sortOrder?: string;
    }
    // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  >): Promise<any> {
    try {
      const page = query?.page ? parseInt(String(query.page)) : 1;
      const limit = query?.limit ? parseInt(String(query.limit)) : 10;
      const search = query?.search || '';
      const programStudiId = query?.programStudiId ? Number(query.programStudiId) : undefined;
      const kurikulumId = query?.kurikulumId ? Number(query.kurikulumId) : undefined;
      const semester = query?.semester !== undefined ? Number(query.semester) : undefined;
      const sortBy = query?.sortBy || 'nama';
      const sortOrder = (query?.sortOrder as 'asc' | 'desc') || 'asc';
      return await MataKuliahService.getAll(
        page,
        limit,
        search,
        programStudiId,
        kurikulumId,
        semester,
        sortBy,
        sortOrder,
      );
    } catch (e: unknown) {
      set.status = 500;
      return { error: e instanceof Error ? e.message : 'Gagal mengambil data mata kuliah' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getById({ params, set }: AuthContext): Promise<any> {
    const data = await MataKuliahService.getById(parseInt(params.id));
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
    const newMk = await MataKuliahService.create(body);
    set.status = 201;
    return newMk;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async update({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const updated = await MataKuliahService.update(parseInt(params.id), body);
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
    const deleted = await MataKuliahService.delete(parseInt(params.id));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'Mata Kuliah berhasil dihapus' };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async import({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    // biome-ignore lint/suspicious/noExplicitAny: Elysia body type inference requires cast for destructuring
    const { items } = body as { items: any[] };
    if (!items || !Array.isArray(items) || items.length === 0) {
      set.status = 400;
      return { error: 'Data harus diisi' };
    }
    const result = await MataKuliahService.import(items);
    set.status = 200;
    return result;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getTemplate({ set, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    set.headers['content-type'] = 'text/csv; charset=utf-8';
    set.headers['content-disposition'] = 'attachment; filename=template-mata-kuliah.csv';
    return MataKuliahService.getTemplateCsv();
  }
}
