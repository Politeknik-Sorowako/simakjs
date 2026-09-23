import { KompensasiRiwayatService } from '../services/kompensasi-riwayat.service';
import { ProdiScopeService } from '../services/prodi-scope.service';
import { type AuthContext, allowed, type UserRole } from '../utils/types';

const VIEW_ROLES: UserRole[] = ['admin', 'super_admin', 'prodi', 'kaprodi'];

function parseQuery(query: Record<string, unknown>) {
  return {
    page: query.page ? parseInt(String(query.page), 10) : undefined,
    limit: query.limit ? parseInt(String(query.limit), 10) : undefined,
    search: typeof query.search === 'string' && query.search.trim() ? query.search.trim() : undefined,
    prodiId: typeof query.prodiId === 'string' && query.prodiId ? parseInt(query.prodiId, 10) : undefined,
    prodiIds: undefined as number[] | undefined,
    tglDari: typeof query.tglDari === 'string' ? query.tglDari || undefined : undefined,
    tglSampai: typeof query.tglSampai === 'string' ? query.tglSampai || undefined : undefined,
    sortBy: typeof query.sortBy === 'string' ? query.sortBy : undefined,
    sortOrder: typeof query.sortOrder === 'string' ? query.sortOrder : undefined,
    sumber: typeof query.sumber === 'string' ? query.sumber : undefined,
    statusVerif: typeof query.statusVerif === 'string' ? query.statusVerif : undefined,
  };
}

export class KompensasiRiwayatController {
  /** GET /ketidakhadiran/riwayat-unified */
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getRiwayatKetidakhadiran({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, VIEW_ROLES)) {
        set.status = 403;
        return { error: 'Akses ditolak. Hanya Admin/Admin Prodi/Kaprodi.' };
      }
      const params = parseQuery((query || {}) as Record<string, unknown>);
      if (allowed(user, ['admin', 'super_admin'])) {
        params.prodiIds = params.prodiId ? [params.prodiId] : undefined;
      } else {
        const scoped = (await ProdiScopeService.getUserAccessibleProdiIds(user)) || undefined;
        params.prodiIds = params.prodiId ? scoped?.filter((id) => id === params.prodiId) || [] : scoped;
      }
      return await KompensasiRiwayatService.getRiwayatKetidakhadiran(params);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memuat riwayat ketidakhadiran' };
    }
  }

  /** GET /kompensasi/rekaman */
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getRekamanKompensasi({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, VIEW_ROLES)) {
        set.status = 403;
        return { error: 'Akses ditolak. Hanya Admin/Admin Prodi/Kaprodi.' };
      }
      const params = parseQuery((query || {}) as Record<string, unknown>);
      if (allowed(user, ['admin', 'super_admin'])) {
        params.prodiIds = params.prodiId ? [params.prodiId] : undefined;
      } else {
        const scoped = (await ProdiScopeService.getUserAccessibleProdiIds(user)) || undefined;
        params.prodiIds = params.prodiId ? scoped?.filter((id) => id === params.prodiId) || [] : scoped;
      }
      return await KompensasiRiwayatService.getRekamanKompensasi(params);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memuat rekaman kompensasi' };
    }
  }

  /** POST /kompensasi/rekaman/bulk-anulir */
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async bulkAnulir({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'super_admin', 'prodi'])) {
        set.status = 403;
        return { error: 'Akses ditolak. Hanya Admin/Admin Prodi.' };
      }
      const ids = Array.isArray(body.ids) ? (body.ids as unknown[]).map(Number) : [];
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu' };
      }
      const scopeProdiIds = allowed(user, ['admin', 'super_admin'])
        ? null
        : (await ProdiScopeService.getUserAccessibleProdiIds(user)) || undefined;
      return await KompensasiRiwayatService.bulkAnulirKetidakhadiran(ids, user.id, scopeProdiIds);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal menganulir ketidakhadiran' };
    }
  }
}
