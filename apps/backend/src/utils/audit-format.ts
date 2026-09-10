/**
 * Pure formatter helpers for audit logs.
 *
 * Kept free of database / framework dependencies so they can be unit-tested
 * in isolation. Used by `plugins/audit.plugin.ts`.
 */

/** Maps a URL module prefix to the physical database table name. */
export const MODULE_TABLE_MAP: Record<string, string> = {
  mahasiswa: 'mahasiswa',
  'mahasiswa-keluar': 'mahasiswa_keluar',
  dosen: 'dosen',
  'mata-kuliah': 'mata_kuliah',
  'kelas-kuliah': 'kelas_kuliah',
  'dosen-pengajar': 'dosen_pengajar_kelas',
  krs: 'krs',
  presensi: 'presensi',
  bap: 'bap',
  'bap-praktikum': 'bap_praktikum',
  'presensi-praktikum': 'presensi_praktikum',
  'rombel-praktikum': 'rombel_praktikum',
  'kompensasi-bayar': 'kompensasi_bayar',
  'kompensasi-manual': 'kompensasi_manual',
  pelanggaran: 'pelanggaran',
  'pasal-pelanggaran': 'pasal_pelanggaran',
  'kelompok-apel': 'kelompok_apel',
  'sesi-apel': 'sesi_apel',
  'presensi-apel': 'presensi_apel',
  bimbingan: 'bimbingan',
  'kategori-bimbingan': 'kategori_bimbingan',
  'nilai-praktik': 'nilai_praktik',
  'komponen-nilai': 'komponen_nilai',
  tagihan: 'tagihan',
  'transaksi-pembayaran': 'transaksi_pembayaran',
  'pengajuan-cuti': 'pengajuan_cuti',
  'pengajuan-yudisium': 'pengajuan_yudisium',
  kurikulum: 'kurikulum',
  'kurikulum-mata-kuliah': 'kurikulum_mata_kuliah',
  'angkatan-kurikulum': 'angkatan_kurikulum',
  rps: 'rps',
  'rps-topik': 'rps_topik',
  'rencana-evaluasi': 'rencana_evaluasi',
  cpmk: 'cpmk',
  'sub-cpmk': 'sub_cpmk',
  cpl: 'cpl',
  'profil-lulusan': 'profil_lulusan',
  'bahan-kajian': 'bahan_kajian',
  'visi-misi-prodi': 'visi_misi_prodi',
  'program-studi': 'program_studi',
  'periode-akademik': 'periode_akademik',
  users: 'users',
  user: 'users',
  'user-roles': 'user_roles',
  'role-permissions': 'role_permissions',
  'audit-logs': 'audit_logs',
  notifications: 'notifications',
  feedback: 'feedback',
  'evaluasi-kurikulum': 'evaluasi_kurikulum',
  'evaluasi-sistem': 'evaluasi_sistem',
  'system-parameters': 'konfigurasi_sistem',
  settings: 'konfigurasi_sistem',
  pddikti: 'pddikti',
  admisi: 'pendaftar',
};

/**
 * Resolves the physical table name for a URL module prefix.
 * Falls back to a normalized (snake_case) version of the module.
 */
export function resolveTableName(module: string): string {
  if (!module) return 'unknown';
  const mapped = MODULE_TABLE_MAP[module];
  if (mapped) return mapped;
  return module.replace(/-/g, '_');
}

const ACTION_VERB: Record<string, string> = {
  CREATE: 'tambah',
  UPDATE: 'update',
  DELETE: 'delete',
};

export interface DescriptionInput {
  /** Pre-formatted `YYYY-MM-DD HH:mm:ss` in app timezone. */
  waktu: string;
  userName?: string | null;
  userRole?: string | null;
  actionType: string;
  tableName: string;
  recordId?: string | null;
}

/**
 * Builds the required description format:
 * `[waktu:datetime] [user] melakukan [tambah/update/delete] data pada tabel [nama_table] record id [record_id].`
 *
 * For non-mutation actions (LOGIN/LOGOUT) a human-readable fallback is returned.
 */
export function formatDescription(input: DescriptionInput): string {
  const user = formatAuditUser(input.userName, input.userRole);
  const verb = ACTION_VERB[input.actionType];

  if (!verb) {
    if (input.actionType === 'LOGIN') return `${user} masuk (login)`;
    if (input.actionType === 'LOGOUT') return `${user} keluar (logout)`;
    return `[${input.waktu}] ${user} melakukan aksi ${input.actionType} pada tabel ${input.tableName}.`;
  }

  const record = input.recordId ? ` record id ${input.recordId}` : '';
  return `[${input.waktu}] ${user} melakukan ${verb} data pada tabel ${input.tableName}${record}.`;
}

export interface DetailInput {
  module: string;
  url: string;
  parts: Array<string | null | undefined>;
}

/**
 * Builds the required detail format:
 * `Modul [modul/fitur] url [url]. Entitas yang terdampak: [NIM] [Nama Mahasiswa] [User] [Prodi] [Mata Kuliah]`
 *
 * Empty parts are skipped (never rendered as `-`).
 */
export function formatDetail(input: DetailInput): string {
  const affected = input.parts.map((p) => (p == null ? '' : String(p).trim())).filter((p) => p.length > 0);
  const base = `Modul ${input.module} url ${input.url}.`;
  if (affected.length === 0) return base;
  return `${base} Entitas yang terdampak: ${affected.join(' ')}`;
}

/** Renders `name (role)` when a role is present, otherwise just the name. */
export function formatAuditUser(userName?: string | null, userRole?: string | null): string {
  const name = userName?.trim() || 'Sistem';
  const role = userRole?.trim();
  return role ? `${name} (${role})` : name;
}

/** Formats a Date into `YYYY-MM-DD HH:mm:ss` in the given timezone. */
export function formatAuditDateTime(date: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}
