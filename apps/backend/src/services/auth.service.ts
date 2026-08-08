import { eq } from 'drizzle-orm';
import { passwordResets, userRoles, users } from '../models/schema';
import { db } from '../utils/db';
import type { UserRole } from '../utils/types';

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export class AuthService {
  static async getRolesForUser(userId: number): Promise<UserRole[]> {
    const rows = await db.select({ role: userRoles.role }).from(userRoles).where(eq(userRoles.userId, userId));
    if (rows.length > 0) {
      return rows.map((r) => r.role);
    }
    const [legacy] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
    return legacy ? [legacy.role] : [];
  }

  static async register(
    email: string,
    password: string,
    nama: string,
    role?: 'admin' | 'dosen' | 'mahasiswa' | 'guest',
  ) {
    const hashedPassword = await Bun.password.hash(password, {
      algorithm: 'bcrypt',
      cost: 12,
    });

    const effectiveRole = role || 'mahasiswa';

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        nama,
        role: effectiveRole,
        isActive: false, // Default is false, requires admin approval
      })
      .returning();

    await db.insert(userRoles).values({ userId: newUser.id, role: effectiveRole });

    return {
      id: newUser.id,
      email: newUser.email,
      nama: newUser.nama,
      role: newUser.role,
      roles: [newUser.role as UserRole],
    };
  }

  static async validateUser(email: string, password: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return null;
    }

    const isMatch = await Bun.password.verify(password, user.password);
    if (!isMatch) {
      return null;
    }

    const roles = await AuthService.getRolesForUser(user.id);

    return {
      id: user.id,
      email: user.email,
      nama: user.nama,
      role: user.role,
      roles,
      isActive: user.isActive,
      isGlobalScope: user.isGlobalScope,
      mustChangePassword: user.mustChangePassword,
      theme: user.theme,
      avatar: user.avatar,
    };
  }

  static async findByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user || null;
  }

  static async createPasswordReset(email: string, token: string, expiresAt: Date) {
    const tokenHash = await hashToken(token);
    await db.delete(passwordResets).where(eq(passwordResets.email, email));
    await db.insert(passwordResets).values({ email, token: tokenHash, expiresAt });
  }

  static async getPasswordReset(token: string) {
    const tokenHash = await hashToken(token);
    const [record] = await db.select().from(passwordResets).where(eq(passwordResets.token, tokenHash)).limit(1);
    return record || null;
  }

  static async deletePasswordReset(id: number) {
    await db.delete(passwordResets).where(eq(passwordResets.id, id));
  }

  static async updatePassword(userId: number, hashedPassword: string) {
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));
  }

  static async hashPassword(password: string) {
    return await Bun.password.hash(password, { algorithm: 'bcrypt', cost: 12 });
  }
}
