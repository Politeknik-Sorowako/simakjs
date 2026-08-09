import { ProdiScopeService } from '../services/prodi-scope.service';
import { isSuperAdminOrAdmin } from '../utils/role';
import { AuthContext } from '../utils/types';

export class ProdiScopeController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getScopes({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !isSuperAdminOrAdmin(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const userId = parseInt((params as Record<string, unknown>)?.userId as string);
    const scopes = await ProdiScopeService.getUserScopes(userId);
    return { data: scopes };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async setScopes({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !isSuperAdminOrAdmin(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const userId = parseInt((params as Record<string, unknown>)?.userId as string);
    const prodiIds = (body as { prodiIds?: number[] })?.prodiIds ?? [];
    if (prodiIds.some((id) => typeof id !== 'number')) {
      set.status = 400;
      return { error: 'prodiIds harus berupa array of number' };
    }
    const result = await ProdiScopeService.setUserScopes(userId, prodiIds);
    return result;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async addScope({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !isSuperAdminOrAdmin(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const userId = parseInt((params as Record<string, unknown>)?.userId as string);
    const programStudiId = (body as { programStudiId?: number })?.programStudiId;
    if (!programStudiId) {
      set.status = 400;
      return { error: 'programStudiId wajib diisi' };
    }
    const row = await ProdiScopeService.addUserScope(userId, programStudiId);
    return row || { message: 'Scope sudah ada' };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async removeScope({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !isSuperAdminOrAdmin(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const userId = parseInt((params as Record<string, unknown>)?.userId as string);
    const programStudiId = parseInt((params as Record<string, unknown>)?.prodiId as string);
    const row = await ProdiScopeService.removeUserScope(userId, programStudiId);
    if (!row) {
      set.status = 404;
      return { error: 'Scope tidak ditemukan' };
    }
    return { message: 'Scope dihapus' };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async toggleGlobal({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !isSuperAdminOrAdmin(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const userId = parseInt((params as Record<string, unknown>)?.userId as string);
    const isGlobalScope = !!(body as { isGlobalScope?: boolean })?.isGlobalScope;
    const row = await ProdiScopeService.toggleGlobalScope(userId, isGlobalScope);
    if (!row) {
      set.status = 404;
      return { error: 'User tidak ditemukan' };
    }
    return row;
  }
}
