import { eq } from 'drizzle-orm';
import { users } from '../models/schema';
import { AuthService } from '../services/auth.service';
import { db } from '../utils/db';

export interface GoogleUserProfile {
  id: string;
  email: string;
  verified_email?: boolean;
  name: string;
  picture?: string;
  hd?: string;
}

export class SsoService {
  static getGoogleAuthUrl(): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId || clientId.trim() === '' || clientId.includes('dummy-client-id')) {
      throw new Error('Google OAuth Client ID belum dikonfigurasi pada server (GOOGLE_CLIENT_ID).');
    }

    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/auth/google/callback';
    const scope = encodeURIComponent('openid email profile');
    const responseType = 'code';
    const prompt = 'select_account';

    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId.trim(),
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}&scope=${scope}&prompt=${prompt}`;
  }

  static async handleGoogleCallback(code: string) {
    if (!code || code.trim() === '') {
      throw new Error('Authorization code dari Google wajib diisi');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/auth/google/callback';

    if (!clientId || !clientSecret || clientId.includes('dummy-client-id')) {
      throw new Error('Kredensial Google OAuth belum dikonfigurasi lengkap di server');
    }

    // 1. Pertukaran authorization code ke Google Token Endpoint
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorJson = (await tokenResponse.json().catch(() => ({}))) as {
        error_description?: string;
        error?: string;
      };
      throw new Error(errorJson.error_description || errorJson.error || 'Gagal menukar token dengan Google OAuth');
    }

    const tokens = (await tokenResponse.json()) as { access_token: string; id_token?: string };

    // 2. Ambil profil user dari Google API
    const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userinfoResponse.ok) {
      throw new Error('Gagal mengambil informasi profil pengguna dari Google');
    }

    const googleUser = (await userinfoResponse.json()) as GoogleUserProfile;

    if (!googleUser.email) {
      throw new Error('Email pengguna tidak ditemukan dalam profil Google');
    }

    const emailLower = googleUser.email.toLowerCase().trim();

    // 3. Validasi domain email jika GOOGLE_ALLOWED_DOMAINS diset
    const allowedDomains = (process.env.GOOGLE_ALLOWED_DOMAINS || 'politekniksorowako.ac.id')
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter((d) => d.length > 0);

    const emailDomain = emailLower.split('@')[1];
    if (allowedDomains.length > 0 && !allowedDomains.includes(emailDomain)) {
      throw new Error(
        `Domain email @${emailDomain} tidak diizinkan. Gunakan email domain resmi kampus (@politekniksorowako.ac.id)`,
      );
    }

    // 4. Pencocokan akun di database
    let [user] = await db.select().from(users).where(eq(users.email, emailLower)).limit(1);

    if (!user) {
      // Auto-provision user baru dengan role mahasiswa jika terdaftar dengan email kampus resmi
      const randomPassword = `${crypto.randomUUID()}A1!`;
      const hashedPassword = await AuthService.hashPassword(randomPassword);

      const [newUser] = await db
        .insert(users)
        .values({
          email: emailLower,
          password: hashedPassword,
          nama: googleUser.name || emailLower.split('@')[0],
          role: 'mahasiswa',
          isActive: true,
        })
        .returning();

      user = newUser;
    } else {
      // Jika user sudah ada, pastikan aktif
      if (!user.isActive) {
        await db.update(users).set({ isActive: true }).where(eq(users.id, user.id));
        user.isActive = true;
      }
    }

    const roles = await AuthService.getRolesForUser(user.id);

    return {
      id: user.id,
      email: user.email,
      nama: user.nama,
      role: user.role,
      roles,
      isActive: user.isActive,
      isGlobalScope: user.isGlobalScope ?? false,
      mustChangePassword: user.mustChangePassword ?? false,
      theme: user.theme,
      avatar: user.avatar,
    };
  }
}
