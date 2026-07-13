import { RpsService } from '../services/rps.service';
import { AuthContext } from '../utils/types';

export class RpsController {
  static async bulkGenerate({ body, set, getCurrentUser }: AuthContext) {
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

  static async getRps({ query, set }: AuthContext) {
    const mkId = query?.mataKuliahId ? parseInt(query.mataKuliahId) : undefined;
    const periodeId = query?.periodeId;
    if (!mkId || !periodeId) {
      set.status = 400;
      return { error: 'mataKuliahId dan periodeId harus dikirim' };
    }
    return await RpsService.getRps(mkId, periodeId);
  }

  static async createRps({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const newRps = await RpsService.createRps(body);
    set.status = 201;
    return newRps;
  }

  static async updateRps({ params, body, set, getCurrentUser }: AuthContext) {
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

  static async addTopik({ params, body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const newTopik = await RpsService.addTopik(parseInt(params.id), body);
    set.status = 201;
    return newTopik;
  }

  static async updateTopik({ params, body, set, getCurrentUser }: AuthContext) {
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

  static async deleteTopik({ params, set, getCurrentUser }: AuthContext) {
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

  static async getRencanaEvaluasi({ query, set }: AuthContext) {
    const mkId = query?.mataKuliahId ? parseInt(query.mataKuliahId) : undefined;
    if (!mkId) {
      set.status = 400;
      return { error: 'mataKuliahId harus dikirim' };
    }
    return await RpsService.getRencanaEvaluasi(mkId);
  }

  static async createRencanaEvaluasi({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const newEval = await RpsService.createRencanaEvaluasi(body);
      set.status = 201;
      return newEval;
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async updateRencanaEvaluasi({ params, body, set, getCurrentUser }: AuthContext) {
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
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async copyRps({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const newRps = await RpsService.copyRps(body.sourceRpsId, body.targetPeriodeId, body.targetMataKuliahId);
      set.status = 201;
      return newRps;
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async deleteRencanaEvaluasi({ params, set, getCurrentUser }: AuthContext) {
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

  static async getEvaluasiSubCpmk({ params, getCurrentUser }: AuthContext) {
    await getCurrentUser();
    const evaluasiId = parseInt(params.evaluasiId);
    return await RpsService.getEvaluasiSubCpmk(evaluasiId);
  }

  static async attachEvaluasiSubCpmk({ params, body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const evaluasiId = parseInt(params.evaluasiId);
    const newData = await RpsService.attachEvaluasiSubCpmk(evaluasiId, body);
    set.status = 201;
    return newData;
  }

  static async detachEvaluasiSubCpmk({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const evaluasiId = parseInt(params.evaluasiId);
    const subCpmkId = parseInt(params.subCpmkId);
    const deleted = await RpsService.detachEvaluasiSubCpmk(evaluasiId, subCpmkId);
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'SubCPMK berhasil diunlink dari Evaluasi' };
  }
}
