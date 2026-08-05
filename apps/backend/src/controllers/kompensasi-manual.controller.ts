import { type JenisKompen, KompensasiManualService } from '../services/kompensasi-manual.service';
import type { AuthContext } from '../utils/types';

// biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
function allowed(user: any, roles: string[]) {
  if (!user) return false;
  return roles.includes(user.role);
}

export class KompensasiManualController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async createKompensasi({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user || !allowed(user, ['admin', 'super_admin', 'dosen', 'prodi'])) {
        set.status = 403;
        return { error: 'Akses ditolak. Hanya Admin/Dosen.' };
      }
      const result = await KompensasiManualService.createKompensasi({
        mahasiswaId: body.mahasiswaId,
        tanggal: body.tanggal,
        jenisKompen: body.jenisKompen as JenisKompen,
        durasiMenit: body.durasiMenit,
        keterangan: body.keterangan,
        createdBy: user.id,
      });
      set.status = 201;
      return result;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('[kompensasi-manual] create error:', msg);
      set.status = 400;
      return { error: msg };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async updateKompensasi({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'super_admin'])) {
        set.status = 403;
        return { error: 'Akses ditolak. Hanya Admin.' };
      }
      const updated = await KompensasiManualService.updateKompensasi(parseInt(params.id), body);
      if (!updated) {
        set.status = 404;
        return { error: 'Data kompensasi tidak ditemukan.' };
      }
      return updated;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async deleteKompensasi({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'super_admin'])) {
        set.status = 403;
        return { error: 'Akses ditolak. Hanya Admin.' };
      }
      const deleted = await KompensasiManualService.deleteKompensasi(parseInt(params.id));
      if (!deleted) {
        set.status = 404;
        return { error: 'Data kompensasi tidak ditemukan.' };
      }
      return { success: true };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getRiwayat({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      const mahasiswaId = parseInt(params.mahasiswaId);
      return await KompensasiManualService.getRiwayatMahasiswa(mahasiswaId);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getDuplicateRisk({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'super_admin', 'dosen', 'prodi'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      const mahasiswaId = query?.mahasiswaId ? parseInt(query.mahasiswaId) : undefined;
      return await KompensasiManualService.getDuplicateRisk(mahasiswaId, query?.tanggal);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getStats({ set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'super_admin', 'dosen', 'prodi'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await KompensasiManualService.getStats();
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }
}
