import { MahasiswaKeluarService } from '../services/mahasiswa-keluar.service';
import { hasRole } from '../utils/role';
import { AuthContext } from '../utils/types';

export class MahasiswaKeluarController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async create({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'prodi'])) {
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
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || hasRole(user, ['guest'])) {
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

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getStats({ query, set, getCurrentUser }: AuthContext<any, { periodeId?: string }>): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    return await MahasiswaKeluarService.getStats(query?.periodeId);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async delete({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin atau Program Studi yang dapat membatalkan status keluar.' };
    }

    try {
      const data = await MahasiswaKeluarService.delete(parseInt(params.id));
      return { message: 'Status keluar berhasil dibatalkan dan status mahasiswa kembali aktif.', data };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }
}
