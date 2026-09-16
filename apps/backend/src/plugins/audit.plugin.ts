import { eq } from 'drizzle-orm';
import {
  bap,
  dosen,
  kelasKuliah,
  kelompokApel,
  kompensasiBayar,
  komponenNilai,
  krs,
  kurikulum,
  mahasiswa,
  mataKuliah,
  nilaiPraktik,
  pelanggaran,
  periodeAkademik,
  presensi,
  programStudi,
  rombelPraktikum,
  sesiApel,
  tagihan,
  users,
} from '../models/schema';
import { AuditService } from '../services/audit.service';
import { SystemParameterService } from '../services/system-parameter.service';
import {
  formatAuditDateTime,
  formatBulkSentence,
  formatDescription,
  formatDetail,
  formatSummaryForDetail,
  resolveTableName,
  summarizeResponse,
} from '../utils/audit-format';
import { db } from '../utils/db';

type EntityInfo = {
  entityId: string | null;
  entityName: string | null;
  tableName: string;
  /** Human-readable descriptors for the affected entity (NIM, Nama, Prodi, MK, ...). */
  parts: string[];
};

/**
 * Minimal hook context used by the audit handlers.
 * Registered inline on the root app (`.onBeforeHandle/.onAfterResponse`) because Elysia
 * does not propagate hooks declared inside a `.use()`d plugin to parent routes.
 */
export interface AuditHookContext {
  request: Request;
  set?: { status?: number | string };
  getCurrentUser?: () => Promise<{ id: number; nama: string; role: string; roles?: string[] } | null>;
  responseValue?: unknown;
}

const DEFAULT_TZ = 'Asia/Makassar';

// Cache resolved entity info per request (keyed by Request) so DELETE can resolve
// the entity name BEFORE the row is removed, and onAfterResponse can reuse it.
const entityCache = new WeakMap<Request, EntityInfo>();

function part(label: string, value: string | null | undefined): string | null {
  const v = value?.trim();
  return v ? `${label}: ${v}` : null;
}

function pushMhsParts(parts: string[], nim?: string | null, nama?: string | null, prodi?: string | null): void {
  const p1 = part('NIM', nim);
  const p2 = part('Nama', nama);
  const p3 = part('Prodi', prodi);
  if (p1) parts.push(p1);
  if (p2) parts.push(p2);
  if (p3) parts.push(p3);
}

function pushMkParts(parts: string[], nama?: string | null, kode?: string | null): void {
  const label = nama ? `${nama}${kode ? ` (${kode})` : ''}` : kode || null;
  const p = part('Mata Kuliah', label);
  if (p) parts.push(p);
}

/**
 * Resolves the affected entity (id + human-readable name + detail parts) for the
 * main entities. Returns generic info when the entity is not one of the known types.
 * Never throws — lookup failures fall back to generic info.
 */
async function resolveEntity(module: string, rawId: string | null): Promise<EntityInfo> {
  const tableName = resolveTableName(module);
  const base: EntityInfo = { entityId: rawId, entityName: null, tableName, parts: [] };

  if (!rawId || Number.isNaN(Number(rawId))) {
    return base;
  }
  const id = Number(rawId);

  try {
    if (module === 'mahasiswa') {
      const [row] = await db
        .select({
          nim: mahasiswa.nim,
          nama: mahasiswa.nama,
          prodi: programStudi.nama,
        })
        .from(mahasiswa)
        .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id))
        .where(eq(mahasiswa.id, id));
      if (!row) return base;
      const parts: string[] = [];
      pushMhsParts(parts, row.nim, row.nama, row.prodi);
      return { ...base, entityName: `${row.nama} (${row.nim})`, parts };
    }

    if (module === 'dosen') {
      const [row] = await db
        .select({ nip: dosen.nip, nama: dosen.nama, prodi: programStudi.nama })
        .from(dosen)
        .leftJoin(programStudi, eq(dosen.programStudiId, programStudi.id))
        .where(eq(dosen.id, id));
      if (!row) return base;
      const parts: string[] = [];
      const pNama = part('Nama', row.nama);
      const pNip = part('NIP', row.nip);
      const pProdi = part('Prodi', row.prodi);
      if (pNama) parts.push(pNama);
      if (pNip) parts.push(pNip);
      if (pProdi) parts.push(pProdi);
      return { ...base, entityName: `${row.nama} (${row.nip})`, parts };
    }

    if (module === 'mata-kuliah' || module === 'matakuliah') {
      const [row] = await db
        .select({ kode: mataKuliah.kode, nama: mataKuliah.nama, prodi: programStudi.nama })
        .from(mataKuliah)
        .leftJoin(programStudi, eq(mataKuliah.programStudiId, programStudi.id))
        .where(eq(mataKuliah.id, id));
      if (!row) return base;
      const parts: string[] = [];
      pushMkParts(parts, row.nama, row.kode);
      const pProdi = part('Prodi', row.prodi);
      if (pProdi) parts.push(pProdi);
      return { ...base, entityName: `${row.nama} (${row.kode})`, parts };
    }

    if (module === 'kelas-kuliah' || module === 'kelaskuliah') {
      const [row] = await db
        .select({ namaKelas: kelasKuliah.namaKelas, mkNama: mataKuliah.nama, mkKode: mataKuliah.kode })
        .from(kelasKuliah)
        .innerJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
        .where(eq(kelasKuliah.id, id));
      if (!row) return base;
      const parts: string[] = [];
      pushMkParts(parts, row.mkNama, row.mkKode);
      const pKelas = part('Kelas', row.namaKelas);
      if (pKelas) parts.push(pKelas);
      return { ...base, entityName: `${row.mkNama} - ${row.namaKelas}`, parts };
    }

    if (module === 'users' || module === 'user') {
      const [row] = await db.select({ nama: users.nama, email: users.email }).from(users).where(eq(users.id, id));
      if (!row) return base;
      const parts: string[] = [];
      const pUser = part('User', row.nama);
      const pEmail = part('Email', row.email);
      if (pUser) parts.push(pUser);
      if (pEmail) parts.push(pEmail);
      return { ...base, entityName: `${row.nama} (${row.email})`, parts };
    }

    if (module === 'program-studi' || module === 'prodi') {
      const [row] = await db
        .select({ nama: programStudi.nama, kode: programStudi.kode })
        .from(programStudi)
        .where(eq(programStudi.id, id));
      if (!row) return base;
      const parts: string[] = [];
      const pProdi = part('Prodi', row.nama);
      if (pProdi) parts.push(pProdi);
      return { ...base, entityName: `${row.nama} (${row.kode})`, parts };
    }

    if (module === 'krs') {
      const [row] = await db
        .select({
          nim: mahasiswa.nim,
          nama: mahasiswa.nama,
          prodi: programStudi.nama,
          mkNama: mataKuliah.nama,
          mkKode: mataKuliah.kode,
        })
        .from(krs)
        .innerJoin(mahasiswa, eq(krs.mahasiswaId, mahasiswa.id))
        .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id))
        .innerJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
        .innerJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
        .where(eq(krs.id, id));
      if (!row) return base;
      const parts: string[] = [];
      pushMhsParts(parts, row.nim, row.nama, row.prodi);
      pushMkParts(parts, row.mkNama, row.mkKode);
      return { ...base, entityName: `${row.nama} (${row.nim})`, parts };
    }

    if (module === 'presensi') {
      const [row] = await db
        .select({ nim: mahasiswa.nim, nama: mahasiswa.nama, prodi: programStudi.nama })
        .from(presensi)
        .innerJoin(mahasiswa, eq(presensi.mahasiswaId, mahasiswa.id))
        .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id))
        .where(eq(presensi.id, id));
      if (!row) return base;
      const parts: string[] = [];
      pushMhsParts(parts, row.nim, row.nama, row.prodi);
      return { ...base, entityName: `${row.nama} (${row.nim})`, parts };
    }

    if (module === 'bap') {
      const [row] = await db
        .select({
          namaKelas: kelasKuliah.namaKelas,
          mkNama: mataKuliah.nama,
          mkKode: mataKuliah.kode,
        })
        .from(bap)
        .innerJoin(kelasKuliah, eq(bap.kelasKuliahId, kelasKuliah.id))
        .innerJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
        .where(eq(bap.id, id));
      if (!row) return base;
      const parts: string[] = [];
      pushMkParts(parts, row.mkNama, row.mkKode);
      const pKelas = part('Kelas', row.namaKelas);
      if (pKelas) parts.push(pKelas);
      return { ...base, entityName: `${row.mkNama} (${row.namaKelas})`, parts };
    }

    if (module === 'pelanggaran') {
      const [row] = await db
        .select({ nim: mahasiswa.nim, nama: mahasiswa.nama, prodi: programStudi.nama })
        .from(pelanggaran)
        .innerJoin(mahasiswa, eq(pelanggaran.mahasiswaId, mahasiswa.id))
        .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id))
        .where(eq(pelanggaran.id, id));
      if (!row) return base;
      const parts: string[] = [];
      pushMhsParts(parts, row.nim, row.nama, row.prodi);
      return { ...base, entityName: `${row.nama} (${row.nim})`, parts };
    }

    if (module === 'tagihan') {
      const [row] = await db
        .select({
          nim: mahasiswa.nim,
          nama: mahasiswa.nama,
          nominal: tagihan.nominal,
          status: tagihan.status,
          periodeId: tagihan.periodeId,
        })
        .from(tagihan)
        .innerJoin(mahasiswa, eq(tagihan.mahasiswaId, mahasiswa.id))
        .where(eq(tagihan.id, id));
      if (!row) return base;
      const parts: string[] = [];
      pushMhsParts(parts, row.nim, row.nama);
      const pJenis = part('Jenis Tagihan', `SPP/UKT ${row.periodeId}`);
      const pStatus = part('Status Tagihan', row.status);
      const pNominal = part('Nominal', row.nominal != null ? `Rp ${row.nominal}` : null);
      if (pJenis) parts.push(pJenis);
      if (pStatus) parts.push(pStatus);
      if (pNominal) parts.push(pNominal);
      return { ...base, entityName: `${row.nama} (${row.periodeId} - Rp ${row.nominal})`, parts };
    }

    if (module === 'kompensasi-bayar') {
      const [row] = await db
        .select({ nim: mahasiswa.nim, nama: mahasiswa.nama, menit: kompensasiBayar.jumlahMenit })
        .from(kompensasiBayar)
        .innerJoin(mahasiswa, eq(kompensasiBayar.mahasiswaId, mahasiswa.id))
        .where(eq(kompensasiBayar.id, id));
      if (!row) return base;
      const parts: string[] = [];
      pushMhsParts(parts, row.nim, row.nama);
      const pMenit = part('Menit Kompensasi', String(row.menit));
      if (pMenit) parts.push(pMenit);
      return { ...base, entityName: `${row.nama} (${row.menit} menit)`, parts };
    }

    if (module === 'sesi-apel') {
      const [row] = await db
        .select({
          tanggal: sesiApel.tanggal,
          shift: sesiApel.shift,
          namaKelompok: kelompokApel.namaKelompok,
        })
        .from(sesiApel)
        .leftJoin(kelompokApel, eq(sesiApel.kelompokApelId, kelompokApel.id))
        .where(eq(sesiApel.id, id));
      if (!row) return base;
      const namaSesi = row.namaKelompok ? `${row.namaKelompok} - Shift ${row.shift}` : `Apel Shift ${row.shift}`;
      const parts: string[] = [];
      const pNama = part('Nama Sesi Apel', namaSesi);
      const pTgl = part('Tanggal Pelaksanaan', row.tanggal ? String(row.tanggal) : null);
      if (pNama) parts.push(pNama);
      if (pTgl) parts.push(pTgl);
      return { ...base, entityName: `${namaSesi} (${row.tanggal})`, parts };
    }

    if (module === 'kurikulum') {
      const [row] = await db
        .select({
          nama: kurikulum.nama,
          kode: kurikulum.kode,
          semesterMulai: kurikulum.semesterMulai,
          periodeNama: periodeAkademik.nama,
        })
        .from(kurikulum)
        .leftJoin(periodeAkademik, eq(kurikulum.semesterMulai, periodeAkademik.id))
        .where(eq(kurikulum.id, id));
      if (!row) return base;
      const parts: string[] = [];
      const pNama = part('Kurikulum', row.nama);
      const pKode = part('Kode', row.kode);
      const pTahun = part('Tahun Berlaku', row.periodeNama ?? row.semesterMulai);
      if (pNama) parts.push(pNama);
      if (pKode) parts.push(pKode);
      if (pTahun) parts.push(pTahun);
      return { ...base, entityName: `${row.nama} (${row.kode})`, parts };
    }

    if (module === 'nilai-praktik') {
      const [row] = await db
        .select({
          nim: mahasiswa.nim,
          nama: mahasiswa.nama,
          nilai: nilaiPraktik.nilaiAngka,
          mkNama: mataKuliah.nama,
          mkKode: mataKuliah.kode,
          komponenNama: komponenNilai.nama,
        })
        .from(nilaiPraktik)
        .innerJoin(mahasiswa, eq(nilaiPraktik.mahasiswaId, mahasiswa.id))
        .leftJoin(rombelPraktikum, eq(nilaiPraktik.rombelPraktikumId, rombelPraktikum.id))
        .leftJoin(kelasKuliah, eq(rombelPraktikum.kelasKuliahId, kelasKuliah.id))
        .leftJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
        .leftJoin(komponenNilai, eq(nilaiPraktik.komponenNilaiId, komponenNilai.id))
        .where(eq(nilaiPraktik.id, id));
      if (!row) return base;
      const parts: string[] = [];
      pushMhsParts(parts, row.nim, row.nama);
      pushMkParts(parts, row.mkNama, row.mkKode);
      const pKomponen = part('Komponen', row.komponenNama);
      const pNilai = part('Nilai Angka', row.nilai != null ? String(row.nilai) : null);
      if (pKomponen) parts.push(pKomponen);
      if (pNilai) parts.push(pNilai);
      return { ...base, entityName: `${row.nama} (Nilai: ${row.nilai})`, parts };
    }
  } catch {
    // Ignore lookup errors; fall back to generic info.
  }
  return base;
}

function getPathMeta(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const cleanPath = path.replace(/^\/api\/?/, '').replace(/^\//, '');
  const pathSegments = cleanPath.split('/').filter(Boolean);
  const module = pathSegments[0] || 'system';
  const rawEntityId = pathSegments[1] && !Number.isNaN(Number(pathSegments[1])) ? pathSegments[1] : null;
  return { path, module, rawEntityId };
}

/** Attempts to extract the newly-created record id from a response payload. */
function extractRecordId(responseValue: unknown): string | null {
  if (!responseValue || typeof responseValue !== 'object') return null;
  const obj = responseValue as Record<string, unknown>;
  const nested = obj.data && typeof obj.data === 'object' ? (obj.data as Record<string, unknown>) : undefined;
  const candidate = obj.id ?? nested?.id;
  if (typeof candidate === 'number' || typeof candidate === 'string') {
    const value = String(candidate).trim();
    return value.length > 0 ? value : null;
  }
  return null;
}

/**
 * Resolves and caches entity info BEFORE a mutation runs, so DELETE still sees the row.
 * Registered inline on the root app via `.onBeforeHandle`.
 */
export async function auditBeforeHandle(ctx: AuditHookContext): Promise<void> {
  const { request } = ctx;
  const method = request.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return;
  }
  const { path, module, rawEntityId } = getPathMeta(request);
  if (path.includes('/audit-logs')) {
    return;
  }
  // Resolve entity before the mutation (so DELETE still has the row).
  const info = await resolveEntity(module, rawEntityId);
  entityCache.set(request, info);
}

/**
 * Writes an audit log entry after a mutation response is sent.
 * Registered inline on the root app via `.onAfterResponse`.
 */
export async function auditAfterResponse(ctx: AuditHookContext): Promise<void> {
  const { request, set, getCurrentUser, responseValue } = ctx;
  const method = request.method.toUpperCase();

  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return;
  }

  const { path, module } = getPathMeta(request);

  if (path.includes('/audit-logs')) {
    return;
  }

  const statusCode = typeof set?.status === 'number' ? set.status : 200;

  // Ignore 404 Not Found (fake route probes / bot scanners)
  if (statusCode === 404) {
    return;
  }

  let actionType = 'UPDATE';
  if (method === 'POST') actionType = path.includes('/auth/login') ? 'LOGIN' : 'CREATE';
  if (method === 'DELETE') actionType = 'DELETE';
  if (path.includes('/auth/logout')) actionType = 'LOGOUT';

  try {
    const user = await (typeof getCurrentUser === 'function'
      ? getCurrentUser().catch(() => null)
      : Promise.resolve(null));
    const userId = user?.id ?? null;
    const userName = user?.nama ?? null;
    const userRole = user?.role ?? null;

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('cf-connecting-ip') ||
      '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    const cached = entityCache.get(request);
    const tableName = cached?.tableName ?? resolveTableName(module);
    const entityId = cached?.entityId ?? extractRecordId(responseValue);
    const entityName = cached?.entityName ?? null;
    const entityParts = cached?.parts ?? [];

    const tz = await SystemParameterService.getTimezone().catch(() => DEFAULT_TZ);
    const waktu = formatAuditDateTime(new Date(), tz);

    const summary = summarizeResponse(responseValue);
    const errorMessage =
      summary?.kind === 'error'
        ? summary.message
        : responseValue && typeof responseValue === 'object' && 'error' in (responseValue as Record<string, unknown>)
          ? String((responseValue as Record<string, unknown>).error)
          : null;

    let description = formatDescription({
      waktu,
      userName,
      userRole,
      actionType,
      tableName,
      recordId: entityId,
      statusCode,
      errorMessage,
      module,
    });
    if (summary?.kind === 'bulk') {
      description = `${description} ${formatBulkSentence(summary)}`;
    }

    const detailParts: string[] = [...entityParts];
    const actor = part('User', userName);
    if (actor) detailParts.push(actor);
    const summaryDetail = summary ? formatSummaryForDetail(summary) : null;
    if (summaryDetail) {
      const pSummary = part('Ringkasan', summaryDetail);
      if (pSummary) detailParts.push(pSummary);
    }

    const detail = formatDetail({ module, url: path, parts: detailParts });

    const isSuccess = statusCode < 400;

    const inserted = await AuditService.log({
      userId,
      userName,
      userRole,
      ipAddress,
      userAgent,
      actionType,
      module,
      tableName,
      entityId,
      entityName,
      description,
      detail,
      statusCode,
      isSuccess,
      metadata: {
        method,
        path,
        statusCode,
        isSuccess,
        ...(summary ? { responseSummary: summary } : {}),
      },
    });

    if (!inserted) {
      console.error('[audit-plugin] Audit log write returned null (gagal):', method, path);
    }
  } catch (error: unknown) {
    console.error('[audit-plugin] Gagal menulis audit log:', error instanceof Error ? error.message : error);
  }
}
