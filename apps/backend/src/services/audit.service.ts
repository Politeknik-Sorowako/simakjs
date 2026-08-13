import { and, count, desc, eq, gte, ilike, lte, or } from 'drizzle-orm';
import { auditLogs } from '../models/schema';
import { db } from '../utils/db';

export interface CreateAuditLogDto {
  userId?: number | null;
  userRole?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  actionType: string;
  module: string;
  entityId?: string | null;
  entityName?: string | null;
  description: string;
  metadata?: Record<string, unknown> | null;
}

export class AuditService {
  static async log(data: CreateAuditLogDto) {
    try {
      const [inserted] = await db
        .insert(auditLogs)
        .values({
          userId: data.userId ?? null,
          userRole: data.userRole ?? null,
          ipAddress: data.ipAddress ?? null,
          userAgent: data.userAgent ?? null,
          actionType: data.actionType,
          module: data.module,
          entityId: data.entityId ?? null,
          entityName: data.entityName ?? null,
          description: data.description,
          metadata: data.metadata ?? null,
        })
        .returning();
      return inserted;
    } catch (error: unknown) {
      console.error('[AuditService] Failed to write audit log:', error instanceof Error ? error.message : error);
      return null;
    }
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
  ) {
    const offset = (page - 1) * limit;
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
    if (startDate) {
      conditions.push(gte(auditLogs.timestamp, new Date(`${startDate}T00:00:00`)));
    }
    if (endDate) {
      conditions.push(lte(auditLogs.timestamp, new Date(`${endDate}T23:59:59.999`)));
    }
    if (search) {
      conditions.push(
        or(
          ilike(auditLogs.description, `%${search}%`),
          ilike(auditLogs.module, `%${search}%`),
          ilike(auditLogs.actionType, `%${search}%`),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ total: count() }).from(auditLogs).where(whereClause);
    const total = totalResult?.total || 0;

    const data = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit)
      .offset(offset);

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
    const [log] = await db.select().from(auditLogs).where(eq(auditLogs.id, id));
    return log || null;
  }

  static async exportCsv(
    module?: string,
    actionType?: string,
    userId?: number,
    startDate?: string,
    endDate?: string,
    search?: string,
    limit = 10000,
  ): Promise<string> {
    const conditions: ReturnType<typeof and>[] = [];

    if (module) {
      conditions.push(eq(auditLogs.module, module));
    }
    if (actionType) {
      conditions.push(eq(auditLogs.actionType, actionType));
    }
    if (userId) {
      conditions.push(eq(auditLogs.userId, userId));
    }
    if (startDate) {
      conditions.push(gte(auditLogs.timestamp, new Date(`${startDate}T00:00:00`)));
    }
    if (endDate) {
      conditions.push(lte(auditLogs.timestamp, new Date(`${endDate}T23:59:59.999`)));
    }
    if (search) {
      const searchCond = or(
        ilike(auditLogs.description, `%${search}%`),
        ilike(auditLogs.module, `%${search}%`),
        ilike(auditLogs.actionType, `%${search}%`),
      );
      if (searchCond) conditions.push(searchCond);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(auditLogs)
      .where(whereClause ?? undefined)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);

    const headers = [
      'Waktu',
      'User ID',
      'Peran',
      'Aksi',
      'Modul',
      'Entitas ID',
      'Nama Entitas',
      'Deskripsi',
      'IP',
      'User Agent',
    ];
    const escape = (val: string | number | null | undefined): string => {
      const s = val == null ? '' : String(val);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = rows.map((r) =>
      [
        escape(r.timestamp?.toISOString()),
        escape(r.userId),
        escape(r.userRole),
        escape(r.actionType),
        escape(r.module),
        escape(r.entityId),
        escape(r.entityName),
        escape(r.description),
        escape(r.ipAddress),
        escape(r.userAgent),
      ].join(','),
    );
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
