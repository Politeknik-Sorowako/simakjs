import type { UserPayload, UserRole } from './types';

export function hasRole(user: { role: UserRole } | null | undefined, allowedRoles: UserRole[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
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
