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
    let value = ((body as Record<string, unknown>)?.value as string) ?? null;
    const description = ((body as Record<string, unknown>)?.description as string) ?? undefined;
    if (!key || value === null || value === undefined) {
      set.status = 400;
      return { error: 'key dan value wajib diisi' };
    }
    if (!/^[A-Za-z0-9_]+$/.test(key)) {
      set.status = 400;
      return { error: 'key hanya boleh mengandung huruf, angka, dan underscore' };
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
    if (key === 'FEEDER_URL') {
      const trimmed = value.trim();
      if (!/^https?:\/\/\S+$/i.test(trimmed)) {
        set.status = 400;
        return { error: 'Alamat Feeder harus berupa URL http(s) yang valid' };
      }
      if (trimmed.length > 500) {
        set.status = 400;
        return { error: 'Alamat Feeder terlalu panjang (maks 500 karakter)' };
      }
      value = trimmed;
    }
    if (key === 'FEEDER_USERNAME') {
      const trimmed = value.trim();
      if (!trimmed) {
        set.status = 400;
        return { error: 'Username Feeder wajib diisi' };
      }
      if (trimmed.length > 200) {
        set.status = 400;
        return { error: 'Username Feeder terlalu panjang (maks 200 karakter)' };
      }
      value = trimmed;
    }
    if (key === 'FEEDER_PASSWORD') {
      // Nilai kosong = pertahankan password lama (form tidak menampilkan nilai tersimpan).
      if (value.trim() === '') {
        return { key, value: '' };
      }
      if (value.length > 200) {
        set.status = 400;
        return { error: 'Password Feeder terlalu panjang (maks 200 karakter)' };
      }
    }
    if (key === 'FEEDER_TIMEOUT_MS') {
      const ms = Number(value);
      if (!Number.isFinite(ms) || ms < 5000 || ms > 60000) {
        set.status = 400;
        return { error: 'Timeout Feeder harus berupa angka antara 5000 dan 60000 ms' };
      }
      value = String(Math.floor(ms));
    }
    if (key === 'FEEDER_PAGE_SIZE') {
      const size = Number(value);
      if (!Number.isFinite(size) || size < 50 || size > 500) {
        set.status = 400;
        return { error: 'Page size Feeder harus berupa angka antara 50 dan 500' };
      }
      value = String(Math.floor(size));
    }
    try {
      const row = await SystemParameterService.set(key, String(value), user.id, description);
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
