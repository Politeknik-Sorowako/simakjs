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
      conditions.push(gte(auditLogs.timestamp, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(auditLogs.timestamp, new Date(endDate)));
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
}
