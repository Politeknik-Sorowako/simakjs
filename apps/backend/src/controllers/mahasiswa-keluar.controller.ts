import { MahasiswaKeluarService } from '../services/mahasiswa-keluar.service';
import { AuthContext } from '../utils/types';

export class MahasiswaKeluarController {
  static async create({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || !['admin', 'prodi'].includes(user.role)) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin atau Program Studi yang dapat menonaktifkan mahasiswa.' };
    }

    try {
      const data = await MahasiswaKeluarService.create({
        mahasiswaId: body.mahasiswaId,
        periodeId: body.periodeId,
        statusBaru: body.statusBaru,
        tanggalKeluar: body.tanggalKeluar,
        alasanKeluar: body.alasanKeluar,
        noSk: body.noSk,
        tanggalSk: body.tanggalSk,
        ipk: body.ipk,
        nomorIjazah: body.nomorIjazah,
      });
      set.status = 201;
      return data;
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async getAll({ query, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role === 'guest') {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    const page = query?.page ? parseInt(query.page) : 1;
    const limit = query?.limit ? parseInt(query.limit) : 10;
    const search = query?.search || '';
    const periodeId = query?.periodeId;

    return await MahasiswaKeluarService.getAll({
      page,
      limit,
      search,
      periodeId,
    });
  }

  static async delete({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || !['admin', 'prodi'].includes(user.role)) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin atau Program Studi yang dapat membatalkan status keluar.' };
    }

    try {
      const data = await MahasiswaKeluarService.delete(parseInt(params.id));
      return { message: 'Status keluar berhasil dibatalkan dan status mahasiswa kembali aktif.', data };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }
}
