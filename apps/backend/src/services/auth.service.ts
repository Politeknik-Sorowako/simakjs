import { db } from '../utils/db';
import { users } from '../models/schema';
import { eq } from 'drizzle-orm';

export class AuthService {
  static async register(email: string, password: string, nama: string, role?: 'admin' | 'dosen' | 'mahasiswa' | 'prodi' | 'keuangan' | 'guest') {
    const hashedPassword = await Bun.password.hash(password, {
      algorithm: 'bcrypt',
      cost: 10,
    });

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        nama,
        role: role || 'mahasiswa',
        isActive: false, // Default is false, requires admin approval
      })
      .returning();

    return {
      id: newUser.id,
      email: newUser.email,
      nama: newUser.nama,
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
      nama: user.nama,
      role: user.role,
      isActive: user.isActive,
      theme: user.theme,
      avatar: user.avatar,
    };
  }
}
