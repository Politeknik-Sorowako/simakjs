import { eq } from 'drizzle-orm';
import { systemSettings } from '../models/schema';
import { db } from '../utils/db';

export class SettingsService {
  static async get(key: string) {
    const res = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, key),
    });
    return res?.value ?? null;
  }

  static async getAll() {
    return await db.query.systemSettings.findMany();
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
    const val = await SettingsService.get('feature_feedback_enabled');
    return val !== 'false';
  }
}
