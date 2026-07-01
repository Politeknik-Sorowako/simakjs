import { DosenPengajarService } from '../services/dosen-pengajar.service';
import { AuthContext } from '../utils/types';

export class DosenPengajarController {
  static async getAll({ query }: AuthContext<any, any>) {
    const page = query?.page ? parseInt(query.page) : 1;
    const limit = query?.limit ? parseInt(query.limit) : 10;
    const kelasKuliahId = query?.kelasKuliahId ? parseInt(query.kelasKuliahId) : undefined;
    return await DosenPengajarService.getAll(page, limit, kelasKuliahId);
  }

  static async create({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen' && user.role !== 'prodi')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const newPlotting = await DosenPengajarService.create(body);
      set.status = 201;
      return newPlotting;
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async delete({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen' && user.role !== 'prodi')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const deleted = await DosenPengajarService.delete(parseInt(params.id));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'Plotting dosen berhasil dihapus' };
  }
}
