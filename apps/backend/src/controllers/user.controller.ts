import { db } from '../utils/db';
import { users } from '../models/schema';
import { eq, ne } from 'drizzle-orm';
import { AuthContext } from '../utils/types';

export class UserController {
  static async getAll({ set, getCurrentUser }: AuthContext) {
    try {
      const user = await getCurrentUser();
      if (!user || user.role !== 'admin') {
        set.status = 403;
        return { error: 'Akses ditolak. Hanya Admin.' };
      }

      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        nama: users.nama,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      }).from(users);

      return { data: allUsers };
    } catch (error: any) {
      set.status = 500;
      return { error: 'Gagal mengambil data pengguna', details: error.message };
    }
  }

  static async toggleActive({ params, set, getCurrentUser }: AuthContext) {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        set.status = 403;
        return { error: 'Akses ditolak. Hanya Admin.' };
      }

      const userId = parseInt(params.id);
      if (isNaN(userId)) {
        set.status = 400;
        return { error: 'ID pengguna tidak valid' };
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) {
        set.status = 404;
        return { error: 'Pengguna tidak ditemukan' };
      }

      // Prevent deactivating own account
      if (user.id === currentUser.id) {
        set.status = 400;
        return { error: 'Anda tidak dapat menonaktifkan akun sendiri' };
      }

      const [updated] = await db.update(users)
        .set({ isActive: !user.isActive })
        .where(eq(users.id, userId))
        .returning();

      return {
        message: `Pengguna berhasil ${updated.isActive ? 'diaktifkan' : 'dinonaktifkan'}`,
        user: {
          id: updated.id,
          email: updated.email,
          nama: updated.nama,
          role: updated.role,
          isActive: updated.isActive,
        }
      };
    } catch (error: any) {
      set.status = 500;
      return { error: 'Gagal mengubah status aktif pengguna', details: error.message };
    }
  }
}
