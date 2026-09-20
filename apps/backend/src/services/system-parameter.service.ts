import { eq, sql } from 'drizzle-orm';
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
  REGISTRATION_ENABLED: {
    value: 'true',
    type: 'boolean',
    description: 'Izinkan pendaftaran akun baru melalui halaman login (register)',
  },
  BLOCK_KHS_JIKA_TANGGUNGAN: {
    value: 'true',
    type: 'boolean',
    description: 'Blokir akses KHS mahasiswa jika masih memiliki tunggakan SPP/kompensasi',
  },
  SKS_MIN_D3: {
    value: '108',
    type: 'number',
    description: 'Batas minimal total SKS kelulusan kurikulum jenjang D3 (BPA Pasal Kurikulum Blok)',
  },
  SKS_MIN_D4: {
    value: '144',
    type: 'number',
    description: 'Batas minimal total SKS kelulusan kurikulum jenjang D4/S1 Terapan (BPA Pasal Kurikulum Blok)',
  },
  BLOCK_KRS_JIKA_TANGGUNGAN: {
    value: 'false',
    type: 'boolean',
    description: 'Blokir pengisian KRS mandiri mahasiswa jika masih memiliki tunggakan SPP/kompensasi',
  },
  MAX_BIMBINGAN_ATTACHMENT_MB: {
    value: '2',
    type: 'number',
    description: 'Batas maksimal ukuran lampiran bimbingan dalam MB (default 2 MB)',
  },
  NILAI_SKALA_MAX: {
    value: '100',
    type: 'number',
    description: 'Skala maksimum nilai global yang berlaku (100 untuk 0-100, 10 untuk 0.00-10.00)',
  },
  SESSION_DURATION_MINUTES: {
    value: '480',
    type: 'number',
    description:
      'Durasi sesi login dalam menit (idle timeout). Sesi berakhir jika tidak ada aktivitas selama durasi ini. Berlaku untuk login/refresh token berikutnya.',
  },
  SESSION_EPOCH: {
    value: '1',
    type: 'number',
    description:
      'Epoch sesi (kill-switch). Menaikkan nilai ini memaksa semua pengguna login ulang: token yang dibubuhi sessEpoch lebih kecil dari nilai ini ditolak.',
  },
};

const SESSION_DURATION_MIN = 15;
const SESSION_DURATION_MAX = 10080;
const SESSION_DURATION_DEFAULT = 480;
const SESSION_EPOCH_DEFAULT = 1;

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

  /** Durasi sesi login (idle timeout) dalam menit, diklamp ke rentang 15–10080. */
  static async getSessionDurationMinutes(): Promise<number> {
    const raw = await SystemParameterService.getRaw('SESSION_DURATION_MINUTES');
    const parsed = Number(raw);
    if (raw === null || raw === '' || !Number.isFinite(parsed)) return SESSION_DURATION_DEFAULT;
    return Math.min(SESSION_DURATION_MAX, Math.max(SESSION_DURATION_MIN, Math.floor(parsed)));
  }

  /** Durasi sesi login (idle timeout) dalam detik, diklamp ke rentang 15–10080 menit. */
  static async getSessionDurationSeconds(): Promise<number> {
    return (await SystemParameterService.getSessionDurationMinutes()) * 60;
  }

  /** Epoch sesi saat ini (min 1). Token dengan sessEpoch < nilai ini ditolak. */
  static async getSessionEpoch(): Promise<number> {
    const raw = await SystemParameterService.getRaw('SESSION_EPOCH');
    const parsed = Number(raw);
    if (raw === null || raw === '' || !Number.isFinite(parsed)) return SESSION_EPOCH_DEFAULT;
    return Math.max(SESSION_EPOCH_DEFAULT, Math.floor(parsed));
  }

  /** Menaikkan epoch sesi (kill-switch) secara atomik dan mengembalikan nilai baru. */
  static async incrementSessionEpoch(): Promise<number> {
    // UPDATE atomik (row-lock Postgres) → aman terhadap bump konkuren.
    const [updated] = await db
      .update(systemSettings)
      .set({ value: sql`${systemSettings.value}::int + 1`, updatedAt: new Date() })
      .where(eq(systemSettings.key, 'SESSION_EPOCH'))
      .returning();
    SystemParameterService.invalidate('SESSION_EPOCH');
    if (updated) {
      const parsed = Number(updated.value);
      return Number.isFinite(parsed) ? Math.max(SESSION_EPOCH_DEFAULT, parsed) : SESSION_EPOCH_DEFAULT;
    }
    // Baris belum ada (mis. tabel test di-bersihkan) → insert default+1.
    const [inserted] = await db
      .insert(systemSettings)
      .values({
        key: 'SESSION_EPOCH',
        value: String(SESSION_EPOCH_DEFAULT + 1),
        paramType: 'number',
        description: DEFAULT_PARAMS.SESSION_EPOCH.description,
      })
      .onConflictDoNothing()
      .returning();
    const parsed = Number(inserted?.value);
    return Number.isFinite(parsed) ? Math.max(SESSION_EPOCH_DEFAULT, parsed) : SESSION_EPOCH_DEFAULT + 1;
  }

  static async isKrsMandiriEnabled(): Promise<boolean> {
    const raw = await SystemParameterService.getRaw('KRS_MANDIRI_ENABLED');
    if (raw === null || raw === '') return true;
    return raw === 'true' || raw === '1';
  }

  /** Registrasi akun baru via halaman login. Fail-open ke `true` (perilaku saat ini). */
  static async isRegistrationEnabled(): Promise<boolean> {
    const raw = await SystemParameterService.getRaw('REGISTRATION_ENABLED');
    if (raw === null || raw === '') return true;
    return raw === 'true' || raw === '1';
  }

  /** Blokir KHS saat ada tunggakan. Fail-open ke `true` (perilaku produksi saat ini). */
  static async isKhsBlockEnabled(): Promise<boolean> {
    const raw = await SystemParameterService.getRaw('BLOCK_KHS_JIKA_TANGGUNGAN');
    if (raw === null || raw === '') return true;
    return raw === 'true' || raw === '1';
  }

  /** Blokir KRS saat ada tunggakan. Fail-open ke `false` (opt-in, tidak memblokir massal). */
  static async isKrsBlockEnabled(): Promise<boolean> {
    const raw = await SystemParameterService.getRaw('BLOCK_KRS_JIKA_TANGGUNGAN');
    if (raw === null || raw === '') return false;
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
