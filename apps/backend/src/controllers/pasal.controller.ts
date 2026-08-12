import { PasalPelanggaranService } from '../services/pasal.service';
import { hasRole } from '../utils/role';
import { AuthContext } from '../utils/types';

export class PasalPelanggaranController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'prodi', 'dosen', 'instruktur'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const prodiId = query?.programStudiId ? parseInt(query.programStudiId) : undefined;
    return await PasalPelanggaranService.getAll({
      search: query?.search,
      programStudiId: prodiId,
      includeInactive: query?.includeInactive === true || query?.includeInactive === 'true',
    });
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async create({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin/Admin Prodi.' };
    }
    try {
      const created = await PasalPelanggaranService.create(body);
      set.status = 201;
      return created;
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal menyimpan pasal.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async update({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin/Admin Prodi.' };
    }
    try {
      const id = parseInt(params.id);
      const updated = await PasalPelanggaranService.update(id, body);
      if (!updated) {
        set.status = 404;
        return { error: 'Pasal tidak ditemukan.' };
      }
      return updated;
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal memperbarui pasal.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async remove({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    try {
      const deleted = await PasalPelanggaranService.remove(parseInt(params.id));
      if (!deleted) {
        set.status = 404;
        return { error: 'Pasal tidak ditemukan.' };
      }
      return { success: true };
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal menghapus pasal.' };
    }
  }
}
