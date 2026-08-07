import { RbacService } from '../services/rbac.service';
import { isSuperAdminOrAdmin } from '../utils/role';
import { AuthContext } from '../utils/types';

export class RbacController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAllRoleGroups({ set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !isSuperAdminOrAdmin(user)) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin atau Super Admin.' };
    }
    const data = await RbacService.getAllRoleGroups();
    const permissions = await RbacService.getAllPermissions();
    return { data, permissions };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async createRoleGroup({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !isSuperAdminOrAdmin(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const { name, description, isActive } = body as { name: string; description?: string; isActive?: boolean };
    if (!name || !name.trim()) {
      set.status = 400;
      return { error: 'Nama role group wajib diisi' };
    }
    const row = await RbacService.createRoleGroup({ name, description, isActive });
    return row;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async updateRoleGroup({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !isSuperAdminOrAdmin(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const id = parseInt((params as Record<string, unknown>)?.id as string);
    const { name, description, isActive } = body as Record<string, unknown> as {
      name?: string;
      description?: string;
      isActive?: boolean;
    };
    const row = await RbacService.updateRoleGroup(id, { name, description, isActive });
    if (!row) {
      set.status = 404;
      return { error: 'Role group tidak ditemukan' };
    }
    return row;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async deleteRoleGroup({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !isSuperAdminOrAdmin(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const id = parseInt((params as Record<string, unknown>)?.id as string);
    const row = await RbacService.deleteRoleGroup(id);
    if (!row) {
      set.status = 404;
      return { error: 'Role group tidak ditemukan' };
    }
    return { message: 'Role group dihapus' };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async assignPermissions({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !isSuperAdminOrAdmin(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const roleGroupId = parseInt((params as Record<string, unknown>)?.id as string);
    const permissionIds = (body as { permissionIds?: number[] })?.permissionIds ?? [];
    if (permissionIds.some((id) => typeof id !== 'number')) {
      set.status = 400;
      return { error: 'permissionIds harus berupa array of number' };
    }
    const result = await RbacService.assignPermissions(roleGroupId, permissionIds);
    return result;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getMatrix({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !isSuperAdminOrAdmin(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const roleGroupId = parseInt((params as Record<string, unknown>)?.id as string);
    const byModule = await RbacService.getRoleGroupMatrix(roleGroupId);
    return { roleGroupId, byModule };
  }
}
