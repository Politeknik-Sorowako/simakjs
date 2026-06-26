import { BapService } from '../services/bap.service';
import { AuthContext } from '../utils/types';

export class BapController {
  static async getByKelas({ params }: AuthContext) {
    return await BapService.getByKelas(parseInt(params.kelasKuliahId));
  }

  static async create({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const newBap = await BapService.create(body);
    set.status = 201;
    return newBap;
  }
}
