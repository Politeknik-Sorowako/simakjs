import { eq } from 'drizzle-orm';
import { Elysia } from 'elysia';
import { authMiddleware } from '../middlewares/auth.middleware';
import { dosen, mahasiswa, mataKuliah } from '../models/schema';
import { AuditService } from '../services/audit.service';
import { db } from '../utils/db';

type EntityInfo = { entityId: string | null; entityName: string | null; module: string };

/**
 * Resolves the affected entity (id + human-readable name) for the main entities.
 * Returns generic info when the entity is not one of the known types.
 */
async function resolveEntity(module: string, rawId: string | null): Promise<EntityInfo> {
  if (!rawId || Number.isNaN(Number(rawId))) {
    return { entityId: rawId, entityName: null, module };
  }
  const id = Number(rawId);
  try {
    if (module === 'mahasiswa') {
      const [row] = await db
        .select({ nim: mahasiswa.nim, nama: mahasiswa.nama })
        .from(mahasiswa)
        .where(eq(mahasiswa.id, id));
      return row
        ? { entityId: rawId, entityName: `${row.nama} (${row.nim})`, module }
        : { entityId: rawId, entityName: null, module };
    }
    if (module === 'dosen') {
      const [row] = await db.select({ nip: dosen.nip, nama: dosen.nama }).from(dosen).where(eq(dosen.id, id));
      return row
        ? { entityId: rawId, entityName: `${row.nama} (${row.nip})`, module }
        : { entityId: rawId, entityName: null, module };
    }
    if (module === 'mata-kuliah' || module === 'matakuliah') {
      const [row] = await db
        .select({ kode: mataKuliah.kode, nama: mataKuliah.nama })
        .from(mataKuliah)
        .where(eq(mataKuliah.id, id));
      return row
        ? { entityId: rawId, entityName: `${row.nama} (${row.kode})`, module: 'mata-kuliah' }
        : { entityId: rawId, entityName: null, module };
    }
  } catch {
    // Ignore lookup errors; fall back to generic info.
  }
  return { entityId: rawId, entityName: null, module };
}

function buildDescription(
  method: string,
  module: string,
  actionType: string,
  entityName: string | null,
  statusCode: number,
): string {
  const entity = entityName ? ` "${entityName}"` : '';
  switch (actionType) {
    case 'CREATE':
      return `Menambah ${module}${entity}`;
    case 'DELETE':
      return `Menghapus ${module}${entity}`;
    case 'UPDATE':
      return `Mengubah ${module}${entity}`;
    case 'LOGIN':
      return 'Pengguna masuk (login)';
    case 'LOGOUT':
      return 'Pengguna keluar (logout)';
    default:
      return `[${method}] ${module} (Status: ${statusCode})`;
  }
}

export const auditPlugin = new Elysia({ name: 'audit-plugin' }).use(authMiddleware).onAfterResponse(async (ctx) => {
  const { request, set, getCurrentUser } = ctx;
  const method = request.method.toUpperCase();

  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return;
  }

  const url = new URL(request.url);
  const path = url.pathname;

  if (path.includes('/audit-logs')) {
    return;
  }

  const cleanPath = path.replace(/^\/api\/?/, '').replace(/^\//, '');
  const pathSegments = cleanPath.split('/').filter(Boolean);
  const module = pathSegments[0] || 'system';

  let actionType = 'UPDATE';
  if (method === 'POST') actionType = path.includes('/auth/login') ? 'LOGIN' : 'CREATE';
  if (method === 'DELETE') actionType = 'DELETE';
  if (path.includes('/auth/logout')) actionType = 'LOGOUT';

  const rawEntityId = pathSegments[1] && !Number.isNaN(Number(pathSegments[1])) ? pathSegments[1] : null;

  const user = await getCurrentUser().catch(() => null);
  const userId = user?.id ?? null;
  const userRole = user?.role ?? null;

  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('cf-connecting-ip') ||
    '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || 'Unknown';

  const statusCode = typeof set.status === 'number' ? set.status : 200;

  const { entityId, entityName } = await resolveEntity(module, rawEntityId);
  const description = buildDescription(method, module, actionType, entityName, statusCode);

  void AuditService.log({
    userId,
    userRole,
    ipAddress,
    userAgent,
    actionType,
    module,
    entityId,
    entityName,
    description,
    metadata: {
      method,
      path,
      statusCode,
    },
  });
});
