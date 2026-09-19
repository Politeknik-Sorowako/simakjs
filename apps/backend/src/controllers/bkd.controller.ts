import { BkdService } from '../services/bkd.service';
import { hasRole } from '../utils/role';
import type { AuthContext } from '../utils/types';

export class BkdController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getRekap({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (hasRole(user, ['guest', 'mahasiswa'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    const periodeId = query?.periodeId;
    if (!periodeId) {
      set.status = 400;
      return { error: 'Periode akademik wajib diisi.' };
    }

    // Dosen hanya dapat melihat BKD miliknya sendiri; admin/prodi/kaprodi bebas filter.
    let dosenId: number;
    if (hasRole(user, ['dosen'])) {
      const profil = await BkdService.getDosenByEmail(user.email);
      if (!profil) {
        set.status = 400;
        return { error: 'Profil Dosen Anda tidak ditemukan.' };
      }
      dosenId = profil.id;
    } else {
      const parsed = Number(query?.dosenId);
      if (!parsed || Number.isNaN(parsed)) {
        set.status = 400;
        return { error: 'Dosen wajib diisi.' };
      }
      dosenId = parsed;
    }

    try {
      const data = await BkdService.getRekap(dosenId, periodeId);
      return { data };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mengambil laporan BKD.' };
    }
  }
}
