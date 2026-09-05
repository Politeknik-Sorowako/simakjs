import { eq } from 'drizzle-orm';
import { userRoles, users } from '../models/schema';
import { db } from '../utils/db';
import type { UserRole } from '../utils/types';
import { AuthService } from './auth.service';

export interface GoogleUserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  hd?: string;
  email_verified?: boolean;
}

export class SsoService {
  static getGoogleAuthUrl(state = 'sso'): string {
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/auth/google/callback';
    const allowedDomain = process.env.GOOGLE_ALLOWED_DOMAINS || 'politekniksorowako.ac.id';

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'openid email profile',
      hd: allowedDomain,
      state,
      prompt: 'select_account',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  static async exchangeCodeForGoogleUser(code: string): Promise<GoogleUserProfile> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/auth/google/callback';

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth Client ID / Secret belum dikonfigurasi di server.');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'Gagal menukar kode otorisasi Google.');
    }

    const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = (await userinfoResponse.json()) as GoogleUserProfile;
    if (!userinfoResponse.ok || !profile.email) {
      throw new Error('Gagal mengambil informasi profil dari Google.');
    }

    // Validate domain
    const allowedDomains = (process.env.GOOGLE_ALLOWED_DOMAINS || 'politekniksorowako.ac.id')
      .split(',')
      .map((d) => d.trim().toLowerCase());

    const emailDomain = profile.email.split('@')[1]?.toLowerCase();
    const isDomainAllowed = allowedDomains.some(
      (domain) => emailDomain === domain || profile.hd?.toLowerCase() === domain,
    );

    if (!isDomainAllowed) {
      throw new Error(
        `Domain email Google Anda (@${emailDomain}) tidak diizinkan. Hanya email domain @${allowedDomains.join(', @')} yang diizinkan.`,
      );
    }

    return profile;
  }

  static async findOrCreateGoogleUser(profile: GoogleUserProfile) {
    const emailLower = profile.email.toLowerCase().trim();

    // Validate domain
    const allowedDomains = (process.env.GOOGLE_ALLOWED_DOMAINS || 'politekniksorowako.ac.id')
      .split(',')
      .map((d) => d.trim().toLowerCase());

    const emailDomain = emailLower.split('@')[1]?.toLowerCase();
    const isDomainAllowed = allowedDomains.some(
      (domain) => emailDomain === domain || profile.hd?.toLowerCase() === domain,
    );

    if (!isDomainAllowed) {
      throw new Error(
        `Domain email Google Anda (@${emailDomain}) tidak diizinkan. Hanya email domain @${allowedDomains.join(', @')} yang diizinkan.`,
      );
    }

    // 1. Search by googleId
    let [user] = await db.select().from(users).where(eq(users.googleId, profile.id)).limit(1);

    // 2. Search by email if not found by googleId
    if (!user) {
      [user] = await db.select().from(users).where(eq(users.email, emailLower)).limit(1);
      if (user) {
        // Link googleId to existing user
        const [updated] = await db
          .update(users)
          .set({
            googleId: profile.id,
            authProvider: 'google',
            isActive: true, // Google Workspace users are auto-activated
          })
          .where(eq(users.id, user.id))
          .returning();
        user = updated;
      }
    }

    // 3. Auto-provision if user does not exist at all
    if (!user) {
      const dummyPassword = await AuthService.hashPassword(crypto.randomUUID());
      const defaultRole: UserRole = 'mahasiswa';

      const [newUser] = await db
        .insert(users)
        .values({
          email: emailLower,
          password: dummyPassword,
          nama: profile.name || emailLower.split('@')[0],
          role: defaultRole,
          isActive: true,
          googleId: profile.id,
          authProvider: 'google',
          avatar: profile.picture,
        })
        .returning();

      await db.insert(userRoles).values({ userId: newUser.id, role: defaultRole });
      user = newUser;
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
      twoFactorEnabled: user.twoFactorEnabled,
    };
  }
}
