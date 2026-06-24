import { db } from '../utils/db';
import { users } from '../models/schema';
import { eq } from 'drizzle-orm';

export class AuthService {
  static async register(email: string, password: string, role?: 'admin' | 'dosen' | 'mahasiswa') {
    const hashedPassword = await Bun.password.hash(password, {
      algorithm: 'bcrypt',
      cost: 10,
    });

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        role: role || 'mahasiswa',
      })
      .returning();

    return {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
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

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
