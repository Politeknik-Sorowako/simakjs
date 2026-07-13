import { and, eq } from 'drizzle-orm';
import { mahasiswa, programStudi, skemaTarif } from '../models/schema';
import { TagihanService } from '../services/tagihan.service';
import { db } from '../utils/db';
import { AuthContext } from '../utils/types';

export class TagihanController {
  private static async getMahasiswaIdByEmail(email: string): Promise<number | null> {
    const [mhs] = await db.select({ id: mahasiswa.id }).from(mahasiswa).where(eq(mahasiswa.email, email));
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
          meta: { total: 0, page, limit, totalPages: 0 },
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

  static async updateNominal({ params, body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'keuangan')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const tagihanId = parseInt(params.id);
      const nominal = Number(body.nominal);
      const updated = await TagihanService.updateNominal(tagihanId, nominal);
      return {
        message: 'Nominal tagihan berhasil diperbarui',
        tagihan: updated,
      };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message || 'Gagal mengubah nominal tagihan' };
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
      const updated = await TagihanService.bayarTagihan(tagihanId, nominalBayar, user.id);
      return {
        message: 'Pembayaran berhasil dan mahasiswa diaktifkan',
        tagihan: {
          id: updated.id,
          status: updated.status,
          tanggalBayar: updated.tanggalBayar,
        },
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

  static async voidTransaksi({ params, body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'keuangan')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const transaksiId = parseInt(params.id);
      const catatan = body?.catatan || 'Void oleh petugas';
      const updated = await TagihanService.voidTransaksi(transaksiId, user.id, catatan);
      return {
        message: 'Transaksi berhasil dibatalkan (void)',
        tagihan: {
          id: updated.id,
          status: updated.status,
          nominalTerbayar: updated.nominalTerbayar,
        },
      };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message || 'Gagal membatalkan transaksi' };
    }
  }

  static async getRiwayat({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role === 'guest') {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const tagihanId = parseInt(params.id);
      const riwayat = await TagihanService.getRiwayatTransaksi(tagihanId);
      return { data: riwayat };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message || 'Gagal mengambil riwayat transaksi' };
    }
  }

  static async getAllTarif({ set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'keuangan')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const list = await db
      .select({
        id: skemaTarif.id,
        angkatan: skemaTarif.angkatan,
        programStudiId: skemaTarif.programStudiId,
        nominal: skemaTarif.nominal,
        programStudi: {
          id: programStudi.id,
          nama: programStudi.nama,
          kode: programStudi.kode,
        },
      })
      .from(skemaTarif)
      .leftJoin(programStudi, eq(skemaTarif.programStudiId, programStudi.id));
    return { data: list };
  }

  static async createTarif({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'keuangan')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const nominal = Number(body.nominal);
      const programStudiId = Number(body.programStudiId);
      const angkatan = String(body.angkatan);

      const [existing] = await db
        .select()
        .from(skemaTarif)
        .where(and(eq(skemaTarif.angkatan, angkatan), eq(skemaTarif.programStudiId, programStudiId)))
        .limit(1);

      if (existing) {
        const [updated] = await db
          .update(skemaTarif)
          .set({ nominal })
          .where(eq(skemaTarif.id, existing.id))
          .returning();
        return { message: 'Tarif angkatan berhasil diperbarui', data: updated };
      } else {
        const [created] = await db
          .insert(skemaTarif)
          .values({
            angkatan,
            programStudiId,
            nominal,
          })
          .returning();
        return { message: 'Tarif angkatan berhasil ditambahkan', data: created };
      }
    } catch (e: any) {
      set.status = 400;
      return { error: e.message || 'Gagal menyimpan tarif angkatan' };
    }
  }

  static async getStats({
    query,
    set,
    getCurrentUser,
  }: AuthContext<any, { periodeId?: string; programStudiId?: string }>) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'keuangan')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const periodeId = query?.periodeId;
    const prodiId = query?.programStudiId ? parseInt(query.programStudiId) : undefined;
    return await TagihanService.getStats(periodeId, prodiId);
  }

  static async deleteTarif({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'keuangan')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const id = parseInt(params.id);
      await db.delete(skemaTarif).where(eq(skemaTarif.id, id));
      return { message: 'Tarif angkatan berhasil dihapus' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message || 'Gagal menghapus tarif angkatan' };
    }
  }
}
