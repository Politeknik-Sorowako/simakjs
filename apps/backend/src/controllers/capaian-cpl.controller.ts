import { CapaianCplService } from '../services/capaian-cpl.service';
import { isAdminOrProdi } from '../utils/role';
import { AuthContext } from '../utils/types';

export class CapaianCplController {
  static async getByMahasiswa({ params, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const mahasiswaId = parseInt(params.mahasiswaId);
    return await CapaianCplService.getByMahasiswa(mahasiswaId);
  }

  static async getRekap({ query, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const kurikulumId = query.kurikulumId ? parseInt(query.kurikulumId) : undefined;
    const periodeId = query.periodeId || undefined;
    return await CapaianCplService.getRekap(kurikulumId, periodeId);
  }

  static async hitungBatch({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !isAdminOrProdi(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const kurikulumId = parseInt(body.kurikulumId);
    const periodeId = body.periodeId || undefined;
    const results = await CapaianCplService.hitungBatch(kurikulumId, periodeId);
    return { message: 'Capaian CPL berhasil dihitung', count: results.length };
  }
}
