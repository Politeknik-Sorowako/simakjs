import { and, eq, inArray } from 'drizzle-orm';
import { programStudi, userProdiScopes, users } from '../models/schema';
import { db } from '../utils/db';
import { canAccessAllProdi, hasRole } from '../utils/role';
import type { UserPayload, UserRole } from '../utils/types';

export class ProdiScopeService {
  static async getUserScopes(userId: number) {
    const rows = await db
      .select({
        id: userProdiScopes.id,
        programStudiId: userProdiScopes.programStudiId,
        kode: programStudi.kode,
        nama: programStudi.nama,
        jenjang: programStudi.jenjang,
      })
      .from(userProdiScopes)
      .innerJoin(programStudi, eq(userProdiScopes.programStudiId, programStudi.id))
      .where(eq(userProdiScopes.userId, userId));
    return rows;
  }

  static async setUserScopes(userId: number, prodiIds: number[]) {
    return await db.transaction(async (tx) => {
      await tx.delete(userProdiScopes).where(eq(userProdiScopes.userId, userId));
      if (prodiIds.length > 0) {
        await tx
          .insert(userProdiScopes)
          .values(prodiIds.map((programStudiId) => ({ userId, programStudiId })))
          .onConflictDoNothing();
      }
      return { userId, scopeCount: prodiIds.length };
    });
  }

  static async addUserScope(userId: number, programStudiId: number) {
    const [row] = await db.insert(userProdiScopes).values({ userId, programStudiId }).onConflictDoNothing().returning();
    return row || null;
  }

  static async removeUserScope(userId: number, programStudiId: number) {
    const [row] = await db
      .delete(userProdiScopes)
      .where(and(eq(userProdiScopes.userId, userId), eq(userProdiScopes.programStudiId, programStudiId)))
      .returning();
    return row || null;
  }

  static async toggleGlobalScope(userId: number, isGlobalScope: boolean) {
    const [row] = await db
      .update(users)
      .set({ isGlobalScope })
      .where(eq(users.id, userId))
      .returning({ id: users.id, isGlobalScope: users.isGlobalScope });
    return row || null;
  }

  /**
   * Returns the list of prodi IDs the user may access, or null if the user
   * has an unrestricted (global) scope. Empty array means "no access".
   */
  static async getUserAccessibleProdiIds(user: UserPayload | null): Promise<number[] | null> {
    if (!user) return [];
    if (canAccessAllProdi(user)) return null;
    const rows = await db
      .select({ programStudiId: userProdiScopes.programStudiId })
      .from(userProdiScopes)
      .where(eq(userProdiScopes.userId, user.id));
    return rows.map((r) => r.programStudiId);
  }

  static canScopeUnrestricted(user: UserPayload | null): boolean {
    return canAccessAllProdi(user);
  }
}
