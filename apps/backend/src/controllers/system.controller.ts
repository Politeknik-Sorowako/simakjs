import { sql } from 'drizzle-orm';
import { systemSettings } from '../models/schema';
import { ChangelogService } from '../services/changelog.service';
import { SECRET_PARAM_KEYS, SystemParameterService } from '../services/system-parameter.service';
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
  static async getRegistrationStatus(): Promise<any> {
    const enabled = await SystemParameterService.isRegistrationEnabled();
    return { enabled };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getLoginTurnstileStatus(): Promise<any> {
    const enabled = await SystemParameterService.isLoginTurnstileEnabled();
    return { enabled };
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
    const byKey = new Map(rows.map((r) => [r.key, r]));
    // Tampilkan SEMUA parameter terdefinisi (nilai default bila baris DB belum
    // ada) agar admin dapat mengubahnya tanpa penyemaian migrasi manual.
    const meta = Object.entries(defaults)
      .map(([key, def]) => {
        const r = byKey.get(key);
        return {
          key,
          value: r?.value ?? def.defaultValue,
          paramType: r?.paramType || def.type || 'string',
          description: r?.description || def.description || '',
          defaultValue: def.defaultValue ?? '',
          updatedAt: r?.updatedAt ?? null,
          updatedBy: r?.updatedBy ?? null,
        };
      })
      .sort((a, b) => a.key.localeCompare(b.key));
    // Baris DB yang tidak terdaftar di DEFAULT_PARAMS tetap disertakan (defensif).
    for (const r of rows) {
      if (defaults[r.key]) continue;
      meta.push({
        key: r.key,
        value: r.value,
        paramType: r.paramType || 'string',
        description: r.description || '',
        defaultValue: '',
        updatedAt: r.updatedAt,
        updatedBy: r.updatedBy ?? null,
      });
    }
    // Parameter rahasia (mis. password Feeder) tidak pernah dikembalikan mentah —
    // hanya menandai apakah nilainya sudah terisi (`hasValue`).
    const data = meta.map((m) =>
      SECRET_PARAM_KEYS.has(m.key)
        ? { ...m, value: '', hasValue: String(m.value ?? '').length > 0, masked: true }
        : { ...m, masked: false },
    );
    return { data };
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
    const value = ((body as Record<string, unknown>)?.value as string) ?? null;
    const description = ((body as Record<string, unknown>)?.description as string) ?? undefined;
    if (!key || value === null || value === undefined) {
      set.status = 400;
      return { error: 'key dan value wajib diisi' };
    }
    if (!/^[A-Za-z0-9_]+$/.test(key)) {
      set.status = 400;
      return { error: 'key hanya boleh mengandung huruf, angka, dan underscore' };
    }
    // Validasi & normalisasi bersama dengan legacy `PUT /settings`.
    const validated = SystemParameterService.validateParamValue(key, String(value));
    if (!validated.ok) {
      set.status = 400;
      return { error: validated.error };
    }
    if (validated.keepExisting) {
      // Password rahasia dikosongkan → pertahankan nilai tersimpan (tak ditimpa).
      return { key, value: '' };
    }
    try {
      const row = await SystemParameterService.set(key, validated.value, user.id, description);
      return { key: row.key, value: SECRET_PARAM_KEYS.has(key) ? '' : row.value };
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
    const data = rows.map((r) =>
      SECRET_PARAM_KEYS.has(r.key)
        ? { ...r, value: '', hasValue: String(r.value ?? '').length > 0, masked: true }
        : { ...r, masked: false },
    );
    return { data };
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
