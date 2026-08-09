import { BapService } from '../services/bap.service';
import { hasRole } from '../utils/role';
import type { AuthContext } from '../utils/types';

interface DrizzleErrorCause {
  detail?: string;
  message?: string;
}

function extractErrorMessage(e: unknown): string {
  if (e instanceof Error) {
    const cause = (e as Error & { cause?: DrizzleErrorCause }).cause;
    return cause?.detail || cause?.message || e.message;
  }
  const cause = (e as { cause?: DrizzleErrorCause; message?: string }).cause;
  return cause?.detail || cause?.message || (e as { message?: string }).message || 'Unknown error';
}

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
    if (!user || !hasRole(user, ['admin', 'dosen', 'prodi', 'instruktur'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    try {
      let dosenId = body.dosenId;
      if (hasRole(user, ['dosen', 'instruktur'])) {
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
      const causeMsg = extractErrorMessage(e);
      set.status = 400;
      return { error: `Gagal membuat BAP: ${causeMsg}` };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async update({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'dosen', 'prodi', 'instruktur'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    try {
      let dosenId = body.dosenId;
      if (hasRole(user, ['dosen', 'instruktur'])) {
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
      const causeMsg = extractErrorMessage(e);
      set.status = 400;
      return { error: `Gagal memperbarui BAP: ${causeMsg}` };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async updateBapBulk({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'dosen', 'prodi', 'instruktur'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    try {
      let dosenId = body.dosenId;
      if (hasRole(user, ['dosen', 'instruktur'])) {
        const dosenProfile = await BapService.getDosenByEmail(user.email);
        if (dosenProfile) {
          dosenId = dosenProfile.id;
        }
      }
      const merged = await BapService.updateBapBulk({ ...body, dosenId });
      if (merged.length === 0) {
        set.status = 404;
        return { error: 'BAP tidak ditemukan' };
      }
      return merged;
    } catch (e: unknown) {
      const causeMsg = extractErrorMessage(e);
      set.status = 400;
      return { error: `Gagal memperbarui BAP: ${causeMsg}` };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getMonitoringRps({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Akses ditolak.' };
      }
      const periodeId = query?.periodeId ? String(query.periodeId) : undefined;
      const prodiId = query?.prodiId ? parseInt(String(query.prodiId)) : undefined;
      return await BapService.getMonitoringRps(periodeId, prodiId);
    } catch (e: unknown) {
      console.error('[BapController] Error in getMonitoringRps:', e instanceof Error ? e.stack || e.message : e);
      set.status = 500;
      return { error: 'Gagal mengambil data monitoring RPS' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getMonitoringRpsDetail({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Akses ditolak.' };
      }
      const result = await BapService.getMonitoringRpsDetail(parseInt(String(params.kelasKuliahId)));
      if (!result) {
        set.status = 404;
        return { error: 'Detail kelas tidak ditemukan' };
      }
      return result;
    } catch (e: unknown) {
      console.error('[BapController] Error in getMonitoringRpsDetail:', e instanceof Error ? e.stack || e.message : e);
      set.status = 500;
      return { error: 'Gagal mengambil detail monitoring RPS' };
    }
  }
}
