import { count, eq, ilike, or } from 'drizzle-orm';
import { users } from '../models/schema';
import { CsvImportService } from '../services/csv-import.service';
import { db } from '../utils/db';
import { AuthContext } from '../utils/types';

export class UserController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        set.status = 403;
        return { error: 'Akses ditolak. Hanya Admin atau Super Admin.' };
      }

      const page = parseInt(((query as Record<string, unknown>)?.page as string) || '1');
      const limit = parseInt(((query as Record<string, unknown>)?.limit as string) || '10');
      const search = ((query as Record<string, unknown>)?.search as string) || '';
      const offset = (page - 1) * limit;

      let whereClause = undefined;
      if (search) {
        whereClause = or(ilike(users.nama, `%${search}%`), ilike(users.email, `%${search}%`));
      }

      const [totalResult] = await db.select({ total: count() }).from(users).where(whereClause);

      const total = totalResult?.total || 0;
      const totalPages = Math.ceil(total / limit);

      const allUsers = await db
        .select({
          id: users.id,
          email: users.email,
          nama: users.nama,
          role: users.role,
          prodiIds: users.prodiIds,
          isActive: users.isActive,
          mustChangePassword: users.mustChangePassword,
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
        },
      };
    } catch (error: unknown) {
      set.status = 500;
      return { error: 'Gagal mengambil data pengguna' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async createUser({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }

      // biome-ignore lint/suspicious/noExplicitAny: Elysia body type
      const { email, password, nama, role, prodiIds } = body as any;
      if (!email || !password || !nama) {
        set.status = 400;
        return { error: 'Email, password, dan nama wajib diisi' };
      }

      const targetRole = role || 'mahasiswa';
      if (targetRole === 'super_admin' && currentUser.role !== 'super_admin') {
        set.status = 403;
        return { error: 'Hanya Super Admin yang dapat membuat akun dengan role Super Admin.' };
      }

      const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
      if (existing) {
        set.status = 400;
        return { error: 'Email sudah terdaftar' };
      }

      const hashedPassword = await Bun.password.hash(password, { algorithm: 'bcrypt', cost: 12 });
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          password: hashedPassword,
          nama,
          role: targetRole,
          prodiIds: Array.isArray(prodiIds) ? prodiIds : [],
          isActive: true,
          mustChangePassword: true,
        })
        .returning();

      set.status = 201;
      return newUser;
    } catch (error: unknown) {
      set.status = 500;
      return { error: 'Gagal menambahkan pengguna baru' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async toggleActive({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
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

      const [updated] = await db
        .update(users)
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
        },
      };
    } catch (error: unknown) {
      set.status = 500;
      return { error: 'Gagal mengubah status aktif pengguna' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async updateRole({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }

      const userId = parseInt(params.id);
      if (isNaN(userId)) {
        set.status = 400;
        return { error: 'ID pengguna tidak valid' };
      }

      // biome-ignore lint/suspicious/noExplicitAny: Elysia body type inference requires any
      const newRole = (body as any)?.role;
      const validRoles = [
        'super_admin',
        'admin',
        'dosen',
        'mahasiswa',
        'prodi',
        'keuangan',
        'guest',
        'calon_mahasiswa',
      ];
      if (!newRole || !validRoles.includes(newRole)) {
        set.status = 400;
        return { error: 'Peran tidak valid' };
      }

      if (newRole === 'super_admin' && currentUser.role !== 'super_admin') {
        set.status = 403;
        return { error: 'Hanya Super Admin yang dapat menetapkan peran Super Admin.' };
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

      const [updated] = await db.update(users).set({ role: newRole }).where(eq(users.id, userId)).returning();

      return {
        message: 'Peran pengguna berhasil diperbarui',
        user: {
          id: updated.id,
          email: updated.email,
          nama: updated.nama,
          role: updated.role,
          isActive: updated.isActive,
        },
      };
    } catch (error: unknown) {
      set.status = 500;
      return { error: 'Gagal memperbarui peran pengguna' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async updateProfile({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu' };
      }

      // biome-ignore lint/suspicious/noExplicitAny: Elysia body type inference requires any
      const nama = (body as any)?.nama;
      // biome-ignore lint/suspicious/noExplicitAny: Elysia body type inference requires any
      const password = (body as any)?.password;
      // biome-ignore lint/suspicious/noExplicitAny: Elysia body type inference requires any
      const currentPassword = (body as any)?.currentPassword;
      // biome-ignore lint/suspicious/noExplicitAny: Elysia body type inference requires any
      const theme = (body as any)?.theme;
      // biome-ignore lint/suspicious/noExplicitAny: Elysia body type inference requires any
      const avatar = (body as any)?.avatar;

      // biome-ignore lint/suspicious/noExplicitAny: Dynamic update object built from optional body fields
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
        if (!currentPassword) {
          set.status = 400;
          return { error: 'Kata sandi saat ini wajib diisi' };
        }
        const [fullUser] = await db.select().from(users).where(eq(users.id, currentUser.id)).limit(1);
        if (!fullUser) {
          set.status = 404;
          return { error: 'Pengguna tidak ditemukan' };
        }
        const isMatch = await Bun.password.verify(currentPassword, fullUser.password);
        if (!isMatch) {
          set.status = 400;
          return { error: 'Kata sandi saat ini salah' };
        }
        if (password.length < 6) {
          set.status = 400;
          return { error: 'Password minimal harus 6 karakter' };
        }
        updateData.password = await Bun.password.hash(password, {
          algorithm: 'bcrypt',
          cost: 12,
        });
        updateData.mustChangePassword = false;
      }

      if (Object.keys(updateData).length === 0) {
        set.status = 400;
        return { error: 'Tidak ada data yang diperbarui' };
      }

      const [updated] = await db.update(users).set(updateData).where(eq(users.id, currentUser.id)).returning();

      return {
        message: 'Profil Anda berhasil diperbarui',
        user: {
          id: updated.id,
          email: updated.email,
          nama: updated.nama,
          role: updated.role,
          mustChangePassword: updated.mustChangePassword,
          theme: updated.theme,
          avatar: updated.avatar,
        },
      };
    } catch (error: unknown) {
      set.status = 500;
      return { error: 'Gagal memperbarui profil' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async importCsv({ request, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      set.status = 400;
      return { error: 'File CSV tidak ditemukan.' };
    }

    const text = await file.text();
    const result = await CsvImportService.importUsers(text);
    return result;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async resetPassword({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
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

      // biome-ignore lint/suspicious/noExplicitAny: Elysia body type inference requires any
      const newPassword = (body as any)?.password;
      if (!newPassword || newPassword.length < 6) {
        set.status = 400;
        return { error: 'Password minimal 6 karakter' };
      }

      const hashed = await Bun.password.hash(newPassword, { algorithm: 'bcrypt', cost: 12 });

      await db.update(users).set({ password: hashed, mustChangePassword: true }).where(eq(users.id, userId));

      return { message: 'Password berhasil direset' };
    } catch (error: unknown) {
      set.status = 500;
      return { error: 'Gagal mereset password' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async forcePasswordChange({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
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

      // biome-ignore lint/suspicious/noExplicitAny: Elysia body type inference requires any
      const mustChangePassword = (body as any)?.mustChangePassword !== false;

      const [updated] = await db.update(users).set({ mustChangePassword }).where(eq(users.id, userId)).returning();

      if (!updated) {
        set.status = 404;
        return { error: 'Pengguna tidak ditemukan' };
      }

      return {
        message: mustChangePassword
          ? 'Pengguna diwajibkan mengganti kata sandi pada login berikutnya'
          : 'Kewajiban ganti kata sandi pengguna telah dibatalkan',
        user: {
          id: updated.id,
          email: updated.email,
          nama: updated.nama,
          mustChangePassword: updated.mustChangePassword,
        },
      };
    } catch (error: unknown) {
      set.status = 500;
      return { error: 'Gagal memperbarui status wajib ganti password' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async updateProdiScope({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }

      const userId = parseInt(params.id);
      if (isNaN(userId)) {
        set.status = 400;
        return { error: 'ID pengguna tidak valid' };
      }

      // biome-ignore lint/suspicious/noExplicitAny: Elysia body type
      const prodiIds = (body as any)?.prodiIds;
      if (!Array.isArray(prodiIds)) {
        set.status = 400;
        return { error: 'prodiIds harus berupa array of number ID' };
      }

      const [updated] = await db.update(users).set({ prodiIds }).where(eq(users.id, userId)).returning();

      if (!updated) {
        set.status = 404;
        return { error: 'Pengguna tidak ditemukan' };
      }

      return {
        message: 'Cakupan program studi pengguna berhasil diperbarui',
        user: {
          id: updated.id,
          nama: updated.nama,
          prodiIds: updated.prodiIds,
        },
      };
    } catch (error: unknown) {
      set.status = 500;
      return { error: 'Gagal memperbarui cakupan prodi' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async generateAccounts({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    // biome-ignore lint/suspicious/noExplicitAny: Elysia body type inference requires any
    const targetType = (body as any)?.targetType;
    // biome-ignore lint/suspicious/noExplicitAny: Elysia body type inference requires any
    const ids = (body as any)?.ids;

    if (!targetType || !ids || !Array.isArray(ids)) {
      set.status = 400;
      return { error: 'Parameter targetType dan ids (array) wajib diisi.' };
    }

    const result = await CsvImportService.generateAccounts(targetType, ids);
    return result;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async generateAccountsAsync({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    // biome-ignore lint/suspicious/noExplicitAny: Elysia body type inference requires any
    const targetType = (body as any)?.targetType;
    // biome-ignore lint/suspicious/noExplicitAny: Elysia body type inference requires any
    const ids = (body as any)?.ids;

    if (!targetType || !ids || !Array.isArray(ids)) {
      set.status = 400;
      return { error: 'Parameter targetType dan ids (array) wajib diisi.' };
    }

    set.status = 202;
    setTimeout(async () => {
      try {
        const res = await CsvImportService.generateAccounts(targetType, ids);
        const { notifications } = await import('../models/schema');
        await db.insert(notifications).values({
          userId: user.id,
          title: 'Pembuatan Akun Massal Selesai',
          message: `Berhasil membuat ${res.successCount} akun. ${res.errors?.length ? `${res.errors.length} gagal.` : ''}`,
        });
      } catch (err: unknown) {
        const { notifications } = await import('../models/schema');
        await db.insert(notifications).values({
          userId: user.id,
          title: 'Gagal Membuat Akun Massal',
          message: err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat membuat akun massal.',
        });
      }
    }, 50);

    return {
      status: 'processing',
      message:
        'Proses pembuatan akun massal telah dimulai di latar belakang. Anda akan menerima notifikasi jika telah selesai.',
    };
  }
}
