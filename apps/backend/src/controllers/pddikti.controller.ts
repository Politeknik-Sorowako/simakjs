import { FeederService } from '../services/feeder.service';
import { PddiktiService } from '../services/pddikti.service';
import { hasRole, isSuperAdminOrAdmin } from '../utils/role';
import { AuthContext } from '../utils/types';

export class PddiktiController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getStats({ getCurrentUser, set }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['admin', 'dosen', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin, Prodi, atau Dosen.' };
    }
    return await PddiktiService.getStats();
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async syncAll({ getCurrentUser, set }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['admin', 'dosen', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin, Prodi, atau Dosen.' };
    }
    return await PddiktiService.syncAll();
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async testConnection({ body, getCurrentUser, set }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!isSuperAdminOrAdmin(user)) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin atau Super Admin.' };
    }
    const raw = (body ?? {}) as Record<string, unknown>;
    return await FeederService.testConnection({
      url: typeof raw.url === 'string' ? raw.url : undefined,
      username: typeof raw.username === 'string' ? raw.username : undefined,
      password: typeof raw.password === 'string' ? raw.password : undefined,
    });
  }
}
