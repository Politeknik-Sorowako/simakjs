import { beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { app } from '../app';
import { userRoles, users } from '../models/schema';
import { db } from '../utils/db';
import { isPrivilegedScope } from '../utils/dosen-scope';
import { getRoles, hasRole, validateRoleCombination } from '../utils/role';
import { allowed, type UserPayload, type UserRole } from '../utils/types';
import { clearDatabase, getAuthToken } from './test-helper';

function makeUser(roles: UserRole[], primary?: UserRole): UserPayload {
  return {
    id: 1,
    email: 'multi@test.com',
    nama: 'Multi Role',
    role: primary ?? roles[0],
    roles,
  };
}

async function loginMultiRole(email: string, password: string): Promise<string> {
  const response = await app.handle(
    new Request('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),
  );
  if (response.status !== 200) {
    throw new Error(`login failed (${response.status}): ${await response.text()}`);
  }
  const body = (await response.json()) as { token: string };
  return body.token;
}

describe('RBAC Multi-Role (union semantics)', () => {
  describe('unit: allowed / hasRole / getRoles', () => {
    it('grants access when ANY of the user roles matches (dosen + prodi)', () => {
      const user = makeUser(['dosen', 'prodi']);
      expect(allowed(user, ['prodi'])).toBe(true);
      expect(allowed(user, ['dosen'])).toBe(true);
      expect(allowed(user, ['admin'])).toBe(false);
      expect(hasRole(user, ['prodi', 'admin'])).toBe(true);
    });

    it('does not grant access for a role the user does not hold', () => {
      const user = makeUser(['dosen']);
      expect(allowed(user, ['prodi'])).toBe(false);
      expect(hasRole(user, ['admin', 'prodi'])).toBe(false);
    });

    it('falls back to the legacy primary role when roles[] is empty', () => {
      const user: UserPayload = {
        id: 2,
        email: 'legacy@test.com',
        nama: 'Legacy',
        role: 'prodi',
        roles: [],
      };
      expect(allowed(user, ['prodi'])).toBe(true);
      expect(hasRole(user, ['prodi'])).toBe(true);
      expect(getRoles(user)).toEqual(['prodi']);
    });

    it('returns false for null/undefined users', () => {
      expect(allowed(null, ['admin'])).toBe(false);
      expect(hasRole(undefined, ['admin'])).toBe(false);
      expect(getRoles(null)).toEqual([]);
    });
  });

  describe('unit: validateRoleCombination', () => {
    it('allows combining multi-role staff roles (dosen + prodi)', () => {
      expect(validateRoleCombination('prodi', ['dosen']).valid).toBe(true);
      expect(validateRoleCombination('dosen', ['prodi']).valid).toBe(true);
    });

    it('rejects mixing single-role with other roles (mahasiswa + dosen)', () => {
      expect(validateRoleCombination('mahasiswa', ['dosen']).valid).toBe(false);
      expect(validateRoleCombination('dosen', ['mahasiswa']).valid).toBe(false);
    });

    it('rejects assigning super_admin through the system', () => {
      expect(validateRoleCombination('super_admin', []).valid).toBe(false);
    });
  });

  describe('unit: isPrivilegedScope', () => {
    it('treats pure dosen/instruktur as scoped (not privileged)', () => {
      expect(isPrivilegedScope(makeUser(['dosen']))).toBe(false);
      expect(isPrivilegedScope(makeUser(['instruktur']))).toBe(false);
      expect(isPrivilegedScope(makeUser(['dosen', 'instruktur']))).toBe(false);
    });

    it('treats dosen + prodi as privileged (full access)', () => {
      expect(isPrivilegedScope(makeUser(['dosen', 'prodi']))).toBe(true);
      expect(isPrivilegedScope(makeUser(['dosen', 'admin']))).toBe(true);
      expect(isPrivilegedScope(makeUser(['instruktur', 'kaprodi']))).toBe(true);
    });

    it('keeps the legacy behavior for null and non-teaching roles', () => {
      expect(isPrivilegedScope(null)).toBe(true);
      expect(isPrivilegedScope(makeUser(['plp']))).toBe(true);
    });
  });

  describe('integration: union authorization on protected endpoints', () => {
    beforeEach(async () => {
      await clearDatabase();
    });

    it('lets a dosen + prodi user access a prodi-only endpoint', async () => {
      const email = 'dosen-prodi@test.com';
      const hashed = await Bun.password.hash('password123', { algorithm: 'bcrypt', cost: 10 });
      const [created] = await db
        .insert(users)
        .values({ email, password: hashed, nama: 'Dosen Prodi', role: 'dosen', isActive: true })
        .returning();
      await db.insert(userRoles).values([
        { userId: created.id, role: 'dosen' },
        { userId: created.id, role: 'prodi' },
      ]);

      const token = await loginMultiRole(email, 'password123');
      const response = await app.handle(
        new Request('http://localhost/kategori-bimbingan', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ nama: 'Kategori Multi Role' }),
        }),
      );

      expect(response.status).toBe(200);
    });

    it('still forbids a pure dosen user from the same prodi-only endpoint', async () => {
      const email = 'dosen-only@test.com';
      const hashed = await Bun.password.hash('password123', { algorithm: 'bcrypt', cost: 10 });
      const [created] = await db
        .insert(users)
        .values({ email, password: hashed, nama: 'Dosen Only', role: 'dosen', isActive: true })
        .returning();
      await db.insert(userRoles).values({ userId: created.id, role: 'dosen' });

      const token = await loginMultiRole(email, 'password123');
      const response = await app.handle(
        new Request('http://localhost/kategori-bimbingan', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ nama: 'Kategori Dosen Only' }),
        }),
      );

      expect(response.status).toBe(403);
    });

    it('persists multiple roles and syncs users.role to the first role', async () => {
      const adminToken = await getAuthToken('admin-multi@test.com', 'admin');
      const hashed = await Bun.password.hash('password123', { algorithm: 'bcrypt', cost: 10 });
      const [target] = await db
        .insert(users)
        .values({ email: 'target-multi@test.com', password: hashed, nama: 'Target', role: 'mahasiswa', isActive: true })
        .returning();

      const response = await app.handle(
        new Request(`http://localhost/users/${target.id}/roles`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ roles: ['dosen', 'prodi'] }),
        }),
      );

      expect(response.status).toBe(200);
      const rows = await db.select().from(userRoles).where(eq(userRoles.userId, target.id));
      expect(rows.map((r) => r.role).sort()).toEqual(['dosen', 'prodi']);
      const [updated] = await db.select().from(users).where(eq(users.id, target.id));
      expect(updated.role).toBe('dosen');
    });

    it('forbids a non-super_admin from granting super_admin', async () => {
      const adminToken = await getAuthToken('admin-grant@test.com', 'admin');
      const hashed = await Bun.password.hash('password123', { algorithm: 'bcrypt', cost: 10 });
      const [target] = await db
        .insert(users)
        .values({ email: 'target-grant@test.com', password: hashed, nama: 'Target', role: 'dosen', isActive: true })
        .returning();

      const response = await app.handle(
        new Request(`http://localhost/users/${target.id}/roles`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ roles: ['super_admin'] }),
        }),
      );

      expect(response.status).toBe(403);
      const rows = await db.select().from(userRoles).where(eq(userRoles.userId, target.id));
      expect(rows.length).toBe(0);
    });

    it('rejects an invalid combination (mahasiswa + dosen)', async () => {
      const adminToken = await getAuthToken('admin-invalid@test.com', 'admin');
      const hashed = await Bun.password.hash('password123', { algorithm: 'bcrypt', cost: 10 });
      const [target] = await db
        .insert(users)
        .values({ email: 'target-invalid@test.com', password: hashed, nama: 'Target', role: 'dosen', isActive: true })
        .returning();

      const response = await app.handle(
        new Request(`http://localhost/users/${target.id}/roles`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ roles: ['mahasiswa', 'dosen'] }),
        }),
      );

      expect(response.status).toBe(400);
    });
  });
});
