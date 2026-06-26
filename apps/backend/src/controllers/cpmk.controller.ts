import { CpmkService } from '../services/cpmk.service';
import { AuthContext } from '../utils/types';

export class CpmkController {
  static async getByMataKuliah({ params }: AuthContext) {
    return await CpmkService.getByMataKuliah(parseInt(params.mataKuliahId));
  }

  static async create({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const newCpmk = await CpmkService.create(body);
    set.status = 201;
    return newCpmk;
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
