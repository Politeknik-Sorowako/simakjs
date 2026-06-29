import { BapService } from '../services/bap.service';
import { AuthContext } from '../utils/types';
import { db } from '../utils/db';
import { dosen } from '../models/schema';
import { eq } from 'drizzle-orm';

export class BapController {
  static async getByKelas({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Akses ditolak. Silakan login.' };
    }
    return await BapService.getByKelas(parseInt(params.kelasKuliahId));
  }

  static async getRpsTopik({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Akses ditolak. Silakan login.' };
    }
    return await BapService.getRpsTopikByKelas(parseInt(params.kelasKuliahId));
  }

  static async create({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    let dosenId = body.dosenId;
    if (user.role === 'dosen') {
      const dosenProfile = await db.query.dosen.findFirst({
        where: eq(dosen.email, user.email),
      });
      if (!dosenProfile) {
        set.status = 400;
        return { error: 'Profil dosen tidak ditemukan.' };
      }
      dosenId = dosenProfile.id;
    }

    const newBap = await BapService.create({
      ...body,
      dosenId,
    });
    set.status = 201;
    return newBap;
  }
}
