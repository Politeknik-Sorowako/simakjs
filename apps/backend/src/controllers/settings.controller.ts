import { SettingsService } from '../services/settings.service';
import type { AuthContext } from '../utils/types';

export class SettingsController {
  // Public setting status (no auth needed)
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getPublicSettings({ set }: { set: any }): Promise<any> {
    try {
      const feedbackEnabled = await SettingsService.isFeedbackEnabled();
      return {
        data: {
          featureFeedbackEnabled: feedbackEnabled,
        },
      };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mengambil pengaturan sistem' };
    }
  }

  // Admin settings management
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getAll({ getCurrentUser, set }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user || (user.role !== 'admin' && user.role !== 'prodi')) {
        set.status = 403;
        return { error: 'Hanya Admin atau Prodi yang dapat mengakses pengaturan sistem' };
      }

      const settings = await SettingsService.getAll();
      return { data: settings };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mengambil pengaturan sistem' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async updateSetting({ getCurrentUser, body, set }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user || user.role !== 'admin') {
        set.status = 403;
        return { error: 'Hanya Admin yang dapat mengubah pengaturan sistem' };
      }

      const { key, value, description } = body as { key: string; value: string; description?: string };
      const updated = await SettingsService.set(key, value, description);
      return { message: 'Pengaturan berhasil diperbarui', data: updated };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memperbarui pengaturan' };
    }
  }
}
