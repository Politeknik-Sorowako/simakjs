import { SettingsService } from '../services/settings.service';
import { hasRole } from '../utils/role';
import type { AuthContext } from '../utils/types';

export class SettingsController {
  // Public setting status (no auth needed)
  static async getPublicSettings({ set }: { set: { status?: number | string } }): Promise<{
    data: { featureFeedbackEnabled: boolean };
  }> {
    try {
      const feedbackEnabled = await SettingsService.isFeedbackEnabled();
      return {
        data: {
          featureFeedbackEnabled: feedbackEnabled,
        },
      };
    } catch {
      return {
        data: {
          featureFeedbackEnabled: true,
        },
      };
    }
  }

  // Admin settings management
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getAll({ getCurrentUser, set }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user || !hasRole(user, ['admin', 'prodi'])) {
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
      if (!user || !hasRole(user, ['admin'])) {
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
