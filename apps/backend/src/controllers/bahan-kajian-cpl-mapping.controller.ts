import { BahanKajianCplMappingService } from '../services/bahan-kajian-cpl-mapping.service';
import { AuthContext } from '../utils/types';

export class BahanKajianCplMappingController {
  static async getAll({ query, getCurrentUser }: AuthContext) {
    await getCurrentUser();
    const bahanKajianId = query.bahanKajianId ? parseInt(query.bahanKajianId) : undefined;
    const cplId = query.cplId ? parseInt(query.cplId) : undefined;
    const prodiId = query.prodiId ? parseInt(query.prodiId) : undefined;
    return await BahanKajianCplMappingService.getAll(bahanKajianId, cplId, prodiId);
  }

  static async create({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'prodi')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const newData = await BahanKajianCplMappingService.create(body);
    set.status = 201;
    return newData;
  }

  static async delete({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'prodi')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const deleted = await BahanKajianCplMappingService.delete(parseInt(params.id));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'Mapping berhasil dihapus' };
  }

  static async getMatriks({ query, getCurrentUser }: AuthContext) {
    await getCurrentUser();
    const prodiId = parseInt(query.prodiId);
    if (!prodiId) {
      return { error: 'prodiId diperlukan' };
    }
    return await BahanKajianCplMappingService.getMatriks(prodiId);
  }
}
