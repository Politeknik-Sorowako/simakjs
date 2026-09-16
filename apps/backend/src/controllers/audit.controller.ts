import { AuditService } from '../services/audit.service';
import { SystemParameterService } from '../services/system-parameter.service';
import { hasRole } from '../utils/role';
import { getNowDateString } from '../utils/timezone';
import type { AuthContext } from '../utils/types';

const AUDIT_ROLES = ['super_admin', 'admin'] as const;

export class AuditController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user || !hasRole(user, [...AUDIT_ROLES])) {
        set.status = 403;
        return { error: 'Akses ditolak. Hanya Admin.' };
      }

      const q = (query || {}) as Record<string, unknown>;
      const page = Math.max(1, parseInt((q.page as string) || '1', 10) || 1);
      const allowedLimits = new Set([20, 50, 100, 200, 500]);
      const requestedLimit = parseInt((q.limit as string) || '20', 10);
      const limit = allowedLimits.has(requestedLimit) ? requestedLimit : 20;
      const module = (q.module as string) || undefined;
      const actionType = (q.actionType as string) || undefined;
      const userId = q.userId ? parseInt(q.userId as string, 10) : undefined;
      const startDate = (q.startDate as string) || undefined;
      const endDate = (q.endDate as string) || undefined;
      const search = (q.search as string) || undefined;
      const tableName = (q.tableName as string) || undefined;
      const userName = (q.userName as string) || undefined;
      const statusCategory = (q.statusCategory as string) || (q.status as string) || undefined;

      const result = await AuditService.getAll(
        page,
        limit,
        module,
        actionType,
        userId,
        startDate,
        endDate,
        search,
        tableName,
        userName,
        statusCategory,
      );

      return result;
    } catch (error: unknown) {
      set.status = 500;
      return { error: error instanceof Error ? error.message : 'Gagal mengambil audit log' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getById({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user || !hasRole(user, [...AUDIT_ROLES])) {
        set.status = 403;
        return { error: 'Akses ditolak. Hanya Admin.' };
      }

      const id = (params as Record<string, string>).id;
      const log = await AuditService.getById(id);
      if (!log) {
        set.status = 404;
        return { error: 'Audit log tidak ditemukan' };
      }

      return { data: log };
    } catch (error: unknown) {
      set.status = 500;
      return { error: error instanceof Error ? error.message : 'Gagal mengambil detail audit log' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async exportCsv({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user || !hasRole(user, [...AUDIT_ROLES])) {
        set.status = 403;
        return { error: 'Akses ditolak. Hanya Admin.' };
      }

      const q = (query || {}) as Record<string, unknown>;
      const isFull = q.full === 'true' || q.isFull === 'true';
      const module = isFull ? undefined : (q.module as string) || undefined;
      const actionType = isFull ? undefined : (q.actionType as string) || undefined;
      const userId = isFull ? undefined : q.userId ? parseInt(q.userId as string, 10) : undefined;
      const startDate = isFull ? undefined : (q.startDate as string) || undefined;
      const endDate = isFull ? undefined : (q.endDate as string) || undefined;
      const search = isFull ? undefined : (q.search as string) || undefined;
      const tableName = isFull ? undefined : (q.tableName as string) || undefined;
      const userName = isFull ? undefined : (q.userName as string) || undefined;
      const statusCategory = isFull ? undefined : (q.statusCategory as string) || (q.status as string) || undefined;

      const rawLimit = parseInt((q.limit as string) || (isFull ? '50000' : '10000'), 10);
      const limit = Number.isNaN(rawLimit) ? 10000 : Math.min(Math.max(rawLimit, 1), 50000);

      const csv = await AuditService.exportCsv(
        module,
        actionType,
        userId,
        startDate,
        endDate,
        search,
        limit,
        tableName,
        userName,
        statusCategory,
      );
      set.headers['Content-Type'] = 'text/csv; charset=utf-8';
      const prefix = isFull ? 'all-audit-logs' : 'audit-logs';
      set.headers['Content-Disposition'] =
        `attachment; filename="${prefix}-${await getNowDateString(await SystemParameterService.getTimezone())}.csv"`;
      return csv;
    } catch (error: unknown) {
      set.status = 500;
      return { error: error instanceof Error ? error.message : 'Gagal mengekspor audit log' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async purge({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user || !hasRole(user, [...AUDIT_ROLES])) {
        set.status = 403;
        return { error: 'Akses ditolak. Hanya Admin.' };
      }

      const q = (query || {}) as Record<string, unknown>;
      const days = parseInt((q.days as string) || '200', 10);
      if (Number.isNaN(days) || days < 1) {
        set.status = 400;
        return { error: 'Jumlah hari harus berupa angka lebih dari 0.' };
      }

      const deleted = await AuditService.purgeOlderThan(days);
      return { message: `${deleted} log lebih dari ${days} hari telah dihapus.`, deleted };
    } catch (error: unknown) {
      set.status = 500;
      return { error: error instanceof Error ? error.message : 'Gagal membersihkan audit log' };
    }
  }
}
