import { and, eq, inArray } from 'drizzle-orm';
import { mahasiswa, programStudi, userProdiScopes, users } from '../models/schema';
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

  /**
   * True bila user boleh mengakses data mahasiswa pada program studi tertentu.
   * Admin/super_admin dan user ber-scope global selalu diizinkan.
   */
  static async canAccessProdi(user: UserPayload | null, programStudiId: number | null | undefined): Promise<boolean> {
    if (!user) return false;
    if (programStudiId == null) return false;
    if (canAccessAllProdi(user)) return true;
    const ids = await this.getUserAccessibleProdiIds(user);
    if (ids === null) return true;
    return ids.includes(programStudiId);
  }

  /**
   * Menegaskan seluruh mahasiswa (berdasarkan ID) berada dalam scope prodi user.
   * Melempar Error bila ada yang di luar jangkauan — dipakai endpoint tulis.
   */
  static async assertMahasiswaInScope(user: UserPayload | null, mahasiswaIds: number[]): Promise<void> {
    if (!user || mahasiswaIds.length === 0) return;
    if (canAccessAllProdi(user)) return;
    const uniqueIds = [...new Set(mahasiswaIds.map(Number).filter((n) => Number.isFinite(n) && n > 0))];
    if (uniqueIds.length === 0) return;
    const rows = await db
      .select({ id: mahasiswa.id, programStudiId: mahasiswa.programStudiId })
      .from(mahasiswa)
      .where(inArray(mahasiswa.id, uniqueIds));
    const scoped = await this.getUserAccessibleProdiIds(user);
    const allowedIds = scoped === null ? null : new Set(scoped);
    const outOfScope = rows.filter((r) => allowedIds !== null && !allowedIds.has(r.programStudiId ?? -1));
    if (outOfScope.length > 0) {
      throw new Error('Akses ditolak. Ada data mahasiswa di luar lingkup prodi Anda.');
    }
  }
}
