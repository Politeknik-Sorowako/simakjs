import { CplMataKuliahService } from '../services/cpl-mata-kuliah.service';
import { isAdminOrProdi } from '../utils/role';
import { AuthContext } from '../utils/types';

export class CplMataKuliahController {
  static async getAll({ query, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const cplId = query.cplId ? parseInt(query.cplId) : undefined;
    const mataKuliahId = query.mataKuliahId ? parseInt(query.mataKuliahId) : undefined;
    const kurikulumId = query.kurikulumId ? parseInt(query.kurikulumId) : undefined;
    return await CplMataKuliahService.getAll(cplId, mataKuliahId, kurikulumId);
  }

  static async create({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !isAdminOrProdi(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const newData = await CplMataKuliahService.create(body);
    set.status = 201;
    return newData;
  }

  static async update({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !isAdminOrProdi(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const updated = await CplMataKuliahService.update(parseInt(params.id), body);
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
    const deleted = await CplMataKuliahService.delete(parseInt(params.id));
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
    return await CplMataKuliahService.getMatriks(kurikulumId);
  }

  static async validateBobot({ query, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const cplId = parseInt(query.cplId);
    if (!cplId) {
      return { error: 'cplId diperlukan' };
    }
    return await CplMataKuliahService.validateTotalBobotPerCpl(cplId);
  }
}
