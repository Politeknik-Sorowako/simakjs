import { KrsService } from '../services/krs.service';
import { AuthContext, PaginationQuery } from '../utils/types';

export class KrsController {
  static async getAll({ query }: AuthContext<any, PaginationQuery>) {
    const page = query?.page ? parseInt(query.page) : 1;
    const limit = query?.limit ? parseInt(query.limit) : 10;
    const search = query?.search || '';
    return await KrsService.getAll(page, limit, search);
  }

  static async getById({ params, set }: AuthContext) {
    const data = await KrsService.getById(parseInt(params.id));
    if (!data) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return data;
  }

  static async create({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 403;
      return { error: 'Akses ditolak. Silakan login.' };
    }
    try {
      const newKrs = await KrsService.create(body);
      set.status = 201;
      return newKrs;
    } catch (e: any) {
      set.status = 400;
      return { error: e.message || 'Gagal membuat KRS' };
    }
  }

  static async approve({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'dosen' && user.role !== 'admin')) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Dosen Pembimbing Akademik atau Admin yang dapat menyetujui KRS.' };
    }
    try {
      const updated = await KrsService.approveKrs(body.mahasiswaId, body.periodeId, user.email);
      return { message: 'KRS berhasil disetujui', count: updated.length, data: updated };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message || 'Gagal menyetujui KRS' };
    }
  }

  static async update({ params, body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 403;
      return { error: 'Akses ditolak. Silakan login.' };
    }
    if (user.role === 'mahasiswa') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin/Dosen yang dapat mengubah KRS.' };
    }
    const updated = await KrsService.update(parseInt(params.id), body);
    if (!updated) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return updated;
  }

  static async delete({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 403;
      return { error: 'Akses ditolak. Silakan login.' };
    }
    const deleted = await KrsService.delete(parseInt(params.id));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'KRS berhasil dihapus' };
  }
}
