import { eq } from 'drizzle-orm';
import { systemSettings } from '../models/schema';
import { db } from '../utils/db';

export type FeedbackAccessMode = 'full' | 'restricted';

export interface FeedbackAccessConfig {
  mode: FeedbackAccessMode;
  allowedRoles: string[];
}

const DEFAULT_FEEDBACK_ALLOWED_ROLES = ['admin', 'super_admin', 'prodi', 'dosen', 'mahasiswa'];

export class SettingsService {
  static async get(key: string): Promise<string | null> {
    try {
      const res = await db.query.systemSettings.findFirst({
        where: eq(systemSettings.key, key),
      });
      return res?.value ?? null;
    } catch (err: unknown) {
      console.warn('[SettingsService] Failed to query system_settings:', err instanceof Error ? err.message : err);
      return null;
    }
  }

  static async getAll() {
    try {
      return await db.query.systemSettings.findMany();
    } catch (err: unknown) {
      console.warn('[SettingsService] Failed to query all system_settings:', err instanceof Error ? err.message : err);
      return [];
    }
  }

  static async set(key: string, value: string, description?: string) {
    const [setting] = await db
      .insert(systemSettings)
      .values({ key, value, description })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value, description, updatedAt: new Date() },
      })
      .returning();
    return setting;
  }

  static async isFeedbackEnabled(): Promise<boolean> {
    try {
      const val = await SettingsService.get('feature_feedback_enabled');
      return val !== 'false';
    } catch {
      return true;
    }
  }

  static async getFeedbackAccessConfig(): Promise<FeedbackAccessConfig> {
    const [modeRaw, rolesRaw] = await Promise.all([
      SettingsService.get('feedback_access_mode'),
      SettingsService.get('feedback_allowed_roles'),
    ]);

    const mode: FeedbackAccessMode = modeRaw === 'restricted' ? 'restricted' : 'full';
    const allowedRoles = (rolesRaw ?? DEFAULT_FEEDBACK_ALLOWED_ROLES.join(','))
      .split(',')
      .map((role) => role.trim())
      .filter((role) => role.length > 0);

    return { mode, allowedRoles };
  }

  static async setFeedbackAccessConfig(
    mode: FeedbackAccessMode,
    allowedRoles: string[],
  ): Promise<FeedbackAccessConfig> {
    const normalizedRoles = allowedRoles.map((role) => role.trim()).filter((role) => role.length > 0);

    await SettingsService.set(
      'feedback_access_mode',
      mode,
      'Mode akses modul evaluasi & feedback sistem (full|restricted).',
    );
    await SettingsService.set(
      'feedback_allowed_roles',
      normalizedRoles.join(','),
      'Daftar role yang diizinkan mengakses feedback saat mode restricted.',
    );

    return { mode, allowedRoles: normalizedRoles };
  }
}
