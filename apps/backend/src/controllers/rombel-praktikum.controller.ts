import { RombelPraktikumService } from '../services/rombel-praktikum.service';
import type { AuthContext } from '../utils/types';

// biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
function allowed(user: any, roles: string[]) {
  if (!user) return false;
  return roles.includes(user.role);
}

export class RombelPraktikumController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getByKelas({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      return await RombelPraktikumService.getByKelas(parseInt(params.kelasKuliahId));
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async createRombel({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'super_admin', 'dosen', 'prodi'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await RombelPraktikumService.createRombel(body);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async updateRombel({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'super_admin', 'dosen', 'prodi'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await RombelPraktikumService.updateRombel(parseInt(params.id), body);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async deleteRombel({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'super_admin', 'dosen', 'prodi'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await RombelPraktikumService.deleteRombel(parseInt(params.id));
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async assignMahasiswa({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'super_admin', 'dosen', 'prodi'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      await RombelPraktikumService.assignMahasiswa(parseInt(params.id), body.mahasiswaIds || []);
      return { success: true };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getBapByRombel({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      return await RombelPraktikumService.getBapByRombel(parseInt(params.rombelId));
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async createBap({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'super_admin', 'dosen', 'prodi'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await RombelPraktikumService.createBap(body);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async updateBap({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'super_admin', 'dosen', 'prodi'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await RombelPraktikumService.updateBap(parseInt(params.id), body);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async savePresensiBulk({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'super_admin', 'dosen', 'prodi'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      await RombelPraktikumService.savePresensiBulk(body.bapPraktikumId, body.presensiList || []);
      return { success: true };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getPresensiByBap({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      return await RombelPraktikumService.getPresensiByBap(parseInt(params.bapPraktikumId));
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async syncPresensi({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'super_admin', 'dosen', 'prodi'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await RombelPraktikumService.syncPresensiPraktikumToKelas(body.bapPraktikumId);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async syncNilai({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'super_admin', 'dosen', 'prodi'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await RombelPraktikumService.syncNilaiPraktikumToKelas(parseInt(params.id));
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }
}
