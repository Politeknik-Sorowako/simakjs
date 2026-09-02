import { VerifikasiUnknownService } from '../services/verifikasi-unknown.service';
import { type AuthContext, allowed } from '../utils/types';

export class VerifikasiUnknownController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async verify({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'super_admin', 'prodi'])) {
        set.status = 403;
        return { error: 'Akses ditolak. Hanya Admin/Admin Prodi.' };
      }
      return await VerifikasiUnknownService.verify({
        sumber: body.sumber,
        sumberId: Number(body.sumberId),
        statusKonfirmasi: body.statusKonfirmasi,
        durasiMenit: body.durasiMenit,
        keterangan: body.keterangan,
        adminUserId: user!.id,
      });
    } catch (e: unknown) {
      console.error('[VerifikasiUnknownController.verify]', {
        error: e instanceof Error ? e.message : 'Unknown error',
        stack: e instanceof Error ? e.stack : undefined,
        cause: e instanceof Error && e.cause ? String(e.cause) : undefined,
        body,
      });
      if (e instanceof Error && e.message.includes('tidak ditemukan')) {
        set.status = 404;
      } else {
        set.status = 400;
      }
      return { error: e instanceof Error ? e.message : 'Gagal memverifikasi ketidakhadiran' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getList({ set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'super_admin', 'prodi'])) {
        set.status = 403;
        return { error: 'Akses ditolak. Hanya Admin/Admin Prodi.' };
      }
      return await VerifikasiUnknownService.getList();
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memuat daftar ketidakhadiran' };
    }
  }
}
