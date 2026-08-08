import { CapaianCpmkService } from '../services/capaian-cpmk.service';
import { hasRole } from '../utils/role';
import { AuthContext } from '../utils/types';

export class CapaianCpmkController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getByKelas({ params, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const kelasKuliahId = parseInt(params.kelasKuliahId);
    return await CapaianCpmkService.getByKelas(kelasKuliahId);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getByMahasiswa({ params, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const mahasiswaId = parseInt(params.mahasiswaId);
    return await CapaianCpmkService.getByMahasiswa(mahasiswaId);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async hitungPerKelas({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'dosen'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const kelasKuliahId = parseInt(params.kelasKuliahId);
    const results = await CapaianCpmkService.hitungPerKelas(kelasKuliahId);
    return { message: 'Capaian CPMK berhasil dihitung', count: results.length };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getRekapPerCpmk({ params, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const kelasKuliahId = parseInt(params.kelasKuliahId);
    return await CapaianCpmkService.getRekapPerCpmk(kelasKuliahId);
  }
}
