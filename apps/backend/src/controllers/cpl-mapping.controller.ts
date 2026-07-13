import { CplMappingService } from '../services/cpl-mapping.service';
import { isAdminOrProdi } from '../utils/role';
import { AuthContext } from '../utils/types';

export class CplMappingController {
  static async getAll({ query, getCurrentUser }: AuthContext) {
    await getCurrentUser();
    const prodiId = query.prodiId ? parseInt(query.prodiId) : undefined;
    const cplId = query.cplId ? parseInt(query.cplId) : undefined;
    const profilLulusanId = query.profilLulusanId ? parseInt(query.profilLulusanId) : undefined;
    return await CplMappingService.getAll(prodiId, cplId, profilLulusanId);
  }

  static async create({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!isAdminOrProdi(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const newData = await CplMappingService.create(body);
    set.status = 201;
    return newData;
  }

  static async delete({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!isAdminOrProdi(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const deleted = await CplMappingService.delete(parseInt(params.id));
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
    return await CplMappingService.getMatriks(prodiId);
  }
}
