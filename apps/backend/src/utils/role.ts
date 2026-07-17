import type { UserRole } from './types';

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
