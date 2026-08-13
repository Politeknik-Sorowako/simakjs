import { AuditService } from '../services/audit.service';
import { hasRole } from '../utils/role';
import type { AuthContext } from '../utils/types';

export class AuditController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user || !hasRole(user, ['admin'])) {
        set.status = 403;
        return { error: 'Akses ditolak. Hanya Admin.' };
      }

      const q = (query || {}) as Record<string, unknown>;
      const page = parseInt((q.page as string) || '1', 10);
      const limit = parseInt((q.limit as string) || '20', 10);
      const module = (q.module as string) || undefined;
      const actionType = (q.actionType as string) || undefined;
      const userId = q.userId ? parseInt(q.userId as string, 10) : undefined;
      const startDate = (q.startDate as string) || undefined;
      const endDate = (q.endDate as string) || undefined;
      const search = (q.search as string) || undefined;

      const result = await AuditService.getAll(page, limit, module, actionType, userId, startDate, endDate, search);

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
      if (!user || !hasRole(user, ['admin'])) {
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
      if (!user || !hasRole(user, ['admin'])) {
        set.status = 403;
        return { error: 'Akses ditolak. Hanya Admin.' };
      }

      const q = (query || {}) as Record<string, unknown>;
      const module = (q.module as string) || undefined;
      const actionType = (q.actionType as string) || undefined;
      const userId = q.userId ? parseInt(q.userId as string, 10) : undefined;
      const startDate = (q.startDate as string) || undefined;
      const endDate = (q.endDate as string) || undefined;
      const search = (q.search as string) || undefined;

      const csv = await AuditService.exportCsv(module, actionType, userId, startDate, endDate, search);
      set.headers['Content-Type'] = 'text/csv; charset=utf-8';
      set.headers['Content-Disposition'] =
        `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`;
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
      if (!user || !hasRole(user, ['admin'])) {
        set.status = 403;
        return { error: 'Akses ditolak. Hanya Admin.' };
      }

      const q = (query || {}) as Record<string, unknown>;
      const days = parseInt((q.days as string) || '200', 10);
      if (days < 1) {
        set.status = 400;
        return { error: 'Jumlah hari harus lebih dari 0.' };
      }

      const deleted = await AuditService.purgeOlderThan(days);
      return { message: `${deleted} log lebih dari ${days} hari telah dihapus.`, deleted };
    } catch (error: unknown) {
      set.status = 500;
      return { error: error instanceof Error ? error.message : 'Gagal membersihkan audit log' };
    }
  }
}
