import { ProfilLulusanService } from '../services/profil-lulusan.service';
import { isAdminOrProdi } from '../utils/role';
import { AuthContext } from '../utils/types';

export class ProfilLulusanController {
  static async getAll({ query, getCurrentUser }: AuthContext) {
    await getCurrentUser();
    const prodiId = query.prodiId ? parseInt(query.prodiId) : undefined;
    return await ProfilLulusanService.getAll(prodiId);
  }

  static async getById({ params, getCurrentUser }: AuthContext) {
    await getCurrentUser();
    const data = await ProfilLulusanService.getById(parseInt(params.id));
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
    const newData = await ProfilLulusanService.create(body);
    set.status = 201;
    return newData;
  }

  static async update({ params, body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!isAdminOrProdi(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const updated = await ProfilLulusanService.update(parseInt(params.id), body);
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
    const deleted = await ProfilLulusanService.delete(parseInt(params.id));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'Profil Lulusan berhasil dihapus' };
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
      return { error: 'Program studi dan data harus diisi' };
    }
    const result = await ProfilLulusanService.import(programStudiId, items);
    set.status = 200;
    return result;
  }

  static async getTemplate({ set }: AuthContext) {
    set.headers['content-type'] = 'text/csv; charset=utf-8';
    set.headers['content-disposition'] = 'attachment; filename=template-profil-lulusan.csv';
    return ProfilLulusanService.getTemplateCsv();
  }
}
