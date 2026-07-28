import { BahanKajianCplMappingService } from '../services/bahan-kajian-cpl-mapping.service';
import { isAdminOrProdi } from '../utils/role';
import { AuthContext } from '../utils/types';

export class BahanKajianCplMappingController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll({ query, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const bahanKajianId = query.bahanKajianId ? parseInt(query.bahanKajianId) : undefined;
    const cplId = query.cplId ? parseInt(query.cplId) : undefined;
    const prodiId = query.prodiId ? parseInt(query.prodiId) : undefined;
    return await BahanKajianCplMappingService.getAll(bahanKajianId, cplId, prodiId);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async create({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!isAdminOrProdi(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const newData = await BahanKajianCplMappingService.create(body);
    set.status = 201;
    return newData;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async delete({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!isAdminOrProdi(user)) {
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

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getMatriks({ query, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const prodiId = parseInt(query.prodiId);
    if (!prodiId) {
      return { error: 'prodiId diperlukan' };
    }
    return await BahanKajianCplMappingService.getMatriks(prodiId);
  }
}
