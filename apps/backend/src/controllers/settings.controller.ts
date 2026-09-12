import { SettingsService } from '../services/settings.service';
import { SystemParameterService } from '../services/system-parameter.service';
import { hasRole } from '../utils/role';
import type { AuthContext } from '../utils/types';

export class SettingsController {
  // Public setting status (no auth needed)
  static async getPublicSettings({ set }: { set: { status?: number | string } }): Promise<{
    data: { featureFeedbackEnabled: boolean; krsMandiriEnabled: boolean };
  }> {
    try {
      const [feedbackEnabled, krsMandiriEnabled] = await Promise.all([
        SettingsService.isFeedbackEnabled(),
        SystemParameterService.isKrsMandiriEnabled(),
      ]);
      return {
        data: {
          featureFeedbackEnabled: feedbackEnabled,
          krsMandiriEnabled,
        },
      };
    } catch {
      return {
        data: {
          featureFeedbackEnabled: true,
          krsMandiriEnabled: true,
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

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getFeedbackConfig({ getCurrentUser, set }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user || hasRole(user, ['guest'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }

      const config = await SettingsService.getFeedbackAccessConfig();
      return { data: config };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mengambil konfigurasi akses feedback' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async updateFeedbackConfig({ getCurrentUser, body, set }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user || !hasRole(user, ['admin', 'super_admin'])) {
        set.status = 403;
        return { error: 'Hanya Admin atau Super Admin yang dapat mengubah pengaturan akses feedback' };
      }

      const { mode, allowedRoles } = body as { mode?: string; allowedRoles?: unknown };
      const normalizedMode: 'full' | 'restricted' = mode === 'restricted' ? 'restricted' : 'full';
      const roles = Array.isArray(allowedRoles)
        ? allowedRoles.filter((role): role is string => typeof role === 'string')
        : [];

      const config = await SettingsService.setFeedbackAccessConfig(normalizedMode, roles);
      return { message: 'Pengaturan akses feedback berhasil diperbarui', data: config };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memperbarui konfigurasi akses feedback' };
    }
  }
}
