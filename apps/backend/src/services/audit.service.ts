import { and, count, desc, eq, gte, ilike, lte, or } from 'drizzle-orm';
import { auditLogs, users } from '../models/schema';
import { db } from '../utils/db';

export interface CreateAuditLogDto {
  userId?: number | null;
  userName?: string | null;
  userRole?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  actionType: string;
  module: string;
  tableName?: string | null;
  entityId?: string | null;
  entityName?: string | null;
  description: string;
  detail?: string | null;
  statusCode?: number | null;
  isSuccess?: boolean | null;
  metadata?: Record<string, unknown> | null;
}

export class AuditService {
  static async log(data: CreateAuditLogDto) {
    try {
      const [inserted] = await db
        .insert(auditLogs)
        .values({
          userId: data.userId ?? null,
          userName: data.userName ?? null,
          userRole: data.userRole ?? null,
          ipAddress: data.ipAddress ?? null,
          userAgent: data.userAgent ?? null,
          actionType: data.actionType,
          module: data.module,
          tableName: data.tableName ?? null,
          entityId: data.entityId ?? null,
          entityName: data.entityName ?? null,
          description: data.description,
          detail: data.detail ?? null,
          statusCode: data.statusCode ?? 200,
          isSuccess: data.isSuccess ?? (data.statusCode ?? 200) < 400,
          metadata: data.metadata ?? null,
        })
        .returning();
      return inserted;
    } catch (error: unknown) {
      console.error('[AuditService] Failed to write audit log:', error instanceof Error ? error.message : error);
      return null;
    }
  }

  private static buildFilters(
    module?: string,
    actionType?: string,
    userId?: number,
    startDate?: string,
    endDate?: string,
    search?: string,
    tableName?: string,
    userName?: string,
    statusCategory?: string,
  ) {
    const conditions = [];

    if (module) {
      conditions.push(eq(auditLogs.module, module));
    }
    if (actionType) {
      conditions.push(eq(auditLogs.actionType, actionType));
    }
    if (userId) {
      conditions.push(eq(auditLogs.userId, userId));
    }
    if (tableName) {
      conditions.push(eq(auditLogs.tableName, tableName));
    }
    if (userName) {
      conditions.push(ilike(users.nama, `%${userName}%`));
    }
    if (startDate) {
      conditions.push(gte(auditLogs.timestamp, new Date(`${startDate}T00:00:00`)));
    }
    if (endDate) {
      conditions.push(lte(auditLogs.timestamp, new Date(`${endDate}T23:59:59.999`)));
    }
    if (statusCategory === 'success') {
      conditions.push(eq(auditLogs.isSuccess, true));
    } else if (statusCategory === 'client_error') {
      conditions.push(and(gte(auditLogs.statusCode, 400), lte(auditLogs.statusCode, 499)));
    } else if (statusCategory === 'server_error') {
      conditions.push(gte(auditLogs.statusCode, 500));
    } else if (statusCategory === 'failed') {
      conditions.push(eq(auditLogs.isSuccess, false));
    }

    if (search) {
      conditions.push(
        or(
          ilike(auditLogs.description, `%${search}%`),
          ilike(auditLogs.module, `%${search}%`),
          ilike(auditLogs.actionType, `%${search}%`),
          ilike(auditLogs.entityName, `%${search}%`),
          ilike(auditLogs.tableName, `%${search}%`),
          ilike(auditLogs.detail, `%${search}%`),
          ilike(auditLogs.ipAddress, `%${search}%`),
          ilike(auditLogs.userName, `%${search}%`),
          ilike(auditLogs.entityId, `%${search}%`),
          ilike(users.nama, `%${search}%`),
        ),
      );
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  static async getAll(
    page = 1,
    limit = 20,
    module?: string,
    actionType?: string,
    userId?: number,
    startDate?: string,
    endDate?: string,
    search?: string,
    tableName?: string,
    userName?: string,
    statusCategory?: string,
  ) {
    const offset = (page - 1) * limit;
    const whereClause = AuditService.buildFilters(
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

    const requiresUserJoin = Boolean(userName || search);
    const countQuery = requiresUserJoin
      ? db.select({ total: count() }).from(auditLogs).leftJoin(users, eq(auditLogs.userId, users.id)).where(whereClause)
      : db.select({ total: count() }).from(auditLogs).where(whereClause);

    const [totalResult] = await countQuery;
    const total = totalResult?.total || 0;

    const rows = await db
      .select({ log: auditLogs, liveUserName: users.nama })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(whereClause)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit)
      .offset(offset);

    const data = rows.map((row) => ({
      ...row.log,
      userName: row.log.userName ?? row.liveUserName ?? null,
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  static async getById(id: string) {
    const [row] = await db
      .select({ log: auditLogs, liveUserName: users.nama })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(auditLogs.id, id));
    if (!row) return null;
    return {
      ...row.log,
      userName: row.log.userName ?? row.liveUserName ?? null,
    };
  }

  static async exportCsv(
    module?: string,
    actionType?: string,
    userId?: number,
    startDate?: string,
    endDate?: string,
    search?: string,
    limit = 10000,
    tableName?: string,
    userName?: string,
    statusCategory?: string,
  ): Promise<string> {
    const whereClause = AuditService.buildFilters(
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

    const rows = await db
      .select({ log: auditLogs, liveUserName: users.nama })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(whereClause ?? undefined)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);

    const headers = ['Waktu', 'User', 'Role', 'Aksi', 'Module', 'Entitas', 'Deskripsi', 'Status HTTP', 'IP', 'Detail'];
    const escape = (val: string | number | null | undefined): string => {
      const s = val == null ? '' : String(val);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = rows.map((row) => {
      const r = row.log;
      const resolvedUserName = r.userName ?? row.liveUserName ?? (r.userId ? `User #${r.userId}` : 'Sistem');
      const entitas = r.entityName ?? r.entityId ?? '';
      const httpStatus = r.statusCode ? String(r.statusCode) : '200';
      return [
        escape(r.timestamp?.toISOString()),
        escape(resolvedUserName),
        escape(r.userRole),
        escape(r.actionType),
        escape(r.module),
        escape(entitas),
        escape(r.description),
        escape(httpStatus),
        escape(r.ipAddress),
        escape(r.detail),
      ].join(',');
    });
    return [headers.join(','), ...lines].join('\r\n');
  }

  static async purgeOlderThan(days: number) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const [before] = await db.select({ total: count() }).from(auditLogs).where(lte(auditLogs.timestamp, cutoff));
    await db.delete(auditLogs).where(lte(auditLogs.timestamp, cutoff));
    return Number(before?.total || 0);
  }
}
