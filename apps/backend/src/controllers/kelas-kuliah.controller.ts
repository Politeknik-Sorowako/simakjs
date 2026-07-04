import { KelasKuliahService } from '../services/kelas-kuliah.service';
import { AuthContext, PaginationQuery } from '../utils/types';

export class KelasKuliahController {
  static async getAll({ query }: AuthContext<any, PaginationQuery & { programStudiId?: string; periodeId?: string }>) {
    const page = query?.page ? parseInt(query.page) : 1;
    const limit = query?.limit ? parseInt(query.limit) : 10;
    const search = query?.search || '';
    const programStudiId = query?.programStudiId ? parseInt(query.programStudiId) : undefined;
    const periodeId = query?.periodeId || undefined;
    return await KelasKuliahService.getAll(page, limit, search, programStudiId, periodeId);
  }

  static async getById({ params, set }: AuthContext) {
    const data = await KelasKuliahService.getById(parseInt(params.id));
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
    const newKelas = await KelasKuliahService.create(body);
    set.status = 201;
    return newKelas;
  }

  static async update({ params, body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const updated = await KelasKuliahService.update(parseInt(params.id), body);
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
    const deleted = await KelasKuliahService.delete(parseInt(params.id));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'Kelas Kuliah berhasil dihapus' };
  }
}
