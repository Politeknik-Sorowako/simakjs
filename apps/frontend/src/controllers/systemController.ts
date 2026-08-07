import { fetchApi } from '../utils/api';

export interface VersionInfo {
  name?: string;
  version: string;
  buildNumber: string;
  gitCommitHash?: string | null;
  environment: string;
  lastUpdated: string;
  source?: string;
}

export interface SystemParameter {
  key: string;
  value: string;
  paramType: string;
  description: string;
  defaultValue: string;
  updatedAt?: string;
  updatedBy?: number | null;
}

export interface HealthStatus {
  status: string;
  database: string;
  cache: string;
  timestamp: string;
}

export const systemController = {
  async getVersion(): Promise<VersionInfo> {
    return fetchApi<VersionInfo>('/system/version');
  },

  async getHealth(): Promise<HealthStatus> {
    return fetchApi<HealthStatus>('/system/health');
  },

  async getParameters(): Promise<SystemParameter[]> {
    return fetchApi<{ data: SystemParameter[] }>('/system/parameters').then((r) => r?.data || []);
  },

  async updateParameter(key: string, value: string, description?: string): Promise<{ key: string; value: string }> {
    return fetchApi<{ key: string; value: string }>(`/system/parameters/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value, description }),
    });
  },
};
