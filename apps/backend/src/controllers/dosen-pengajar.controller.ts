import { DosenPengajarService } from '../services/dosen-pengajar.service';
import { getDosenIdByEmail } from '../utils/dosen-scope';
import { hasRole } from '../utils/role';
import { AuthContext } from '../utils/types';

export class DosenPengajarController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll({ query, getCurrentUser }: AuthContext<any, any>): Promise<any> {
    const page = query?.page ? parseInt(query.page) : 1;
    const limit = query?.limit ? parseInt(query.limit) : 10;
    const kelasKuliahId = query?.kelasKuliahId ? parseInt(query.kelasKuliahId) : undefined;
    let dosenId = query?.dosenId ? parseInt(query.dosenId) : undefined;
    const periodeId = query?.periodeId || undefined;
    const currentOnly = query?.currentOnly === true || query?.currentOnly === 'true';

    if (getCurrentUser) {
      const user = await getCurrentUser();
      if (user && hasRole(user, ['dosen', 'instruktur'])) {
        const userDosenId = await getDosenIdByEmail(user.email);
        if (!userDosenId) {
          return {
            data: [],
            meta: {
              total: 0,
              page,
              limit,
              totalPages: 0,
            },
          };
        }
        dosenId = userDosenId;
      }
    }

    return await DosenPengajarService.getAll(page, limit, kelasKuliahId, dosenId, periodeId, currentOnly);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async create({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'dosen', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const newPlotting = await DosenPengajarService.create(body);
      set.status = 201;
      return newPlotting;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async delete({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'dosen', 'prodi'])) {
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
