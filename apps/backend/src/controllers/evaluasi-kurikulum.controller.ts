import { EvaluasiKurikulumService } from '../services/evaluasi-kurikulum.service';
import { isAdminOrProdi } from '../utils/role';
import { AuthContext } from '../utils/types';

export class EvaluasiKurikulumController {
  static async getAll({ query, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const page = query.page ? parseInt(query.page) : 1;
    const limit = query.limit ? parseInt(query.limit) : 10;
    const kurikulumId = query.kurikulumId ? parseInt(query.kurikulumId) : undefined;
    const periodeId = query.periodeId || undefined;
    const status = query.status || undefined;
    return await EvaluasiKurikulumService.getAll(page, limit, kurikulumId, periodeId, status);
  }

  static async getById({ params, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const id = parseInt(params.id);
    const data = await EvaluasiKurikulumService.getById(id);
    if (!data) {
      return { error: 'Data tidak ditemukan' };
    }
    return data;
  }

  static async create({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !isAdminOrProdi(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const newData = await EvaluasiKurikulumService.create({
      ...body,
      createdBy: user.id,
    });
    set.status = 201;
    return newData;
  }

  static async update({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !isAdminOrProdi(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const updated = await EvaluasiKurikulumService.update(parseInt(params.id), body);
    if (!updated) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return updated;
  }

  static async delete({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !isAdminOrProdi(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const deleted = await EvaluasiKurikulumService.delete(parseInt(params.id));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'Evaluasi berhasil dihapus' };
  }
}
