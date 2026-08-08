import { fetchApi } from '../utils/api';

export type Level = 'view' | 'edit' | 'manage';
export type LevelState = Record<Level, boolean>;

export const SYSTEM_ACTIONS = ['view', 'edit', 'manage'] as const;

export const LEVEL_LABELS: Record<Level, string> = {
  view: 'Lihat',
  edit: 'Edit',
  manage: 'Kelola',
};

export interface RoleGroup {
  id: number;
  name: string;
  description?: string | null;
  isActive: boolean;
  actionsByModule: Record<string, string[]>;
}

export interface UserRoleType {
  id: number;
  name: string;
  description?: string | null;
  roleValue: string;
  isActive: boolean;
  isSystem: boolean;
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

  async getRoleTypes(): Promise<{ data: UserRoleType[] }> {
    return fetchApi<{ data: UserRoleType[] }>('/rbac/role-types');
  },

  async toggleRoleType(id: number, isActive: boolean): Promise<UserRoleType> {
    return fetchApi<UserRoleType>(`/rbac/role-types/${id}/toggle`, {
      method: 'PUT',
      body: JSON.stringify({ isActive }),
    });
  },

  async getMatrixByLevel(id: number): Promise<{ roleGroupId: number; byModule: Record<string, LevelState> }> {
    return fetchApi<{ roleGroupId: number; byModule: Record<string, LevelState> }>(
      `/rbac/role-groups/${id}/matrix-level`,
    );
  },

  async assignPermissionsByLevel(
    id: number,
    levelsByModule: Record<string, LevelState>,
  ): Promise<{ permissionCount: number }> {
    return fetchApi<{ permissionCount: number }>(`/rbac/role-groups/${id}/permissions-level`, {
      method: 'PUT',
      body: JSON.stringify({ levelsByModule }),
    });
  },
};
