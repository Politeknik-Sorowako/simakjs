import { fetchApi } from '../utils/api';

export interface SystemPublicSettings {
  featureFeedbackEnabled: boolean;
}

export interface SystemSettingItem {
  key: string;
  value: string;
  description?: string;
  updatedAt?: string;
}

export const settingsController = {
  async getPublicSettings(): Promise<SystemPublicSettings> {
    try {
      const res = await fetchApi<{ data: SystemPublicSettings }>('/settings/public');
      return res.data || { featureFeedbackEnabled: true };
    } catch {
      return { featureFeedbackEnabled: true };
    }
  },

  async getAll(): Promise<SystemSettingItem[]> {
    const res = await fetchApi<{ data: SystemSettingItem[] }>('/settings');
    return res.data || [];
  },

  async updateSetting(key: string, value: string, description?: string): Promise<SystemSettingItem> {
    const res = await fetchApi<{ data: SystemSettingItem }>('/settings', {
      method: 'PUT',
      body: JSON.stringify({ key, value, description }),
    });
    return res.data;
  },
};
