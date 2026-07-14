import { CplService } from '../services/cpl.service';
import { isAdminOrProdi } from '../utils/role';
import { AuthContext } from '../utils/types';

export class CplController {
  static async getAll({ query, getCurrentUser }: AuthContext) {
    await getCurrentUser();
    const prodiId = query.prodiId ? parseInt(query.prodiId) : undefined;
    return await CplService.getAll(prodiId);
  }

  static async getById({ params, getCurrentUser }: AuthContext) {
    await getCurrentUser();
    const data = await CplService.getById(parseInt(params.id));
    if (!data) {
      return { error: 'Data tidak ditemukan' };
    }
    return data;
  }

  static async create({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!isAdminOrProdi(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const newData = await CplService.create(body);
    set.status = 201;
    return newData;
  }

  static async update({ params, body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!isAdminOrProdi(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const updated = await CplService.update(parseInt(params.id), body);
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
    const deleted = await CplService.delete(parseInt(params.id));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'CPL berhasil dihapus' };
  }

  static async import({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!isAdminOrProdi(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const { programStudiId, items } = body as { programStudiId: number; items: { kode: string; deskripsi: string }[] };
    if (!programStudiId || !items || !Array.isArray(items) || items.length === 0) {
      set.status = 400;
      return { error: 'Program studi dan data CPL harus diisi' };
    }
    const result = await CplService.import(programStudiId, items);
    set.status = 200;
    return result;
  }
}
