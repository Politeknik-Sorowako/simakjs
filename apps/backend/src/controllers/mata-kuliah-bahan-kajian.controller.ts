import { MataKuliahBahanKajianService } from '../services/mata-kuliah-bahan-kajian.service';
import { isAdminOrProdi } from '../utils/role';
import { AuthContext } from '../utils/types';

export class MataKuliahBahanKajianController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getByMataKuliah({ params, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const mataKuliahId = parseInt(params.id);
    return await MataKuliahBahanKajianService.getByMataKuliah(mataKuliahId);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async attach({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!isAdminOrProdi(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const mataKuliahId = parseInt(params.id);
    const newData = await MataKuliahBahanKajianService.attach(mataKuliahId, body);
    set.status = 201;
    return newData;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async detach({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!isAdminOrProdi(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const mataKuliahId = parseInt(params.id);
    const bahanKajianId = parseInt(params.bkId);
    const deleted = await MataKuliahBahanKajianService.detach(mataKuliahId, bahanKajianId);
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'Bahan Kajian berhasil dihapus dari Mata Kuliah' };
  }
}
