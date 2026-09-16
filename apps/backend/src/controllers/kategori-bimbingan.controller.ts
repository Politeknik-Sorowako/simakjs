import { KategoriBimbinganService } from '../services/kategori-bimbingan.service';
import { hasRole } from '../utils/role';
import { AuthContext, UserPayload } from '../utils/types';

export class KategoriBimbinganController {
  private static isAuthorized(user: UserPayload | null | undefined): boolean {
    return hasRole(user, ['admin', 'super_admin', 'prodi']);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll(ctx: AuthContext<any>): Promise<any> {
    const { set } = ctx;
    try {
      const data = await KategoriBimbinganService.getAll();
      return { success: true, data };
    } catch (err: unknown) {
      set.status = 500;
      return { error: err instanceof Error ? err.message : 'Gagal mengambil data kategori bimbingan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async create(ctx: AuthContext<any>): Promise<any> {
    const { body, set, getCurrentUser } = ctx;
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser || !KategoriBimbinganController.isAuthorized(currentUser)) {
        set.status = 403;
        return { error: 'Akses ditolak. Anda tidak memiliki izin mengelola kategori bimbingan' };
      }
      const newCategory = await KategoriBimbinganService.create(body as { nama: string; deskripsi?: string });
      return { success: true, data: newCategory };
    } catch (err: unknown) {
      set.status = 500;
      return { error: err instanceof Error ? err.message : 'Gagal membuat kategori bimbingan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async update(ctx: AuthContext<any>): Promise<any> {
    const { params, body, set, getCurrentUser } = ctx;
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser || !KategoriBimbinganController.isAuthorized(currentUser)) {
        set.status = 403;
        return { error: 'Akses ditolak. Anda tidak memiliki izin mengelola kategori bimbingan' };
      }
      const updated = await KategoriBimbinganService.update(
        Number(params.id),
        body as { nama?: string; deskripsi?: string; isActive?: boolean },
      );
      return { success: true, data: updated };
    } catch (err: unknown) {
      set.status = 500;
      return { error: err instanceof Error ? err.message : 'Gagal memperbarui kategori bimbingan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async delete(ctx: AuthContext<any>): Promise<any> {
    const { params, set, getCurrentUser } = ctx;
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser || !KategoriBimbinganController.isAuthorized(currentUser)) {
        set.status = 403;
        return { error: 'Akses ditolak. Anda tidak memiliki izin mengelola kategori bimbingan' };
      }
      await KategoriBimbinganService.delete(Number(params.id));
      return { success: true, message: 'Kategori bimbingan berhasil dinonaktifkan' };
    } catch (err: unknown) {
      set.status = 500;
      return { error: err instanceof Error ? err.message : 'Gagal menghapus kategori bimbingan' };
    }
  }
}
