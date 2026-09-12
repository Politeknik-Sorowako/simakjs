import { eq } from 'drizzle-orm';
import { systemSettings } from '../models/schema';
import { db } from '../utils/db';

const cache = new Map<string, { value: string; at: number }>();
const CACHE_TTL_MS = 10_000;

type ParamType = 'string' | 'number' | 'boolean';

const DEFAULT_PARAMS: Record<string, { value: string; type: ParamType; description: string }> = {
  TIMEZONE: {
    value: 'Asia/Makassar',
    type: 'string',
    description: 'Zona waktu aplikasi (misal: Asia/Makassar [WITA], Asia/Jakarta [WIB], Asia/Jayapura [WIT], UTC)',
  },
  DURASI_HARIAN_MENIT: { value: '480', type: 'number', description: 'Durasi harian kompensasi dalam menit (8 jam)' },
  PENGALI_DENDA_MANGKIR: { value: '5', type: 'number', description: 'Pengali denda Alpa/Terlambat/Rusak' },
  PENGALI_DENDA_IZIN_SAKIT: { value: '1', type: 'number', description: 'Pengali denda Izin/Sakit' },
  AMBANG_SP1_MENIT: { value: '1152', type: 'number', description: 'Ambang Surat Peringatan 1 (24 jam)' },
  AMBANG_SP2_MENIT: { value: '1920', type: 'number', description: 'Ambang Surat Peringatan 2 (40 jam)' },
  AMBANG_SP3_MENIT: { value: '2304', type: 'number', description: 'Ambang Surat Peringatan 3 (48 jam)' },
  LOCK_KARTU_UJIAN_JIKA_KOMPEN: {
    value: 'false',
    type: 'boolean',
    description: 'Kunci kartu ujian jika ada tanggungan kompensasi',
  },
  KRS_MANDIRI_ENABLED: {
    value: 'true',
    type: 'boolean',
    description: 'Izinkan mahasiswa melakukan pengisian KRS secara mandiri',
  },
  MAX_BIMBINGAN_ATTACHMENT_MB: {
    value: '2',
    type: 'number',
    description: 'Batas maksimal ukuran lampiran bimbingan dalam MB (default 2 MB)',
  },
};

export class SystemParameterService {
  private static invalidate(key?: string) {
    if (key) {
      cache.delete(key);
      return;
    }
    cache.clear();
  }

  static async getRaw(key: string): Promise<string | null> {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return cached.value;
    }
    try {
      const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
      if (!row) {
        const def = DEFAULT_PARAMS[key];
        if (def) return def.value;
        return null;
      }
      cache.set(key, { value: row.value, at: Date.now() });
      return row.value;
    } catch {
      // Tabel opsional belum tersedia atau query gagal: gunakan default agar path
      // yang bergantung pada parameter (mis. audit log) tidak ikut gagal.
      const def = DEFAULT_PARAMS[key];
      return def ? def.value : null;
    }
  }

  static async getNumber(key: string): Promise<number> {
    const raw = await SystemParameterService.getRaw(key);
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  static async getBoolean(key: string): Promise<boolean> {
    const raw = await SystemParameterService.getRaw(key);
    return raw === 'true' || raw === '1';
  }

  static async getTimezone(): Promise<string> {
    return (await SystemParameterService.getRaw('TIMEZONE')) || 'Asia/Makassar';
  }

  static async isKrsMandiriEnabled(): Promise<boolean> {
    const raw = await SystemParameterService.getRaw('KRS_MANDIRI_ENABLED');
    if (raw === null || raw === '') return true;
    return raw === 'true' || raw === '1';
  }

  static async getAll() {
    return await db.select().from(systemSettings).orderBy(systemSettings.key);
  }

  static async set(key: string, value: string, updatedBy?: number, description?: string) {
    const type: ParamType = DEFAULT_PARAMS[key]?.type ?? 'string';
    const [row] = await db
      .insert(systemSettings)
      .values({ key, value, description, updatedBy, paramType: type })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value, updatedBy, description, updatedAt: new Date() },
      })
      .returning();
    SystemParameterService.invalidate(key);
    return row;
  }

  static descriptions(): Record<string, { type: ParamType; description: string; defaultValue: string }> {
    const out: Record<string, { type: ParamType; description: string; defaultValue: string }> = {};
    for (const [k, v] of Object.entries(DEFAULT_PARAMS)) {
      out[k] = { type: v.type, description: v.description, defaultValue: v.value };
    }
    return out;
  }

  static defaults() {
    return DEFAULT_PARAMS;
  }
}
