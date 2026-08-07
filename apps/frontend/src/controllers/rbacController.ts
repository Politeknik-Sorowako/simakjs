import { fetchApi } from '../utils/api';

export const SYSTEM_ACTIONS = ['view', 'create', 'update', 'delete', 'export', 'approve'];

export interface RoleGroup {
  id: number;
  name: string;
  description?: string | null;
  isActive: boolean;
  actionsByModule: Record<string, string[]>;
}

export interface PermissionItem {
  id: number;
  module: string;
  action: string;
  description?: string | null;
}

export const rbacController = {
  async getRoleGroups(): Promise<{ data: RoleGroup[]; permissions: PermissionItem[] }> {
    return fetchApi<{ data: RoleGroup[]; permissions: PermissionItem[] }>('/rbac/role-groups');
  },

  async createRoleGroup(data: { name: string; description?: string; isActive?: boolean }): Promise<RoleGroup> {
    return fetchApi<RoleGroup>('/rbac/role-groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateRoleGroup(
    id: number,
    data: { name?: string; description?: string; isActive?: boolean },
  ): Promise<RoleGroup> {
    return fetchApi<RoleGroup>(`/rbac/role-groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteRoleGroup(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/rbac/role-groups/${id}`, {
      method: 'DELETE',
    });
  },

  async assignPermissions(id: number, permissionIds: number[]): Promise<{ permissionCount: number }> {
    return fetchApi<{ permissionCount: number }>(`/rbac/role-groups/${id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissionIds }),
    });
  },
};
