import { API_URL, fetchApi } from '../utils/api';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId?: number | null;
  userRole?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
  module: string;
  entityId?: string | null;
  entityName?: string | null;
  description: string;
  metadata?: Record<string, unknown> | null;
}

export interface AuditLogResponse {
  data: AuditLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  module?: string;
  actionType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export const auditController = {
  getAll: (params?: AuditLogFilters): Promise<AuditLogResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.module) searchParams.set('module', params.module);
    if (params?.actionType) searchParams.set('actionType', params.actionType);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.search) searchParams.set('search', params.search);
    const qs = searchParams.toString();
    return fetchApi<AuditLogResponse>(`/audit-logs${qs ? `?${qs}` : ''}`);
  },

  exportCsv: async (params?: AuditLogFilters): Promise<void> => {
    const searchParams = new URLSearchParams();
    if (params?.module) searchParams.set('module', params.module);
    if (params?.actionType) searchParams.set('actionType', params.actionType);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.search) searchParams.set('search', params.search);
    const qs = searchParams.toString();
    const res = await fetch(`${API_URL}/audit-logs/export${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Gagal mengekspor audit log');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  purge: async (days = 200): Promise<{ message: string; deleted: number }> => {
    return fetchApi<{ message: string; deleted: number }>(`/audit-logs/purge?days=${days}`, {
      method: 'DELETE',
    });
  },
};
