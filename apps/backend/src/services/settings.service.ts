import { eq } from 'drizzle-orm';
import { systemSettings } from '../models/schema';
import { db } from '../utils/db';

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
}
