import { BapService } from '../services/bap.service';
import { AuthContext } from '../utils/types';

export class BapController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getByKelas({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Akses ditolak. Silakan login.' };
    }
    return await BapService.getByKelas(parseInt(String(params.kelasKuliahId)));
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getRpsTopik({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Akses ditolak. Silakan login.' };
    }
    return await BapService.getRpsTopikByKelas(parseInt(String(params.kelasKuliahId)));
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async create({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    try {
      let dosenId = body.dosenId;
      if (user.role === 'dosen') {
        const dosenProfile = await BapService.getDosenByEmail(user.email);
        if (!dosenProfile) {
          set.status = 400;
          return { error: 'Profil dosen tidak ditemukan.' };
        }
        dosenId = dosenProfile.id;
      } else {
        const dsnExists = dosenId ? await BapService.getDosenById(dosenId) : null;
        if (!dsnExists) {
          const pengajar = await BapService.getFirstTeachingDosen(body.kelasKuliahId);
          if (pengajar) {
            dosenId = pengajar.dosenId;
          } else {
            const anyDosen = await BapService.getAnyDosen();
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
    } catch (e: unknown) {
      // biome-ignore lint/suspicious/noExplicitAny: Extracting Drizzle query cause
      const errAny = e as any;
      const causeMsg = errAny?.cause?.detail || errAny?.cause?.message || errAny?.message || 'Unknown error';
      set.status = 400;
      return { error: `Gagal membuat BAP: ${causeMsg}` };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async update({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    try {
      let dosenId = body.dosenId;
      if (user.role === 'dosen') {
        const dosenProfile = await BapService.getDosenByEmail(user.email);
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
    } catch (e: unknown) {
      // biome-ignore lint/suspicious/noExplicitAny: Extracting Drizzle query cause
      const errAny = e as any;
      const causeMsg = errAny?.cause?.detail || errAny?.cause?.message || errAny?.message || 'Unknown error';
      set.status = 400;
      return { error: `Gagal memperbarui BAP: ${causeMsg}` };
    }
  }
}
