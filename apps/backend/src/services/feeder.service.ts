import crypto from 'crypto';
import { type FeederConfig, SystemParameterService } from './system-parameter.service';

/**
 * Klien Web Service Neo Feeder PDDIKTI (`ws/live2.php`).
 *
 * Protokol: setiap permintaan adalah POST JSON dengan field `act`. Autentikasi
 * memakai `GetToken` (sekali) lalu token diikutkan pada setiap panggilan `act`
 * berikutnya. Token di-cache ±20 menit per kombinasi url+username+password.
 */

interface FeederEnvelope {
  error_code?: number | string;
  error_desc?: string;
  data?: unknown;
}

export interface FeederConnectionResult {
  ok: boolean;
  url: string;
  username: string;
  latencyMs: number;
  profilKode?: string;
  profilNama?: string;
  error?: string;
  checkedAt: string;
}

export interface FeederTestOverride {
  url?: string;
  username?: string;
  password?: string;
}

const TOKEN_TTL_MS = 20 * 60 * 1000;
const TOKEN_CACHE_MAX = 20;
const tokenCache = new Map<string, { token: string; at: number }>();

export class FeederService {
  /** Kunci cache token — hash agar password tidak tersimpan mentah di kunci Map. */
  private static cacheKey(config: FeederConfig): string {
    return crypto
      .createHash('sha256')
      .update(`${config.url}|${config.username}|${config.password}`)
      .digest('hex')
      .slice(0, 32);
  }

  private static async post(config: FeederConfig, body: Record<string, unknown>): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const res = await fetch(config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Server Feeder membalas HTTP ${res.status}`);
      }
      const text = await res.text();
      if (!text.trim()) throw new Error('Server Feeder membalas respons kosong');
      try {
        return JSON.parse(text);
      } catch {
        throw new Error('Respons server Feeder bukan JSON yang valid (periksa alamat live2.php)');
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error(`Koneksi ke Feeder timeout setelah ${config.timeoutMs} ms`);
      }
      throw e instanceof Error ? e : new Error('Gagal menghubungi server Feeder');
    } finally {
      clearTimeout(timer);
    }
  }

  private static unwrap(json: unknown, act: string): unknown {
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      throw new Error(`Respons Feeder untuk ${act} tidak valid`);
    }
    const env = json as FeederEnvelope;
    const code = Number(env.error_code ?? 0);
    if (Number.isFinite(code) && code !== 0) {
      const desc = typeof env.error_desc === 'string' && env.error_desc.trim() ? env.error_desc.trim() : `kode ${code}`;
      throw new Error(`Feeder menolak ${act}: ${desc}`);
    }
    return env.data;
  }

  /** Ambil token sesi (di-cache ±20 menit per kombinasi url+username+password). */
  static async getToken(config: FeederConfig, force = false): Promise<string> {
    const key = FeederService.cacheKey(config);
    const cached = tokenCache.get(key);
    if (!force && cached && Date.now() - cached.at < TOKEN_TTL_MS) {
      return cached.token;
    }
    const data = FeederService.unwrap(
      await FeederService.post(config, { act: 'GetToken', username: config.username, password: config.password }),
      'GetToken',
    );
    let token = '';
    if (typeof data === 'string') {
      token = data;
    } else if (data && typeof data === 'object' && typeof (data as Record<string, unknown>).token === 'string') {
      token = (data as Record<string, unknown>).token as string;
    }
    if (!token) throw new Error('Feeder tidak mengembalikan token (periksa username/password)');
    if (tokenCache.size >= TOKEN_CACHE_MAX) tokenCache.clear();
    tokenCache.set(key, { token, at: Date.now() });
    return token;
  }

  private static async callWithToken(
    config: FeederConfig,
    act: string,
    token: string,
    extra: Record<string, unknown>,
  ): Promise<unknown> {
    return FeederService.unwrap(
      await FeederService.post(config, {
        act,
        token,
        filter: '',
        order: '',
        limit: config.pageSize,
        offset: 0,
        ...extra,
      }),
      act,
    );
  }

  /** Panggil sebuah `act` Feeder; token kedaluwarsa di-refresh otomatis sekali. */
  static async request<T = unknown>(
    config: FeederConfig,
    act: string,
    extra: Record<string, unknown> = {},
  ): Promise<T> {
    let token = await FeederService.getToken(config);
    try {
      return (await FeederService.callWithToken(config, act, token, extra)) as T;
    } catch (e: unknown) {
      if (e instanceof Error && /token/i.test(e.message)) {
        token = await FeederService.getToken(config, true);
        return (await FeederService.callWithToken(config, act, token, extra)) as T;
      }
      throw e;
    }
  }

  private static pickString(value: unknown, keys: string[]): string | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const obj = value as Record<string, unknown>;
    for (const key of keys) {
      const v = obj[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
      if (typeof v === 'number') return String(v);
    }
    return undefined;
  }

  /**
   * Uji koneksi: ambil token lalu panggil `GetProfilPT` untuk memvalidasi
   * kredensial & alamat. Nilai override (bila dikirim) menimpa konfigurasi
   * tersimpan agar admin dapat mengetes sebelum menyimpan.
   */
  static async testConnection(override?: FeederTestOverride): Promise<FeederConnectionResult> {
    const stored = await SystemParameterService.getFeederConfig();
    const config: FeederConfig = {
      ...stored,
      url: override?.url?.trim() || stored.url,
      username: override?.username?.trim() || stored.username,
      password: override?.password && override.password.length > 0 ? override.password : stored.password,
    };

    const base: FeederConnectionResult = {
      ok: false,
      url: config.url,
      username: config.username,
      latencyMs: 0,
      checkedAt: new Date().toISOString(),
    };

    // Override URL dari request wajib memakai skema http(s) (mencegah fetch skema
    // non-HTTP). Host tetap tidak dibatasi — endpoint ini khusus admin/super_admin.
    if (override?.url?.trim() && !/^https?:\/\/\S+$/i.test(config.url)) {
      return { ...base, error: 'Alamat Feeder harus berupa URL http(s) yang valid' };
    }

    if (!config.url || !config.username || !config.password) {
      return {
        ...base,
        error: 'Konfigurasi Feeder belum lengkap. Isi alamat, username, dan password terlebih dahulu.',
      };
    }

    const started = Date.now();
    try {
      const data = await FeederService.request<unknown>(config, 'GetProfilPT');
      const row = Array.isArray(data) ? data[0] : data;
      return {
        ...base,
        ok: true,
        latencyMs: Date.now() - started,
        profilKode: FeederService.pickString(row, ['kode_perguruan_tinggi', 'kode_pt', 'id_perguruan_tinggi']),
        profilNama: FeederService.pickString(row, ['nama_perguruan_tinggi', 'nama_pt']),
      };
    } catch (e: unknown) {
      return {
        ...base,
        latencyMs: Date.now() - started,
        error: e instanceof Error ? e.message : 'Gagal menghubungi Feeder',
      };
    }
  }

  /** Bersihkan cache token (mis. setelah kredensial berubah). */
  static clearTokenCache(): void {
    tokenCache.clear();
  }
}
