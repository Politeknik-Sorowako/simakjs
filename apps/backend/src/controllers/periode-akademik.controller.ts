import { PeriodeAkademikService } from '../services/periode-akademik.service';
import { hasRole } from '../utils/role';
import { AuthContext, PaginationQuery } from '../utils/types';

export class PeriodeAkademikController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll({ query }: AuthContext): Promise<any> {
    const q = query as PaginationQuery & { sortBy?: string; sortOrder?: string };
    const page = q?.page ? parseInt(String(q.page)) : 1;
    const limit = q?.limit ? parseInt(String(q.limit)) : 10;
    const search = q?.search || '';
    const sortBy = q?.sortBy || 'id';
    const sortOrder: 'asc' | 'desc' = q?.sortOrder === 'desc' ? 'desc' : 'asc';
    return await PeriodeAkademikService.getAll(page, limit, search, sortBy, sortOrder);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getById({ params, set }: AuthContext): Promise<any> {
    const data = await PeriodeAkademikService.getById(params.id);
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
    const newPeriode = await PeriodeAkademikService.create(body);
    set.status = 201;
    return newPeriode;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async update({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const updated = await PeriodeAkademikService.update(params.id, body);
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
    const deleted = await PeriodeAkademikService.delete(params.id);
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'Periode Akademik berhasil dihapus' };
  }
}
