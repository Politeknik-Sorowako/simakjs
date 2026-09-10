import { eq } from 'drizzle-orm';
import { Elysia } from 'elysia';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  bap,
  dosen,
  kelasKuliah,
  krs,
  mahasiswa,
  mataKuliah,
  pelanggaran,
  presensi,
  programStudi,
  users,
} from '../models/schema';
import { AuditService } from '../services/audit.service';
import { SystemParameterService } from '../services/system-parameter.service';
import { formatAuditDateTime, formatDescription, formatDetail, resolveTableName } from '../utils/audit-format';
import { db } from '../utils/db';

type EntityInfo = {
  entityId: string | null;
  entityName: string | null;
  tableName: string;
  /** Human-readable descriptors for the affected entity (NIM, Nama, Prodi, MK, ...). */
  parts: string[];
};

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

export const auditPlugin = new Elysia({ name: 'audit-plugin' })
  .use(authMiddleware)
  .onBeforeHandle(async ({ request }) => {
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
  })
  .onAfterResponse(async (ctx) => {
    const { request, set, getCurrentUser, responseValue } = ctx;
    const method = request.method.toUpperCase();

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return;
    }

    const { path, module } = getPathMeta(request);

    if (path.includes('/audit-logs')) {
      return;
    }

    let actionType = 'UPDATE';
    if (method === 'POST') actionType = path.includes('/auth/login') ? 'LOGIN' : 'CREATE';
    if (method === 'DELETE') actionType = 'DELETE';
    if (path.includes('/auth/logout')) actionType = 'LOGOUT';

    const user = await getCurrentUser().catch(() => null);
    const userId = user?.id ?? null;
    const userName = user?.nama ?? null;
    const userRole = user?.role ?? null;

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('cf-connecting-ip') ||
      '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    const statusCode = typeof set.status === 'number' ? set.status : 200;

    const cached = entityCache.get(request);
    const tableName = cached?.tableName ?? resolveTableName(module);
    const entityId = cached?.entityId ?? extractRecordId(responseValue);
    const entityName = cached?.entityName ?? null;
    const entityParts = cached?.parts ?? [];

    void (async () => {
      try {
        let tz = DEFAULT_TZ;
        try {
          tz = await SystemParameterService.getTimezone();
        } catch {
          // fall back to default timezone
        }

        const waktu = formatAuditDateTime(new Date(), tz);
        const description = formatDescription({
          waktu,
          userName,
          userRole,
          actionType,
          tableName,
          recordId: entityId,
        });

        const detailParts: string[] = [...entityParts];
        const actor = part('User', userName);
        if (actor) detailParts.push(actor);

        const detail = formatDetail({ module, url: path, parts: detailParts });

        await AuditService.log({
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
          metadata: {
            method,
            path,
            statusCode,
          },
        });
      } catch (error: unknown) {
        console.error('[audit-plugin] Failed to build audit log:', error instanceof Error ? error.message : error);
      }
    })();
  });
