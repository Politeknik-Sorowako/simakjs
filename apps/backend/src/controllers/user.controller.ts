import { db } from '../utils/db';
import { users } from '../models/schema';
import { eq, count, ilike, or } from 'drizzle-orm';
import { AuthContext } from '../utils/types';

export class UserController {
  static async getAll({ query, set, getCurrentUser }: AuthContext) {
    try {
      const user = await getCurrentUser();
      if (!user || user.role !== 'admin') {
        set.status = 403;
        return { error: 'Akses ditolak. Hanya Admin.' };
      }

      const page = parseInt((query as any)?.page || '1');
      const limit = parseInt((query as any)?.limit || '10');
      const search = (query as any)?.search || '';
      const offset = (page - 1) * limit;

      let whereClause = undefined;
      if (search) {
        whereClause = or(
          ilike(users.nama, `%${search}%`),
          ilike(users.email, `%${search}%`)
        );
      }

      const [totalResult] = await db
        .select({ total: count() })
        .from(users)
        .where(whereClause);

      const total = totalResult?.total || 0;
      const totalPages = Math.ceil(total / limit);

      const allUsers = await db
        .select({
          id: users.id,
          email: users.email,
          nama: users.nama,
          role: users.role,
          isActive: users.isActive,
          theme: users.theme,
          avatar: users.avatar,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(whereClause)
        .limit(limit)
        .offset(offset);

      return {
        data: allUsers,
        meta: {
          total,
          page,
          limit,
          totalPages,
        }
      };
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

  static async updateRole({ params, body, set, getCurrentUser }: AuthContext) {
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

      const newRole = (body as any)?.role;
      const validRoles = ['admin', 'dosen', 'mahasiswa', 'prodi', 'keuangan', 'guest'];
      if (!newRole || !validRoles.includes(newRole)) {
        set.status = 400;
        return { error: 'Peran tidak valid' };
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) {
        set.status = 404;
        return { error: 'Pengguna tidak ditemukan' };
      }

      // Prevent changing own role
      if (user.id === currentUser.id) {
        set.status = 400;
        return { error: 'Anda tidak dapat mengubah peran akun sendiri' };
      }

      const [updated] = await db.update(users)
        .set({ role: newRole })
        .where(eq(users.id, userId))
        .returning();

      return {
        message: 'Peran pengguna berhasil diperbarui',
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
      return { error: 'Gagal memperbarui peran pengguna', details: error.message };
    }
  }

  static async updateProfile({ body, set, getCurrentUser }: AuthContext) {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu' };
      }

      const nama = (body as any)?.nama;
      const password = (body as any)?.password;
      const theme = (body as any)?.theme;
      const avatar = (body as any)?.avatar;

      const updateData: Record<string, any> = {};

      if (nama !== undefined) {
        if (!nama || nama.length < 3) {
          set.status = 400;
          return { error: 'Nama minimal harus 3 karakter' };
        }
        updateData.nama = nama;
      }

      if (theme !== undefined) {
        const validThemes = ['light', 'dark'];
        if (!validThemes.includes(theme)) {
          set.status = 400;
          return { error: 'Tema tidak valid' };
        }
        updateData.theme = theme;
      }

      if (avatar !== undefined) {
        updateData.avatar = avatar;
      }

      if (password) {
        if (password.length < 6) {
          set.status = 400;
          return { error: 'Password minimal harus 6 karakter' };
        }
        updateData.password = await Bun.password.hash(password, {
          algorithm: 'bcrypt',
          cost: 10,
        });
      }

      if (Object.keys(updateData).length === 0) {
        set.status = 400;
        return { error: 'Tidak ada data yang diperbarui' };
      }

      const [updated] = await db.update(users)
        .set(updateData)
        .where(eq(users.id, currentUser.id))
        .returning();

      return {
        message: 'Profil Anda berhasil diperbarui',
        user: {
          id: updated.id,
          email: updated.email,
          nama: updated.nama,
          role: updated.role,
          theme: updated.theme,
          avatar: updated.avatar,
        }
      };
    } catch (error: any) {
      set.status = 500;
      return { error: 'Gagal memperbarui profil', details: error.message };
    }
  }
}
