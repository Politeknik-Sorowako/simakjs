import { eq } from 'drizzle-orm';
import { permissions, roleGroupPermissions, roleGroups } from '../models/schema';
import { db } from '../utils/db';

export type PermissionAction = 'view' | 'create' | 'update' | 'delete' | 'export' | 'approve';

export const DEFAULT_MODULES = [
  'dashboard',
  'mahasiswa',
  'dosen',
  'krs',
  'presensi',
  'kompensasi',
  'nilai',
  'laporan',
  'feedback',
  'konfigurasi',
];

const ROLE_TO_GROUP: Record<string, string> = {
  super_admin: 'Superadmin',
  admin: 'Administrator',
  kaprodi: 'Kaprodi',
  prodi: 'Kaprodi',
  dosen: 'Dosen Pengampu',
  mahasiswa: 'Mahasiswa',
  plp: 'PLP / Teknisi Lab / Instruktur',
  instruktur: 'PLP / Teknisi Lab / Instruktur',
  keuangan: 'Admin Akademik (BAAK)',
};

const ROLE_GROUP_PROFILE: Record<string, string[]> = {
  Superadmin: ['view', 'create', 'update', 'delete', 'export', 'approve'],
  Administrator: ['view', 'create', 'update', 'delete', 'export', 'approve'],
  'Admin Akademik (BAAK)': ['view', 'create', 'update', 'delete', 'export', 'approve'],
  Kaprodi: ['view', 'create', 'update', 'export', 'approve'],
  'Dosen Pengampu': ['view', 'create', 'update', 'export'],
  'Pembimbing Akademik (PA)': ['view', 'export'],
  'PLP / Teknisi Lab / Instruktur': ['view', 'create', 'update', 'approve'],
  Mahasiswa: ['view'],
};

export class RbacService {
  static async getAllRoleGroups() {
    const groupRows = await db.select().from(roleGroups).orderBy(roleGroups.id, roleGroups.name);
    const joinRows = await db.select().from(roleGroupPermissions);
    const permRows = await db.select().from(permissions);

    const permMap = new Map(permRows.map((p) => [p.id, p]));

    return groupRows.map((g) => {
      const actionsByModule: Record<string, string[]> = {};
      for (const j of joinRows) {
        if (j.roleGroupId !== g.id) continue;
        const p = permMap.get(j.permissionId);
        if (!p) continue;
        actionsByModule[p.module] = actionsByModule[p.module] || [];
        if (!actionsByModule[p.module].includes(p.action)) actionsByModule[p.module].push(p.action);
      }
      return { ...g, actionsByModule };
    });
  }

  static async createRoleGroup(data: { name: string; description?: string; isActive?: boolean }) {
    const [row] = await db
      .insert(roleGroups)
      .values({ name: data.name, description: data.description ?? null, isActive: data.isActive ?? true })
      .returning();
    return row;
  }

  static async updateRoleGroup(id: number, data: { name?: string; description?: string; isActive?: boolean }) {
    const [row] = await db
      .update(roleGroups)
      .set({ name: data.name, description: data.description, isActive: data.isActive })
      .where(eq(roleGroups.id, id))
      .returning();
    return row || null;
  }

  static async deleteRoleGroup(id: number) {
    const [row] = await db.delete(roleGroups).where(eq(roleGroups.id, id)).returning();
    return row || null;
  }

  static async getAllPermissions() {
    return await db.select().from(permissions).orderBy(permissions.module, permissions.action);
  }

  static async assignPermissions(roleGroupId: number, permissionIds: number[]) {
    return await db.transaction(async (tx) => {
      await tx.delete(roleGroupPermissions).where(eq(roleGroupPermissions.roleGroupId, roleGroupId));
      if (permissionIds.length > 0) {
        await tx
          .insert(roleGroupPermissions)
          .values(permissionIds.map((permissionId) => ({ roleGroupId, permissionId })));
      }
      return { roleGroupId, permissionCount: permissionIds.length };
    });
  }

  static async getRoleGroupMatrix(roleGroupId: number) {
    const groupJoin = await db
      .select()
      .from(roleGroupPermissions)
      .innerJoin(permissions, eq(roleGroupPermissions.permissionId, permissions.id))
      .where(eq(roleGroupPermissions.roleGroupId, roleGroupId));
    const byModule: Record<string, string[]> = {};
    for (const row of groupJoin) {
      const p = row.permissions;
      byModule[p.module] = byModule[p.module] || [];
      if (!byModule[p.module].includes(p.action)) byModule[p.module].push(p.action);
    }
    return byModule;
  }

  static async hasRolePermission(role: string, module: string, action: string): Promise<boolean> {
    if (role === 'super_admin' || role === 'admin') return true;
    const group = ROLE_TO_GROUP[role];
    const profile = group ? ROLE_GROUP_PROFILE[group] : undefined;
    if (profile && profile.includes(action)) return true;
    return false;
  }
}
