import { and, eq, inArray, or } from 'drizzle-orm';
import { dosen, notifications, userProdiScopes, userRoles, users } from '../models/schema';
import { db } from '../utils/db';
import type { UserRole } from '../utils/types';

export interface NotificationPayload {
  title: string;
  message: string;
  link?: string;
}

export class NotificationService {
  /**
   * Mengirim notifikasi ke daftar ID pengguna secara aman (row-by-row error handling).
   */
  static async notify(userIds: Iterable<number>, payload: NotificationPayload): Promise<void> {
    const ids = Array.from(new Set(userIds)).filter((id) => typeof id === 'number' && id > 0);
    const title = payload.title.slice(0, 255);
    for (const userId of ids) {
      try {
        await db.insert(notifications).values({
          userId,
          title,
          message: payload.message,
          link: payload.link || null,
        });
      } catch (err: unknown) {
        console.error(`[NotificationService] Gagal membuat notifikasi untuk user ${userId}:`, err);
      }
    }
  }

  /**
   * Menemukan ID pengguna untuk dosen pembimbing akademik (PA) berdasarkan ID dosen.
   */
  static async resolveDosenPaUserId(dosenPaId: number | null): Promise<number | null> {
    if (!dosenPaId) return null;
    try {
      const [dosenRow] = await db.select({ email: dosen.email }).from(dosen).where(eq(dosen.id, dosenPaId));
      if (!dosenRow?.email) return null;
      const [dosenUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, dosenRow.email));
      return dosenUser?.id ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Menemukan ID pengguna aktif yang memiliki salah satu role tertentu (baik via primary role maupun user_roles),
   * dengan filter prodi jika diisi (khusus role yang ter-scope prodi seperti kaprodi/prodi).
   */
  static async resolveUserIdsByRoles(
    roles: UserRole[],
    opts: { programStudiId?: number | null } = {},
  ): Promise<number[]> {
    if (!roles || roles.length === 0) return [];

    try {
      // Ambil user_roles matching
      const userRolesRows = await db
        .selectDistinct({ userId: userRoles.userId })
        .from(userRoles)
        .where(inArray(userRoles.role, roles));

      const candidateIds = userRolesRows.map((r) => r.userId);

      const staffUsers = await db
        .select({
          id: users.id,
          role: users.role,
          isActive: users.isActive,
          isGlobalScope: users.isGlobalScope,
          prodiIds: users.prodiIds,
        })
        .from(users)
        .where(
          and(
            eq(users.isActive, true),
            candidateIds.length > 0
              ? or(inArray(users.id, candidateIds), inArray(users.role, roles))
              : inArray(users.role, roles),
          ),
        );

      // Jika ada filter programStudiId
      let scopedUserIds = new Set<number>();
      if (opts.programStudiId) {
        const scopedRows = await db
          .select({ userId: userProdiScopes.userId })
          .from(userProdiScopes)
          .where(eq(userProdiScopes.programStudiId, opts.programStudiId));
        scopedUserIds = new Set(scopedRows.map((s) => s.userId));
      }

      const result = new Set<number>();
      for (const u of staffUsers) {
        // Role institusi (admin, direktur, wadir1, wadir3, kemahasiswaan, super_admin) tidak perlu difilter per prodi
        const isInstitutionalRole =
          u.role === 'admin' ||
          u.role === 'super_admin' ||
          u.role === 'direktur' ||
          u.role === 'wadir1' ||
          u.role === 'wadir3' ||
          u.role === 'kemahasiswaan';

        if (!opts.programStudiId || isInstitutionalRole || u.isGlobalScope) {
          result.add(u.id);
          continue;
        }

        const inProdiIds = Array.isArray(u.prodiIds) && u.prodiIds.includes(opts.programStudiId);
        const inScopedTable = scopedUserIds.has(u.id);
        if (inProdiIds || inScopedTable) {
          result.add(u.id);
        }
      }

      return Array.from(result);
    } catch (err: unknown) {
      console.error('[NotificationService] Error resolveUserIdsByRoles:', err);
      return [];
    }
  }
}
