import { NilaiPraktikService } from '../services/nilai-praktik.service';
import { type AuthContext, allowed } from '../utils/types';

export class NilaiPraktikController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async saveNilaiBulk({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user || !allowed(user, ['admin', 'super_admin', 'dosen', 'prodi'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await NilaiPraktikService.saveNilaiBulk({
        rombelPraktikumId: body.rombelPraktikumId,
        nilaiList: body.nilaiList,
        createdBy: user.id,
      });
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getNilaiByRombel({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      return await NilaiPraktikService.getNilaiByRombel(parseInt(params.rombelPraktikumId));
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }
}
