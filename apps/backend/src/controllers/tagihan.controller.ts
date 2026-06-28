import { TagihanService } from '../services/tagihan.service';
import { AuthContext } from '../utils/types';

export class TagihanController {
  static async getAll({ query, set, getCurrentUser }: AuthContext<any, any>) {
    const user = await getCurrentUser();
    if (!user || user.role === 'guest') {
      set.status = 403;
      return { error: 'Akses ditolak. Guest tidak diizinkan mengakses data tagihan.' };
    }
    const page = query?.page ? parseInt(query.page) : 1;
    const limit = query?.limit ? parseInt(query.limit) : 10;
    const search = query?.search || '';
    const status = query?.status || undefined;
    return await TagihanService.getAll(page, limit, search, status);
  }

  static async generate({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'keuangan')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const count = await TagihanService.generateTagihanPeriode(body.periodeId);
      set.status = 201;
      return { message: 'Tagihan berhasil dibuat secara massal', count };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message || 'Gagal generate tagihan' };
    }
  }

  static async bayar({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'keuangan')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const tagihanId = parseInt(params.id);
      const updated = await TagihanService.bayarTagihan(tagihanId);
      return {
        message: 'Pembayaran berhasil dan mahasiswa diaktifkan',
        tagihan: {
          id: updated.id,
          status: updated.status,
          tanggalBayar: updated.tanggalBayar
        }
      };
    } catch (e: any) {
      if (e.message === 'Tagihan tidak ditemukan') {
        set.status = 404;
      } else {
        set.status = 400;
      }
      return { error: e.message || 'Gagal membayar tagihan' };
    }
  }
}
