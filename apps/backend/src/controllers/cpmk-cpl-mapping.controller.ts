import { CpmkCplMappingService } from '../services/cpmk-cpl-mapping.service';
import { isAdminOrProdi, isAdminOrProdiOrDosen } from '../utils/role';
import { AuthContext } from '../utils/types';

export class CpmkCplMappingController {
  static async getAll({ query, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const cpmkId = query.cpmkId ? parseInt(query.cpmkId) : undefined;
    const cplId = query.cplId ? parseInt(query.cplId) : undefined;
    return await CpmkCplMappingService.getAll(cpmkId, cplId);
  }

  static async create({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!isAdminOrProdiOrDosen(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const newData = await CpmkCplMappingService.create(body);
    set.status = 201;
    return newData;
  }

  static async delete({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!isAdminOrProdi(user)) {
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

  static async getMatriks({ query, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const kurikulumId = parseInt(query.kurikulumId);
    if (!kurikulumId) {
      return { error: 'kurikulumId diperlukan' };
    }
    return await CpmkCplMappingService.getMatriks(kurikulumId);
  }
}
