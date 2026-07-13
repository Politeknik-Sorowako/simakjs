import { CpmkCplMappingService } from '../services/cpmk-cpl-mapping.service';
import { AuthContext } from '../utils/types';

export class CpmkCplMappingController {
  static async getAll({ query, getCurrentUser }: AuthContext) {
    await getCurrentUser();
    const cpmkId = query.cpmkId ? parseInt(query.cpmkId) : undefined;
    const cplId = query.cplId ? parseInt(query.cplId) : undefined;
    return await CpmkCplMappingService.getAll(cpmkId, cplId);
  }

  static async create({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen' && user.role !== 'prodi')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const newData = await CpmkCplMappingService.create(body);
    set.status = 201;
    return newData;
  }

  static async delete({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'prodi')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const deleted = await CpmkCplMappingService.delete(parseInt(params.id));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'Mapping berhasil dihapus' };
  }

  static async getMatriks({ query, getCurrentUser }: AuthContext) {
    await getCurrentUser();
    const kurikulumId = parseInt(query.kurikulumId);
    if (!kurikulumId) {
      return { error: 'kurikulumId diperlukan' };
    }
    return await CpmkCplMappingService.getMatriks(kurikulumId);
  }
}
