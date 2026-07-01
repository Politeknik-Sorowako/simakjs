import { TagihanService } from '../services/tagihan.service';
import { AuthContext } from '../utils/types';
import { db } from '../utils/db';
import { mahasiswa } from '../models/schema';
import { eq } from 'drizzle-orm';

export class TagihanController {
  private static async getMahasiswaIdByEmail(email: string): Promise<number | null> {
    const [mhs] = await db
      .select({ id: mahasiswa.id })
      .from(mahasiswa)
      .where(eq(mahasiswa.email, email));
    return mhs ? mhs.id : null;
  }

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

    let filterMhsId: number | undefined = undefined;
    if (user.role === 'mahasiswa') {
      const myMhsId = await TagihanController.getMahasiswaIdByEmail(user.email);
      if (!myMhsId) {
        return {
          data: [],
          meta: { total: 0, page, limit, totalPages: 0 }
        };
      }
      filterMhsId = myMhsId;
    }

    return await TagihanService.getAll(page, limit, search, status, filterMhsId);
  }

  static async generate({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'keuangan')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const nominal = body.nominal !== undefined ? Number(body.nominal) : undefined;
      const count = await TagihanService.generateTagihanPeriode(body.periodeId, nominal);
      set.status = 201;
      return { message: 'Tagihan berhasil dibuat secara massal', count };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message || 'Gagal generate tagihan' };
    }
  }

  static async bayar({ params, body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'keuangan')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const tagihanId = parseInt(params.id);
      const nominalBayar = body?.nominalBayar !== undefined ? Number(body.nominalBayar) : undefined;
      const updated = await TagihanService.bayarTagihan(tagihanId, nominalBayar);
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
