import { CpmkService } from '../services/cpmk.service';
import { isAdminOrProdiOrDosen } from '../utils/role';
import { AuthContext } from '../utils/types';

export class CpmkController {
  static async getAll({ query }: AuthContext) {
    const page = query.page ? parseInt(query.page) : 1;
    const limit = query.limit ? parseInt(query.limit) : 10;
    const search = query.search || '';
    const kurikulumId = query.kurikulumId ? parseInt(query.kurikulumId) : undefined;
    const mataKuliahId = query.mataKuliahId ? parseInt(query.mataKuliahId) : undefined;
    return await CpmkService.getAll(page, limit, search, kurikulumId, mataKuliahId);
  }

  static async getByMataKuliah({ params }: AuthContext) {
    return await CpmkService.getByMataKuliah(parseInt(params.mataKuliahId));
  }

  static async getById({ params, set }: AuthContext) {
    const data = await CpmkService.getById(parseInt(params.id));
    if (!data) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return data;
  }

  static async create({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!isAdminOrProdiOrDosen(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const newCpmk = await CpmkService.create(body);
      set.status = 201;
      return newCpmk;
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async update({ params, body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!isAdminOrProdiOrDosen(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const updated = await CpmkService.update(parseInt(params.id), body);
      if (!updated) {
        set.status = 404;
        return { error: 'Data tidak ditemukan' };
      }
      return updated;
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async delete({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const deleted = await CpmkService.delete(parseInt(params.id));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'CPMK berhasil dihapus' };
  }
}
