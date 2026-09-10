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
  'visi-misi': 'visi_misi_prodi',
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
  'system-parameters': 'system_settings',
  settings: 'system_settings',
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

// ────────────────────────────────────────────────────────────────────────────
// Response summarization for bulk/import endpoints
// ────────────────────────────────────────────────────────────────────────────

export interface SummaryErrorItem {
  line: string | null;
  message: string;
}

export interface BulkSummary {
  kind: 'bulk';
  success: number;
  failed: number;
  skipped: number;
  total: number;
  errorCount: number;
  errors: SummaryErrorItem[];
}

export interface CountSummary {
  kind: 'count';
  count: number;
}

export interface ErrorSummary {
  kind: 'error';
  message: string;
}

export type ResponseSummary = BulkSummary | CountSummary | ErrorSummary;

const MAX_ERROR_ITEMS = 5;
const MAX_ERROR_MESSAGE = 300;

function toFiniteNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeErrorItem(raw: unknown): SummaryErrorItem | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const msg = raw.trim();
    return msg ? { line: null, message: msg.slice(0, MAX_ERROR_MESSAGE) } : null;
  }
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const lineVal = obj.line ?? obj.row ?? obj.baris;
    const msgVal = obj.error ?? obj.message ?? obj.pesan;
    if (typeof msgVal === 'string' && msgVal.trim().length > 0) {
      const line = lineVal == null ? null : String(lineVal);
      return { line, message: msgVal.trim().slice(0, MAX_ERROR_MESSAGE) };
    }
  }
  return null;
}

/**
 * Builds a small, safe summary of a mutation response payload.
 *
 * Only known safe fields are read (never the whole response), so sensitive keys
 * such as tokens/passwords/files are inherently excluded. Error arrays are
 * capped at MAX_ERROR_ITEMS — callers must NOT stringify the raw response.
 */
export function summarizeResponse(value: unknown): ResponseSummary | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;

  // Error form: `{ error: string }` (403/404/422 messages).
  if (typeof obj.error === 'string' && obj.error.trim().length > 0) {
    return { kind: 'error', message: obj.error.trim().slice(0, MAX_ERROR_MESSAGE) };
  }

  // Bulk form: `{ successCount|success|imported, skipped, failed, errors[] }`.
  const successRaw = obj.successCount ?? obj.success ?? obj.imported;
  const hasBulkSignal =
    successRaw != null || obj.failed != null || obj.skipped != null || obj.skippedCount != null || obj.errors != null;
  if (hasBulkSignal) {
    const errorArray = Array.isArray(obj.errors) ? (obj.errors as unknown[]) : [];
    const errorCount = errorArray.length;
    const errors: SummaryErrorItem[] = [];
    for (let i = 0; i < Math.min(errorArray.length, MAX_ERROR_ITEMS); i++) {
      const item = normalizeErrorItem(errorArray[i]);
      if (item) errors.push(item);
    }
    const success = toFiniteNumber(successRaw);
    const failed = Math.max(toFiniteNumber(obj.failed), errorCount);
    const skipped = toFiniteNumber(obj.skipped ?? obj.skippedCount);
    return {
      kind: 'bulk',
      success,
      failed,
      skipped,
      total: success + failed + skipped,
      errorCount,
      errors,
    };
  }

  // Count form: `{ count: number }` (bulk calc endpoints).
  if (typeof obj.count === 'number') {
    return { kind: 'count', count: obj.count };
  }

  return null;
}

/** Sentence appended to the description for bulk results. */
export function formatBulkSentence(summary: BulkSummary): string {
  return `Hasil: ${summary.success} sukses, ${summary.failed} gagal, ${summary.skipped} dilewati.`;
}

/** Human-readable one-liner for the detail column / modal. */
export function formatSummaryForDetail(summary: ResponseSummary): string | null {
  if (summary.kind === 'bulk') {
    let s = `${summary.success} sukses, ${summary.failed} gagal, ${summary.skipped} dilewati`;
    if (summary.errors.length > 0) {
      const first = summary.errors[0];
      const line = first.line ? ` (baris ${first.line})` : '';
      s += `. Contoh error: ${first.message}${line}`;
    }
    return s;
  }
  if (summary.kind === 'count') return `Dihitung: ${summary.count}`;
  if (summary.kind === 'error') return `Error: ${summary.message}`;
  return null;
}
