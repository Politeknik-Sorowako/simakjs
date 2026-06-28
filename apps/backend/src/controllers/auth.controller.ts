import { AuthService } from '../services/auth.service';
import { AuthContext } from '../utils/types';
import { db } from '../utils/db';
import { users, passwordResets } from '../models/schema';
import { eq } from 'drizzle-orm';

export class AuthController {
  static async register({ body, set }: AuthContext) {
    try {
      const user = await AuthService.register(body.email, body.password, body.nama, body.role);
      set.status = 201;
      return {
        message: 'Registrasi berhasil',
        user,
      };
    } catch (e) {
      set.status = 400;
      return { error: 'Email sudah terdaftar' };
    }
  }

  static async login({ body, jwt, set, cookie }: AuthContext & { jwt: { sign: (payload: Record<string, any>) => Promise<string> } }) {
    const user = await AuthService.validateUser(body.email, body.password);
    if (!user) {
      set.status = 401;
      return { error: 'Email atau password salah' };
    }
    if (!user.isActive) {
      set.status = 403;
      return { error: 'Akun Anda belum diaktifkan oleh Admin' };
    }
    const token = await jwt.sign({
      id: user.id,
      email: user.email,
      nama: user.nama,
      role: user.role,
      theme: user.theme,
    });
    
    // Set token in httpOnly cookie
    if (cookie && cookie.access_token) {
      cookie.access_token.set({
        value: token,
        httpOnly: true,
        secure: false, // Set to false to support dev without https
        path: '/',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });
    }

    return {
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        email: user.email,
        nama: user.nama,
        role: user.role,
        theme: user.theme,
      },
    };
  }

  static async forgotPassword({ body, set }: AuthContext) {
    try {
      const email = (body as any)?.email;
      if (!email) {
        set.status = 400;
        return { error: 'Email wajib diisi' };
      }

      // Check if user exists
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!user) {
        set.status = 404;
        return { error: 'Email tidak terdaftar' };
      }

      // Generate token
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour expiration

      // Delete old tokens and insert new one
      await db.delete(passwordResets).where(eq(passwordResets.email, email));
      await db.insert(passwordResets).values({
        email,
        token,
        expiresAt,
      });

      console.log(`[SIMAK RESET PASSWORD] Token untuk ${email}: ${token}`);

      return {
        message: 'Link/token reset password berhasil dibuat',
        token,
      };
    } catch (error: any) {
      set.status = 500;
      return { error: 'Gagal membuat token reset password', details: error.message };
    }
  }

  static async resetPassword({ body, set }: AuthContext) {
    try {
      const token = (body as any)?.token;
      const password = (body as any)?.password;

      if (!token || !password) {
        set.status = 400;
        return { error: 'Token dan password baru wajib diisi' };
      }

      if (password.length < 6) {
        set.status = 400;
        return { error: 'Password minimal harus 6 karakter' };
      }

      // Find token
      const [resetRecord] = await db.select().from(passwordResets).where(eq(passwordResets.token, token)).limit(1);
      if (!resetRecord) {
        set.status = 400;
        return { error: 'Token reset password tidak valid atau kedaluwarsa' };
      }

      // Check expiration
      if (resetRecord.expiresAt < new Date()) {
        await db.delete(passwordResets).where(eq(passwordResets.id, resetRecord.id));
        set.status = 400;
        return { error: 'Token reset password telah kedaluwarsa' };
      }

      // Find user
      const [user] = await db.select().from(users).where(eq(users.email, resetRecord.email)).limit(1);
      if (!user) {
        set.status = 404;
        return { error: 'Pengguna tidak ditemukan' };
      }

      // Hash password
      const hashedPassword = await Bun.password.hash(password, {
        algorithm: 'bcrypt',
        cost: 10,
      });

      // Update password
      await db.update(users).set({ password: hashedPassword }).where(eq(users.id, user.id));

      // Clean up token
      await db.delete(passwordResets).where(eq(passwordResets.id, resetRecord.id));

      return {
        message: 'Password Anda berhasil diubah. Silakan login kembali.',
      };
    } catch (error: any) {
      set.status = 500;
      return { error: 'Gagal menyetel ulang password', details: error.message };
    }
  }
}

