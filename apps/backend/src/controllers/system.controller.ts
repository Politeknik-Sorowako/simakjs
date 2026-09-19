import { sql } from 'drizzle-orm';
import { systemSettings } from '../models/schema';
import { ChangelogService } from '../services/changelog.service';
import { SystemParameterService } from '../services/system-parameter.service';
import { VersionService } from '../services/version.service';
import { db } from '../utils/db';
import { isSuperAdminOrAdmin } from '../utils/role';
import { AuthContext } from '../utils/types';

export class SystemController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getVersion({ query }: AuthContext): Promise<any> {
    const env = (query as Record<string, unknown>)?.env as string | undefined;
    const info = VersionService.readFromFile(env);
    const defaults = SystemParameterService.descriptions();
    return { ...info, parameters: defaults };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getChangelog(): Promise<any> {
    const sections = ChangelogService.getSections();
    return { sections };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getParameters({ set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!isSuperAdminOrAdmin(user)) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin atau Super Admin.' };
    }
    const rows = await SystemParameterService.getAll();
    const defaults = SystemParameterService.descriptions();
    const meta = rows.map((r) => ({
      key: r.key,
      value: r.value,
      paramType: r.paramType || 'string',
      description: r.description || defaults[r.key]?.description || '',
      defaultValue: defaults[r.key]?.defaultValue ?? '',
      updatedAt: r.updatedAt,
      updatedBy: r.updatedBy ?? null,
    }));
    return { data: meta };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async updateParameter({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!isSuperAdminOrAdmin(user)) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin atau Super Admin.' };
    }
    const key = (params as Record<string, unknown>)?.key as string;
    let value = ((body as Record<string, unknown>)?.value as string) ?? null;
    const description = ((body as Record<string, unknown>)?.description as string) ?? undefined;
    if (!key || value === null || value === undefined) {
      set.status = 400;
      return { error: 'key dan value wajib diisi' };
    }
    if (!/^[A-Z0-9_]+$/.test(key)) {
      set.status = 400;
      return { error: 'key hanya boleh mengandung huruf besar, angka, dan underscore' };
    }
    if (key === 'SESSION_DURATION_MINUTES') {
      const minutes = Number(value);
      if (!Number.isFinite(minutes) || minutes < 15 || minutes > 10080) {
        set.status = 400;
        return { error: 'Durasi sesi harus berupa angka antara 15 dan 10080 menit' };
      }
      value = String(Math.floor(minutes));
    }
    if (key === 'SESSION_EPOCH') {
      set.status = 400;
      return { error: 'SESSION_EPOCH hanya boleh dinaikkan via endpoint paksa logout' };
    }
    try {
      const row = await SystemParameterService.set(key, String(value), user.id, description);
      return { key: row.key, value: row.value };
    } catch (e: unknown) {
      set.status = 500;
      return { error: e instanceof Error ? e.message : 'Gagal memperbarui parameter' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async bumpSessionEpoch({ set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!isSuperAdminOrAdmin(user)) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin atau Super Admin.' };
    }
    const epoch = await SystemParameterService.incrementSessionEpoch();
    set.status = 200;
    return { message: `Semua sesi pengguna dipaksa logout. Epoch sesi sekarang: ${epoch}`, sessionEpoch: epoch };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getSettings({ set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!isSuperAdminOrAdmin(user)) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin atau Super Admin.' };
    }
    const rows = await db
      .select({
        key: systemSettings.key,
        value: systemSettings.value,
        paramType: systemSettings.paramType,
        description: systemSettings.description,
      })
      .from(systemSettings)
      .orderBy(systemSettings.key);
    return { data: rows };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async health({ set, getCurrentUser }: AuthContext): Promise<any> {
    const dbOk = await db
      .execute(sql`SELECT 1`)
      .then(() => true)
      .catch(() => false);
    return {
      status: dbOk ? 'ok' : 'degraded',
      database: dbOk ? 'connected' : 'unreachable',
      cache: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
