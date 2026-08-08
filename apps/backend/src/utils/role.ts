import type { UserPayload, UserRole } from './types';

export function hasRole(
  user: { role: UserRole; roles?: UserRole[] } | null | undefined,
  allowedRoles: UserRole[],
): boolean {
  if (!user) return false;
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    return user.roles.some((r) => allowedRoles.includes(r));
  }
  return allowedRoles.includes(user.role);
}

export function getRoles(user: UserPayload | null | undefined): UserRole[] {
  if (!user) return [];
  if (Array.isArray(user.roles) && user.roles.length > 0) return user.roles;
  return [user.role];
}

/** Roles that are restricted to a SINGLE role per user (cannot be combined). */
export const SINGLE_ROLE_ONLY: UserRole[] = ['super_admin', 'mahasiswa', 'guest', 'calon_mahasiswa'];

/** Roles that MAY be combined with others (multi-role users). */
export const MULTI_ROLE_ALLOWED: UserRole[] = ['admin', 'kaprodi', 'prodi', 'dosen', 'keuangan', 'plp', 'instruktur'];

export const VALID_ROLE_COMBINATIONS: Record<UserRole, { single: boolean }> = Object.fromEntries(
  [...SINGLE_ROLE_ONLY, ...MULTI_ROLE_ALLOWED].map((r) => [r, { single: SINGLE_ROLE_ONLY.includes(r) }]),
) as Record<UserRole, { single: boolean }>;

export function validateRoleCombination(
  roleToAdd: UserRole,
  currentRoles: UserRole[],
): { valid: boolean; reason?: string } {
  const target = VALID_ROLE_COMBINATIONS[roleToAdd];
  if (!target) return { valid: false, reason: 'Role tidak dikenal.' };
  if (roleToAdd === 'super_admin') {
    return { valid: false, reason: 'Role Super Admin tidak dapat diubah melalui sistem.' };
  }
  if (currentRoles.includes(roleToAdd)) {
    return { valid: false, reason: 'Role sudah dimiliki user.' };
  }
  if (target.single) {
    if (currentRoles.length > 0) {
      return { valid: false, reason: 'Role ini hanya dapat dimiliki seorang user (single role).' };
    }
    return { valid: true };
  }
  if (currentRoles.some((r) => SINGLE_ROLE_ONLY.includes(r))) {
    return { valid: false, reason: 'Role single-role tidak dapat dikombinasikan dengan role lain.' };
  }
  return { valid: true };
}

export function isAdminOrProdi(user: { role: UserRole } | null | undefined): boolean {
  return hasRole(user, ['admin', 'prodi']);
}

export function isAdminOrProdiOrDosen(user: { role: UserRole } | null | undefined): boolean {
  return hasRole(user, ['admin', 'prodi', 'dosen']);
}

export const STAFF_ROLES: UserRole[] = ['super_admin', 'admin', 'kaprodi', 'prodi', 'dosen', 'plp', 'instruktur'];

export function isStaff(user: { role: UserRole } | null | undefined): boolean {
  return hasRole(user, STAFF_ROLES);
}

export function isSuperAdminOrAdmin(user: { role: UserRole } | null | undefined): boolean {
  return hasRole(user, ['super_admin', 'admin']);
}

export function canAccessAllProdi(user: UserPayload | null | undefined): boolean {
  if (!user) return false;
  if (user.isGlobalScope) return true;
  return hasRole(user, ['super_admin', 'admin']);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  kaprodi: 'Kaprodi',
  prodi: 'Admin Prodi',
  dosen: 'Dosen',
  plp: 'PLP / Teknisi Lab',
  instruktur: 'Instruktur',
  mahasiswa: 'Mahasiswa',
  keuangan: 'Keuangan',
  guest: 'Guest',
  calon_mahasiswa: 'Calon Mahasiswa',
};
