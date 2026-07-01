import { BapService } from '../services/bap.service';
import { AuthContext } from '../utils/types';
import { db } from '../utils/db';
import { dosen, dosenPengajarKelas } from '../models/schema';
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
    } else {
      // Check if body.dosenId exists
      const dsnExists = await db.query.dosen.findFirst({
        where: eq(dosen.id, dosenId)
      });
      if (!dsnExists) {
        // Find a teaching dosen for this class
        const pengajar = await db.query.dosenPengajarKelas.findFirst({
          where: eq(dosenPengajarKelas.kelasKuliahId, body.kelasKuliahId),
        });
        if (pengajar) {
          dosenId = pengajar.dosenId;
        } else {
          // Fallback to any dosen
          const anyDosen = await db.query.dosen.findFirst();
          if (anyDosen) {
            dosenId = anyDosen.id;
          } else {
            set.status = 400;
            return { error: 'Tidak ada dosen terdaftar di sistem.' };
          }
        }
      }
    }

    const newBap = await BapService.create({
      ...body,
      dosenId,
    });
    set.status = 201;
    return newBap;
  }

  static async update({ params, body, set, getCurrentUser }: AuthContext) {
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
      if (dosenProfile) {
        dosenId = dosenProfile.id;
      }
    }

    const updated = await BapService.update(parseInt(params.id), {
      ...body,
      dosenId,
    });

    if (!updated) {
      set.status = 404;
      return { error: 'BAP tidak ditemukan' };
    }
    return updated;
  }
}
