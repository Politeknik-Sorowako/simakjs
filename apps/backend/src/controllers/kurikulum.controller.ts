import { KurikulumService } from '../services/kurikulum.service';
import { AuthContext, PaginationQuery } from '../utils/types';

export interface KurikulumQuery extends PaginationQuery {
  prodiId?: string;
}

export class KurikulumController {
  static async getAll({ query }: AuthContext<any, KurikulumQuery>) {
    const page = query?.page ? parseInt(query.page) : 1;
    const limit = query?.limit ? parseInt(query.limit) : 10;
    const search = query?.search || '';
    const prodiId = query?.prodiId ? parseInt(query.prodiId) : undefined;
    return await KurikulumService.getAll(page, limit, search, prodiId);
  }

  static async getById({ params, set }: AuthContext) {
    const data = await KurikulumService.getById(parseInt(params.id));
    if (!data) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return data;
  }

  static async create({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const newKur = await KurikulumService.create(body);
    set.status = 201;
    return newKur;
  }

  static async update({ params, body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const updated = await KurikulumService.update(parseInt(params.id), body);
    if (!updated) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return updated;
  }

  static async delete({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const deleted = await KurikulumService.delete(parseInt(params.id));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'Kurikulum berhasil dihapus' };
  }

  static async addMataKuliah({ params, body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const newKmk = await KurikulumService.addMataKuliah(parseInt(params.id), body);
    set.status = 201;
    return newKmk;
  }

  static async removeMataKuliah({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const deleted = await KurikulumService.removeMataKuliah(parseInt(params.id), parseInt(params.mkId));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'Mata Kuliah berhasil dihapus dari Kurikulum' };
  }
}
