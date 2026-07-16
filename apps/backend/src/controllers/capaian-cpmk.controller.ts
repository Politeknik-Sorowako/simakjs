import { CapaianCpmkService } from '../services/capaian-cpmk.service';
import { AuthContext } from '../utils/types';

export class CapaianCpmkController {
  static async getByKelas({ params, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const kelasKuliahId = parseInt(params.kelasKuliahId);
    return await CapaianCpmkService.getByKelas(kelasKuliahId);
  }

  static async getByMahasiswa({ params, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const mahasiswaId = parseInt(params.mahasiswaId);
    return await CapaianCpmkService.getByMahasiswa(mahasiswaId);
  }

  static async hitungPerKelas({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const kelasKuliahId = parseInt(params.kelasKuliahId);
    const results = await CapaianCpmkService.hitungPerKelas(kelasKuliahId);
    return { message: 'Capaian CPMK berhasil dihitung', count: results.length };
  }

  static async getRekapPerCpmk({ params, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const kelasKuliahId = parseInt(params.kelasKuliahId);
    return await CapaianCpmkService.getRekapPerCpmk(kelasKuliahId);
  }
}
