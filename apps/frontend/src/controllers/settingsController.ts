import { eden, unwrap } from '../utils/eden';

export interface SystemPublicSettings {
  featureFeedbackEnabled: boolean;
}

export interface SystemSettingItem {
  key: string;
  value: string;
  description?: string;
  updatedAt?: string;
}

interface SettingsData {
  data: { featureFeedbackEnabled: boolean };
}

interface SettingsResponse {
  data: {
    key: string;
    value: string | null;
    description: string | null;
    updatedAt: Date | null;
  }[];
}

interface UpdateResponse {
  data: {
    key: string;
    value: string | null;
    updatedAt: Date | null;
    description: string | null;
  };
  message?: string;
}

export const settingsController = {
  async getPublicSettings(): Promise<SystemPublicSettings> {
    try {
      const res = await unwrap<SettingsData>(eden.settings.public.get());
      return { featureFeedbackEnabled: res.data.featureFeedbackEnabled };
    } catch {
      return { featureFeedbackEnabled: true };
    }
  },

  async getAll(): Promise<SystemSettingItem[]> {
    const res = await unwrap<SettingsResponse>(eden.settings.get());
    return res.data.map((s) => ({
      key: s.key,
      value: s.value || '',
      description: s.description || undefined,
      updatedAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : undefined,
    }));
  },

  async updateSetting(key: string, value: string, description?: string): Promise<SystemSettingItem> {
    const res = await unwrap<UpdateResponse>(eden.settings.put({ key, value, description }));
    return {
      key: res.data.key,
      value: res.data.value || '',
      description: res.data.description || undefined,
      updatedAt: res.data.updatedAt ? new Date(res.data.updatedAt).toISOString() : undefined,
    };
  },
};
