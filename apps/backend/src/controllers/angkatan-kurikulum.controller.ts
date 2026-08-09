import { AngkatanKurikulumService } from '../services/angkatan-kurikulum.service';
import { hasRole } from '../utils/role';
import { AuthContext } from '../utils/types';

export interface AngkatanKurikulumQuery {
  programStudiId?: number;
}

export class AngkatanKurikulumController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll({ query }: AuthContext<any, AngkatanKurikulumQuery>): Promise<any> {
    const prodiId = query?.programStudiId ? Number(query.programStudiId) : undefined;
    return await AngkatanKurikulumService.getAll(prodiId);
  }

  static async getAktif({
    query,
    set,
    // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  }: AuthContext<any, { programStudiId?: number; angkatan?: string }>): Promise<any> {
    if (!query?.programStudiId || !query?.angkatan) {
      set.status = 400;
      return { error: 'Parameter programStudiId dan angkatan diperlukan' };
    }
    const data = await AngkatanKurikulumService.getAktif(Number(query.programStudiId), query.angkatan);
    if (!data) {
      set.status = 404;
      return { error: 'Tidak ada kurikulum aktif untuk angkatan ini' };
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
    const newBinding = await AngkatanKurikulumService.create(body);
    set.status = 201;
    return newBinding;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async update({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const updated = await AngkatanKurikulumService.update(parseInt(params.id), body);
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
    const deleted = await AngkatanKurikulumService.delete(parseInt(params.id));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'Binding Angkatan Kurikulum berhasil dihapus' };
  }
}
