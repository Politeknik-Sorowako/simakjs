import { eq, sql } from 'drizzle-orm';
import { systemSettings } from '../models/schema';
import { db } from '../utils/db';
import { decryptSecret, encryptSecret, isSecretEncrypted } from '../utils/secret-crypto';

/** Bentuk nilai parameter yang sudah tervalidasi, siap disimpan. */
export type ParamValueValidation =
  | { ok: true; value: string /** true = pertahankan nilai lama (mis. password dikosongkan) */; keepExisting?: boolean }
  | { ok: false; error: string };

const cache = new Map<string, { value: string; at: number }>();
const CACHE_TTL_MS = 10_000;

type ParamType = 'string' | 'number' | 'boolean';

/** Konfigurasi kop surat global semua dokumen cetak (kunci `surat_kop_global`). */
export interface KopSuratConfig {
  nama: string;
  alamat: string[];
  kontak: string;
  website: string;
  email: string;
  tampilkanLogo: boolean;
  /** true = memakai logo unggahan admin (storage/kop/logo.*); false = logo bawaan. */
  logoCustom: boolean;
}

/** Default kop global — desain standar kampus (lihat docs/015 §8b). */
export const DEFAULT_KOP_SURAT: KopSuratConfig = {
  nama: 'POLITEKNIK SOROWAKO',
  alamat: [
    'Jl. Sumantri Brojonegoro no. 1 Sorowako, Kode Pos 92984',
    'Kabupaten Luwu Timur – Propinsi Sulawesi Selatan',
  ],
  kontak: 'Telepon [021] 5249100 ext. 3816, 3818, 3819, 3820 • Fax [021] 5249589',
  website: 'https://www.politekniksorowako.ac.id',
  email: 'info@politekniksorowako.ac.id',
  tampilkanLogo: true,
  logoCustom: false,
};

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
  LOGIN_TURNSTILE_ENABLED: {
    value: 'false',
    type: 'boolean',
    description: 'Wajibkan verifikasi Cloudflare Turnstile pada halaman login (default nonaktif)',
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
  // Key mengikuti PRD SKPI §4.4/§9 (`skpi_min_kegiatan`), dibaca oleh SkpiService.getSyaratPenerbitan.
  skpi_min_kegiatan: {
    value: '1',
    type: 'number',
    description: 'Jumlah minimum kegiatan terverifikasi sebelum SKPI dapat diterbitkan',
  },
  // Nomor surat SKPI — kop/kontak memakai `surat_kop_global` (kunci di bawah).
  skpi_nomor_format: {
    value: 'SKPI/{tahun}/{nim}',
    type: 'string',
    description: 'Format nomor surat SKPI — placeholder {tahun} dan {nim} diganti otomatis',
  },
  // Kop surat GLOBAL semua dokumen (KHS, SKPI, BKD, KRS, Peringatan, dst) —
  // format sesuai desain standar kampus (logo kiri + blok info tengah + garis).
  // JSON string; divalidasi & di-merge oleh SystemParameterService.getKopSurat().
  surat_kop_global: {
    value: JSON.stringify(DEFAULT_KOP_SURAT),
    type: 'string',
    description: 'Kop surat global semua dokumen cetak (JSON: nama, alamat, kontak, website, email, logo)',
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
  // ─── Integrasi Neo Feeder PDDIKTI (Web Service live2.php) ─────────────────
  FEEDER_URL: {
    value: 'https://feeder.politekniksorowako.ac.id/ws/live2.php',
    type: 'string',
    description: 'Alamat Web Service Neo Feeder PDDIKTI (umumnya .../ws/live2.php)',
  },
  FEEDER_USERNAME: {
    value: 'darmawaty@politekniksorowako.ac.id',
    type: 'string',
    description: 'Username akun Web Service Neo Feeder PDDIKTI',
  },
  FEEDER_PASSWORD: {
    value: '',
    type: 'string',
    description:
      'Password akun Web Service Neo Feeder PDDIKTI (hanya tersimpan di server, tidak pernah ditampilkan kembali). Kosongkan saat menyimpan bila tidak ingin mengubah.',
  },
  FEEDER_TIMEOUT_MS: {
    value: '20000',
    type: 'number',
    description: 'Timeout permintaan ke Web Service Feeder dalam milidetik (5000–60000)',
  },
  FEEDER_PAGE_SIZE: {
    value: '200',
    type: 'number',
    description: 'Jumlah baris per halaman saat menarik data dari Feeder (50–500)',
  },
  FEEDER_AUTO_APPROVE_KRS: {
    value: 'false',
    type: 'boolean',
    description: 'Setujui otomatis KRS tertunda sebelum dikirim/diambil dari Feeder',
  },
  FEEDER_WRITE_GUARD: {
    value: 'true',
    type: 'boolean',
    description:
      'Blokir semua aksi tulis ke Feeder PDDIKTI (Insert/Update/Delete). Jika aktif (true), aplikasi hanya mengizinkan operasi baca (Get* / GetToken).',
  },
  // ─── Tindak Lanjut Pelanggaran & Pembinaan Mahasiswa (BPA) ─────────────
  SP_NOTIF_ADMIN_ENABLED: {
    value: 'true',
    type: 'boolean',
    description: 'Kirim notifikasi lonceng ke Admin untuk setiap pencatatan surat peringatan/pelanggaran baru',
  },
  SP_LV1_SEMESTER_T: {
    value: '1',
    type: 'number',
    description: 'Ambang batas T semester untuk Level 1: Coaching Mahasiswa (persetujuan Kaprodi)',
  },
  SP_LV2_SEMESTER_T: {
    value: '2',
    type: 'number',
    description:
      'Ambang batas T semester untuk Level 2: Coaching Mahasiswa (disetujui Kaprodi, Wadir 1, Wadir 3 disertai Pemanggilan Ortu)',
  },
  SP_LV2_AKUMULASI_T: {
    value: '5',
    type: 'number',
    description:
      'Ambang batas T akumulatif untuk Level 2: Coaching Mahasiswa (disetujui Kaprodi, Wadir 1, Wadir 3 disertai Pemanggilan Ortu)',
  },
  SP_LV3_SEMESTER_T: {
    value: '3',
    type: 'number',
    description:
      'Ambang batas T semester untuk Level 3: Coaching Mahasiswa (disetujui Kaprodi, Wadir 1, Wadir 3, Direktur)',
  },
  SP_LV3_AKUMULASI_T_LIST: {
    value: '6,8',
    type: 'string',
    description: 'Daftar nilai T akumulatif untuk Level 3 (dipisahkan tanda koma, misal: 6,8)',
  },
  SP_LV4_SEMESTER_T: {
    value: '4',
    type: 'number',
    description:
      'Ambang batas T semester untuk Level 4: Coaching Mahasiswa + Sidang Komisi Disiplin (disetujui Kaprodi, Wadir 1, Wadir 3, Direktur)',
  },
  SP_LV4_AKUMULASI_T_LIST: {
    value: '7,9',
    type: 'string',
    description:
      'Daftar nilai T akumulatif untuk Level 4: Coaching Mahasiswa + Sidang Komisi Disiplin (dipisahkan tanda koma, misal: 7,9)',
  },
};

/** Parameter yang nilainya bersifat rahasia (di-mask pada respons API). */
export const SECRET_PARAM_KEYS: ReadonlySet<string> = new Set(['FEEDER_PASSWORD']);

/**
 * Parameter yang HANYA dibaca dari environment server (`.env`), bukan dari
 * `system_settings`. Menulisnya lewat aplikasi tidak berkefek apa pun — kode
 * hanya melihat `process.env`. Selain itu, menyimpan kunci kriptografi di tabel
 * yang sama justru membatalkan gunanya: kunci untuk membuka data terenkripsi
 * harus berada di lapisan akses berbeda (pemilik OS/container), bukan di lapisan
 * data yang justru ingin dilindungi. Karena itu penulisan key ini DITOLAK
 * (400) pada `PUT /system/parameters/:key` maupun legacy `PUT /settings`,
 * supaya admin tidak sempat mengira nilai yang diabaikan tersebut aktif.
 */
export const ENV_ONLY_PARAM_KEYS: ReadonlySet<string> = new Set([
  // Kunci enkripsi parameter rahasia (PR #563)
  'SETTINGS_SECRET_KEY',
  // Autentikasi
  'JWT_SECRET',
  // Tanda tangan dokumen (QR signed-hash)
  'SIGN_HMAC_KEYS',
  'SIGN_ACTIVE_KID',
  'VERIFY_BASE_URL',
  // Integrasi pihak ketiga
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'TURNSTILE_SECRET_KEY',
  'GOOGLE_CLIENT_SECRET',
]);

/** Konfigurasi ter-resolve untuk integrasi Neo Feeder PDDIKTI. */
export interface FeederConfig {
  url: string;
  username: string;
  password: string;
  timeoutMs: number;
  pageSize: number;
  autoApproveKrs: boolean;
  /** Jika true (default fail-safe), semua mutasi ke Feeder (Insert/Update/Delete) diblokir. */
  writeGuard: boolean;
}

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

  /** Bersihkan cache parameter in-memory (mis. saat reset DB pengujian). */
  static clearCache(): void {
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
      // Parameter rahasia (atau nilai bertanda `enc:v1:`) didekripsi saat dibaca agar
      // seluruh consumer (Feeder, dst.) tetap menerima nilai asli.
      const plain = SECRET_PARAM_KEYS.has(key) || isSecretEncrypted(row.value) ? decryptSecret(row.value) : row.value;
      cache.set(key, { value: plain, at: Date.now() });
      return plain;
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

  /**
   * Konfigurasi kop surat global semua dokumen cetak. Di-merge dengan default
   * per field agar nilai korup/hilang tidak membuat kop kosong (fail-safe —
   * kop tampil di dokumen resmi).
   */
  static async getKopSurat(): Promise<KopSuratConfig> {
    const fallback: KopSuratConfig = { ...DEFAULT_KOP_SURAT, alamat: [...DEFAULT_KOP_SURAT.alamat] };
    const raw = await SystemParameterService.getRaw('surat_kop_global');
    if (!raw) return fallback;
    try {
      const p = JSON.parse(raw) as Partial<KopSuratConfig>;
      const str = (v: unknown, def: string, max: number) =>
        typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : def;
      const alamat = Array.isArray(p.alamat)
        ? p.alamat
            .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
            .map((a) => a.trim().slice(0, 200))
            .slice(0, 4)
        : fallback.alamat;
      return {
        nama: str(p.nama, fallback.nama, 120),
        alamat: alamat.length > 0 ? alamat : fallback.alamat,
        kontak: typeof p.kontak === 'string' ? p.kontak.trim().slice(0, 300) : fallback.kontak,
        website: str(p.website, fallback.website, 200),
        email: str(p.email, fallback.email, 200),
        tampilkanLogo: typeof p.tampilkanLogo === 'boolean' ? p.tampilkanLogo : true,
        logoCustom: typeof p.logoCustom === 'boolean' ? p.logoCustom : false,
      };
    } catch {
      return fallback;
    }
  }

  /**
   * Konfigurasi integrasi Neo Feeder PDDIKTI yang sudah di-resolve & di-clamp.
   * Nilai timeout/pageSize selalu dalam rentang aman meski baris DB korup.
   * `writeGuard` bersifat fail-safe: aktif (`true`) kecuali diset eksplisit `'false'` atau `'0'`.
   */
  static async getFeederConfig(): Promise<FeederConfig> {
    const [url, username, password, timeoutRaw, pageSizeRaw, autoApprove, writeGuardRaw] = await Promise.all([
      SystemParameterService.getRaw('FEEDER_URL'),
      SystemParameterService.getRaw('FEEDER_USERNAME'),
      SystemParameterService.getRaw('FEEDER_PASSWORD'),
      SystemParameterService.getRaw('FEEDER_TIMEOUT_MS'),
      SystemParameterService.getRaw('FEEDER_PAGE_SIZE'),
      SystemParameterService.getRaw('FEEDER_AUTO_APPROVE_KRS'),
      SystemParameterService.getRaw('FEEDER_WRITE_GUARD'),
    ]);
    const timeoutParsed = Number(timeoutRaw);
    const pageSizeParsed = Number(pageSizeRaw);
    const normalizedGuard = (writeGuardRaw ?? '').trim().toLowerCase();
    const writeGuard = normalizedGuard !== 'false' && normalizedGuard !== '0';
    return {
      url: (url ?? '').trim(),
      username: (username ?? '').trim(),
      password: password ?? '',
      timeoutMs: Number.isFinite(timeoutParsed) ? Math.min(60000, Math.max(5000, Math.floor(timeoutParsed))) : 20000,
      pageSize: Number.isFinite(pageSizeParsed) ? Math.min(500, Math.max(50, Math.floor(pageSizeParsed))) : 200,
      autoApproveKrs: autoApprove === 'true' || autoApprove === '1',
      writeGuard,
    };
  }

  /** Status guard tulis Feeder (fail-safe ke `true` bila belum diset/korup). */
  static async isFeederWriteGuardEnabled(): Promise<boolean> {
    const raw = await SystemParameterService.getRaw('FEEDER_WRITE_GUARD');
    const normalized = (raw ?? '').trim().toLowerCase();
    return normalized !== 'false' && normalized !== '0';
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

  /** Turnstile pada halaman login. Fail-close ke `false` (opt-in via admin). */
  static async isLoginTurnstileEnabled(): Promise<boolean> {
    const raw = await SystemParameterService.getRaw('LOGIN_TURNSTILE_ENABLED');
    if (raw === null || raw === '') return false;
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

  /**
   * Menyimpan parameter. Nilai bertanda rahasia (`SECRET_PARAM_KEYS`) dienkripsi
   * at-rest sebelum masuk DB (lihat `utils/secret-crypto.ts`). Nilai KOSONG untuk
   * parameter rahasia juga ditulis apa adanya (caller menangani makna "pertahankan
   * nilai lama" sebelum memanggil fungsi ini).
   */
  static async set(key: string, value: string, updatedBy?: number, description?: string) {
    const type: ParamType = DEFAULT_PARAMS[key]?.type ?? 'string';
    const stored = SECRET_PARAM_KEYS.has(key) && value !== '' ? encryptSecret(value) : value;
    const [row] = await db
      .insert(systemSettings)
      .values({ key, value: stored, description, updatedBy, paramType: type })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: stored, updatedBy, description, updatedAt: new Date() },
      })
      .returning();
    SystemParameterService.invalidate(key);
    return row;
  }

  /**
   * Validasi & normalisasi nilai parameter sebelum disimpan (dipakai bersama oleh
   * `PUT /system/parameters/:key` dan legacy `PUT /settings`). Mengembalikan
   * `{ ok: false, error }` bila nilai tidak sah.
   */
  static validateParamValue(key: string, rawValue: string): ParamValueValidation {
    const value = String(rawValue);
    // Kunci & kredensial yang hanya dibaca dari environment server tidak boleh
    // ditulis lewat aplikasi — nilai di tabel akan diabaikan dan dapat memberi
    // kesan aman yang palsu (lihat ENV_ONLY_PARAM_KEYS).
    if (ENV_ONLY_PARAM_KEYS.has(key)) {
      return {
        ok: false,
        error: `Parameter "${key}" hanya dapat diatur melalui environment server (.env) dan tidak dapat diubah dari aplikasi. Putuskan barisnya dari berkas .env lalu mulai ulang backend.`,
      };
    }
    if (key === 'SESSION_DURATION_MINUTES') {
      const minutes = Number(value);
      if (!Number.isFinite(minutes) || minutes < SESSION_DURATION_MIN || minutes > SESSION_DURATION_MAX) {
        return {
          ok: false,
          error: `Durasi sesi harus berupa angka antara ${SESSION_DURATION_MIN} dan ${SESSION_DURATION_MAX} menit`,
        };
      }
      return { ok: true, value: String(Math.floor(minutes)) };
    }
    if (key === 'SESSION_EPOCH') {
      return { ok: false, error: 'SESSION_EPOCH hanya boleh dinaikkan via endpoint paksa logout' };
    }
    if (key === 'FEEDER_URL') {
      const trimmed = value.trim();
      if (!/^https?:\/\/\S+$/i.test(trimmed)) {
        return { ok: false, error: 'Alamat Feeder harus berupa URL http(s) yang valid' };
      }
      if (trimmed.length > 500) {
        return { ok: false, error: 'Alamat Feeder terlalu panjang (maks 500 karakter)' };
      }
      return { ok: true, value: trimmed };
    }
    if (key === 'FEEDER_USERNAME') {
      const trimmed = value.trim();
      if (!trimmed) {
        return { ok: false, error: 'Username Feeder wajib diisi' };
      }
      if (trimmed.length > 200) {
        return { ok: false, error: 'Username Feeder terlalu panjang (maks 200 karakter)' };
      }
      return { ok: true, value: trimmed };
    }
    if (key === 'FEEDER_PASSWORD') {
      // Nilai kosong = pertahankan password lama (form tidak menampilkan nilai tersimpan).
      if (value.trim() === '') {
        return { ok: true, value: '', keepExisting: true };
      }
      if (value.length > 200) {
        return { ok: false, error: 'Password Feeder terlalu panjang (maks 200 karakter)' };
      }
      return { ok: true, value };
    }
    if (key === 'FEEDER_TIMEOUT_MS') {
      const ms = Number(value);
      if (!Number.isFinite(ms) || ms < 5000 || ms > 60000) {
        return { ok: false, error: 'Timeout Feeder harus berupa angka antara 5000 dan 60000 ms' };
      }
      return { ok: true, value: String(Math.floor(ms)) };
    }
    if (key === 'FEEDER_PAGE_SIZE') {
      const size = Number(value);
      if (!Number.isFinite(size) || size < 50 || size > 500) {
        return { ok: false, error: 'Page size Feeder harus berupa angka antara 50 dan 500' };
      }
      return { ok: true, value: String(Math.floor(size)) };
    }
    if (key === 'FEEDER_WRITE_GUARD' || key === 'FEEDER_AUTO_APPROVE_KRS') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') return { ok: true, value: 'true' };
      if (normalized === 'false') return { ok: true, value: 'false' };
      if (key === 'FEEDER_WRITE_GUARD') {
        return { ok: false, error: 'FEEDER_WRITE_GUARD harus bernilai true atau false' };
      }
      return { ok: false, error: 'FEEDER_AUTO_APPROVE_KRS harus bernilai true atau false' };
    }
    return { ok: true, value };
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
