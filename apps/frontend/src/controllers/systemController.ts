import { fetchApi } from '../utils/api';
import { eden, unwrap } from '../utils/eden';

export interface VersionInfo {
  name?: string;
  version: string;
  buildNumber: string;
  gitCommitHash?: string | null;
  environment: string;
  lastUpdated: string;
  source?: string | null;
  parameters?: Record<string, unknown>;
}

export interface HealthStatus {
  status: string;
  uptime?: number;
  database?: string;
  memory?: number;
}

export interface SystemParameter {
  key: string;
  value: string | number | boolean;
  paramType: string;
  description: string;
  defaultValue: string | number | boolean;
  updatedAt?: string;
  updatedBy?: number | null;
}

type SystemParamsEden = Promise<{ data?: { data: SystemParameter[] } | null; error?: unknown }>;

export const systemController = {
  async getVersion(): Promise<VersionInfo> {
    return unwrap<VersionInfo>(eden.system.version.get());
  },

  async getHealth(): Promise<HealthStatus> {
    return unwrap<HealthStatus>(eden.system.health.get());
  },

  async getParameters(): Promise<SystemParameter[]> {
    const res = await unwrap<{ data: SystemParameter[] }>(eden.system.parameters.get() as unknown as SystemParamsEden);
    return res.data || [];
  },

  async updateParameter(key: string, value: string, description?: string): Promise<{ key: string; value: string }> {
    return fetchApi<{ key: string; value: string }>(`/system/parameters/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value, description }),
    });
  },
};
