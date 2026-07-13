import { PresensiService } from '../services/presensi.service';
import { AuthContext } from '../utils/types';

export class PresensiController {
  static async saveBulk({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    return await PresensiService.saveBulkPresensi(body.bapId, body.presensiList);
  }

  static async getByBap({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Akses ditolak. Silakan login.' };
    }
    return await PresensiService.getPresensiByBap(parseInt(params.bapId));
  }

  static async getLaporanKompensasi({ query, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const page = query?.page ? parseInt(query.page) : 1;
    const limit = query?.limit ? parseInt(query.limit) : 20;
    const search = query?.search;
    const prodiId = query?.prodiId ? parseInt(query.prodiId) : undefined;
    return await PresensiService.getLaporanKompensasi(page, limit, search, prodiId);
  }

  static async getLaporanKompensasiStats({ set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    return await PresensiService.getLaporanKompensasiStats();
  }

  static async getKompensasiDetail({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }
    const targetMhsId = parseInt(params.mahasiswaId);
    const detail = await PresensiService.getKompensasiDetail(targetMhsId);
    if (user.role === 'mahasiswa' && detail.mahasiswa.email !== user.email) {
      set.status = 403;
      return { error: 'Akses ditolak. Anda hanya dapat melihat data Anda sendiri.' };
    }
    return detail;
  }

  static async getRekapKehadiran({ query, set, getCurrentUser }: AuthContext<any, { kelasKuliahId?: string }>) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
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
  }: AuthContext<any, { mahasiswaId?: string; periodeId?: string }>) {
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

  static async bayarKompensasi({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
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

  static async updateKompensasiBayar({ params, body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
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
    } catch (err: any) {
      set.status = 400;
      return { error: err.message || 'Gagal mengubah penyelesaian kompensasi.' };
    }
  }
}
