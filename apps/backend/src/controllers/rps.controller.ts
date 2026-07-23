import { RpsService } from '../services/rps.service';
import { AuthContext } from '../utils/types';

export class RpsController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async bulkGenerate({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const result = await RpsService.bulkGenerateRps(body.kurikulumId, body.semester, body.periodeId);
    set.status = 201;
    return {
      message: `${result.created.length} RPS berhasil dibuat dari kurikulum semester ${body.semester}`,
      ...result,
    };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getRps({ query, set }: AuthContext): Promise<any> {
    const mkId = query?.mataKuliahId ? parseInt(query.mataKuliahId) : undefined;
    const periodeId = query?.periodeId;
    if (!mkId || !periodeId) {
      set.status = 400;
      return { error: 'mataKuliahId dan periodeId harus dikirim' };
    }
    return await RpsService.getRps(mkId, periodeId);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async createRps({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const newRps = await RpsService.createRps(body);
    set.status = 201;
    return newRps;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async updateRps({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const updated = await RpsService.updateRps(parseInt(params.id), body);
    if (!updated) {
      set.status = 404;
      return { error: 'RPS tidak ditemukan' };
    }
    return updated;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async addTopik({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const newTopik = await RpsService.addTopik(parseInt(params.id), body);
    set.status = 201;
    return newTopik;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async updateTopik({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const updated = await RpsService.updateTopik(parseInt(params.topikId), body);
    if (!updated) {
      set.status = 404;
      return { error: 'Topik tidak ditemukan' };
    }
    return updated;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async deleteTopik({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const deleted = await RpsService.deleteTopik(parseInt(params.topikId));
    if (!deleted) {
      set.status = 404;
      return { error: 'Topik tidak ditemukan' };
    }
    return { message: 'Topik RPS berhasil dihapus' };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getRencanaEvaluasi({ query, set }: AuthContext): Promise<any> {
    const mkId = query?.mataKuliahId ? parseInt(query.mataKuliahId) : undefined;
    if (!mkId) {
      set.status = 400;
      return { error: 'mataKuliahId harus dikirim' };
    }
    return await RpsService.getRencanaEvaluasi(mkId);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async createRencanaEvaluasi({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const newEval = await RpsService.createRencanaEvaluasi(body);
      set.status = 201;
      return newEval;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async updateRencanaEvaluasi({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const updated = await RpsService.updateRencanaEvaluasi(parseInt(params.id), body);
      if (!updated) {
        set.status = 404;
        return { error: 'Data tidak ditemukan' };
      }
      return updated;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async copyRps({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const newRps = await RpsService.copyRps(body.sourceRpsId, body.targetPeriodeId, body.targetMataKuliahId);
      set.status = 201;
      return newRps;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async deleteRencanaEvaluasi({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const deleted = await RpsService.deleteRencanaEvaluasi(parseInt(params.id));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'Rencana Evaluasi berhasil dihapus' };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getEvaluasiSubCpmk({ params, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const evaluasiId = parseInt(params.id);
    return await RpsService.getEvaluasiSubCpmk(evaluasiId);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async attachEvaluasiSubCpmk({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const evaluasiId = parseInt(params.id);
    const newData = await RpsService.attachEvaluasiSubCpmk(evaluasiId, body);
    set.status = 201;
    return newData;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async detachEvaluasiSubCpmk({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const evaluasiId = parseInt(params.id);
    const subCpmkId = parseInt(params.subCpmkId);
    const deleted = await RpsService.detachEvaluasiSubCpmk(evaluasiId, subCpmkId);
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'SubCPMK berhasil diunlink dari Evaluasi' };
  }
}
