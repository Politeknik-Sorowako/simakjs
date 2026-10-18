import { FeederService } from '../services/feeder.service';
import { type ConflictResolution, FeederPullService, type PullEntityKey } from '../services/feeder-pull.service';
import { PddiktiService } from '../services/pddikti.service';
import { SystemParameterService } from '../services/system-parameter.service';
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

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getPullEntities({ getCurrentUser, set }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['super_admin', 'admin', 'prodi', 'dosen'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin, Prodi, atau Dosen.' };
    }
    const writeGuard = await SystemParameterService.isFeederWriteGuardEnabled();
    return {
      writeGuard,
      entities: [...FeederPullService.getCatalog()],
    };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getPullPreview({ query, getCurrentUser, set }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['super_admin', 'admin', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin, Super Admin, atau Prodi.' };
    }
    const rawQuery = (query ?? {}) as Record<string, unknown>;
    const entity = typeof rawQuery.entity === 'string' ? (rawQuery.entity as PullEntityKey) : undefined;
    const filter = typeof rawQuery.filter === 'string' ? rawQuery.filter : undefined;
    if (!entity || !FeederPullService.getEntityMeta(entity)) {
      set.status = 400;
      return { error: 'Entitas pull tidak valid' };
    }
    try {
      return await FeederPullService.preview(entity, { filter });
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal menarik preview dari Feeder' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async applyPull({ body, getCurrentUser, set }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!isSuperAdminOrAdmin(user)) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin atau Super Admin yang dapat menerapkan data Feeder ke lokal.' };
    }
    const raw = (body ?? {}) as Record<string, unknown>;
    const entity = typeof raw.entity === 'string' ? (raw.entity as PullEntityKey) : undefined;
    const feederIds = Array.isArray(raw.feederIds)
      ? raw.feederIds.filter((x): x is string => typeof x === 'string')
      : [];
    const conflictResolution: ConflictResolution = raw.conflictResolution === 'feeder' ? 'feeder' : 'lokal';
    const filter = typeof raw.filter === 'string' ? raw.filter : undefined;

    if (!entity || !FeederPullService.getEntityMeta(entity)) {
      set.status = 400;
      return { error: 'Entitas pull tidak valid' };
    }
    try {
      // `appliedByUserId` dipakai entitas yang mewajibkan kolom created_by
      // (mis. aktivitas MBKM hasil pull).
      return await FeederPullService.apply(entity, feederIds, conflictResolution, {
        filter,
        appliedByUserId: user.id,
      });
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal menerapkan data Feeder ke lokal' };
    }
  }
}
