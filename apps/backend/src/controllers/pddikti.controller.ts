import { PddiktiService } from '../services/pddikti.service';
import { AuthContext } from '../utils/types';

export class PddiktiController {
  static async getStats({ getCurrentUser, set }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin atau Kaprodi/Dosen.' };
    }
    return await PddiktiService.getStats();
  }

  static async syncAll({ getCurrentUser, set }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin atau Kaprodi/Dosen.' };
    }
    return await PddiktiService.syncAll();
  }
}
