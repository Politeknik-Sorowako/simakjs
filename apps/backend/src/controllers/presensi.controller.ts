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

  static async getByBap({ params }: AuthContext) {
    return await PresensiService.getPresensiByBap(parseInt(params.bapId));
  }

  static async getLaporanKompensasi({ set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    return await PresensiService.getLaporanKompensasi();
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

  static async bayarKompensasi({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const payload = {
      ...body,
      petugasId: user.id
    };
    const newPayment = await PresensiService.bayarKompensasi(payload);
    set.status = 201;
    return newPayment;
  }
}
