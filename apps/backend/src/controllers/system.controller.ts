import { sql } from 'drizzle-orm';
import { systemSettings } from '../models/schema';
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
  static async getParameters({ set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !isSuperAdminOrAdmin(user)) {
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
    if (!user || !isSuperAdminOrAdmin(user)) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin atau Super Admin.' };
    }
    const key = (params as Record<string, unknown>)?.key as string;
    const value = ((body as Record<string, unknown>)?.value as string) ?? null;
    const description = ((body as Record<string, unknown>)?.description as string) ?? undefined;
    if (!key || value === null || value === undefined) {
      set.status = 400;
      return { error: 'key dan value wajib diisi' };
    }
    if (!/^[A-Z0-9_]+$/.test(key)) {
      set.status = 400;
      return { error: 'key hanya boleh mengandung huruf besar, angka, dan underscore' };
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
  static async getSettings({ set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !isSuperAdminOrAdmin(user)) {
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
