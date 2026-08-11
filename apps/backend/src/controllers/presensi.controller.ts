import { PresensiService } from '../services/presensi.service';
import { ProdiScopeService } from '../services/prodi-scope.service';
import { hasRole } from '../utils/role';
import { AuthContext } from '../utils/types';

export class PresensiController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async saveBulk({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'dosen', 'prodi', 'instruktur'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    // Dosen/instruktur only may set hadir, telat( +durasi) or unknown; admin & prodi may validate unknown into sakit/izin/alpa.
    if (!hasRole(user, ['admin', 'super_admin', 'prodi'])) {
      const allowedStatuses = new Set(['hadir', 'telat', 'unknown']);
      const restricted = (body.presensiList || []).filter((p: { status: string }) => !allowedStatuses.has(p.status));
      if (restricted.length > 0) {
        set.status = 400;
        return { error: 'Dosen hanya dapat menetapkan status Hadir, Telat, atau Unknown untuk presensi.' };
      }
    }
    return await PresensiService.saveBulkPresensi(body.bapId, body.presensiList);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getByBap({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Akses ditolak. Silakan login.' };
    }
    return await PresensiService.getPresensiByBap(parseInt(params.bapId));
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getLaporanKompensasi({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user || !hasRole(user, ['admin', 'dosen'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      const page = query?.page ? parseInt(query.page) : 1;
      const limit = query?.limit ? parseInt(query.limit) : 20;
      const search = query?.search;
      const prodiId = query?.prodiId ? parseInt(query.prodiId) : undefined;
      const sortBy = query?.sortBy || 'sisa';
      const sortOrder = query?.sortOrder || 'desc';
      const statusLunas = query?.statusLunas;
      const exportAll = query?.exportAll === 'true';
      return await PresensiService.getLaporanKompensasi(
        page,
        limit,
        search,
        prodiId,
        sortBy,
        sortOrder,
        statusLunas,
        exportAll,
      );
    } catch (e: unknown) {
      console.error('[PresensiController.getLaporanKompensasi]', {
        error: e instanceof Error ? e.message : e,
      });
      set.status = 500;
      return { error: 'Gagal memuat laporan kompensasi. Silakan coba lagi.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getLaporanKompensasiStats({ set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'dosen'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    return await PresensiService.getLaporanKompensasiStats();
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getKompensasiDetail({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }
    const targetMhsId = parseInt(params.mahasiswaId);
    const detail = await PresensiService.getKompensasiDetail(targetMhsId);
    if (hasRole(user, ['mahasiswa']) && detail.mahasiswa.email !== user.email) {
      set.status = 403;
      return { error: 'Akses ditolak. Anda hanya dapat melihat data Anda sendiri.' };
    }
    return detail;
  }

  static async getRekapKehadiran({
    query,
    set,
    getCurrentUser,
    // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  }: AuthContext<any, { kelasKuliahId?: string }>): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'dosen'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const kelasKuliahId = query?.kelasKuliahId ? parseInt(query.kelasKuliahId) : undefined;
    if (!kelasKuliahId) {
      set.status = 400;
      return { error: 'Parameter kelasKuliahId diperlukan.' };
    }
    return await PresensiService.getRekapKehadiran(kelasKuliahId);
  }

  static async getRekapKehadiranMahasiswa({
    query,
    set,
    getCurrentUser,
    // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  }: AuthContext<any, { mahasiswaId?: string; periodeId?: string }>): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }
    const mahasiswaId = query?.mahasiswaId ? parseInt(query.mahasiswaId) : undefined;
    if (!mahasiswaId) {
      set.status = 400;
      return { error: 'Parameter mahasiswaId diperlukan.' };
    }
    return await PresensiService.getRekapKehadiranMahasiswa(mahasiswaId, query?.periodeId);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async bayarKompensasi({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const payload = {
      ...body,
      petugasId: user.id,
    };
    const newPayment = await PresensiService.bayarKompensasi(payload);
    set.status = 201;
    return newPayment;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async updateKompensasiBayar({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    try {
      const id = parseInt(params.id);
      const updated = await PresensiService.updateKompensasiBayar(id, body);
      if (!updated) {
        set.status = 404;
        return { error: 'Data penyelesaian kompensasi tidak ditemukan.' };
      }
      return updated;
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getUnknownPresensi({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'super_admin', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin/Admin Prodi.' };
    }
    const page = query?.page ? parseInt(query.page) : 1;
    const limit = query?.limit ? parseInt(query.limit) : 20;
    const search = query?.search;
    let prodiIds: number[] | undefined;
    if (hasRole(user, ['admin', 'super_admin'])) {
      const prodiId = query?.prodiId ? parseInt(query.prodiId) : undefined;
      prodiIds = prodiId ? [prodiId] : undefined;
    } else {
      prodiIds = (await ProdiScopeService.getUserAccessibleProdiIds(user)) || undefined;
    }
    return await PresensiService.getUnknownPresensi(page, limit, search, prodiIds);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async resolveUnknown({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'super_admin', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin/Admin Prodi.' };
    }
    try {
      const id = parseInt(params.id);
      const updated = await PresensiService.resolveUnknownPresensi(
        id,
        body.newStatus,
        user.id,
        body.keteranganAdmin,
        body.lampiranEvidens,
      );
      if (!updated) {
        set.status = 404;
        return { error: 'Data presensi tidak ditemukan.' };
      }
      return updated;
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal memproses permintaan' };
    }
  }
}
