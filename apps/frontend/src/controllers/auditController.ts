import { API_URL, fetchApi } from '../utils/api';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId?: number | null;
  userName?: string | null;
  userRole?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT';
  module: string;
  tableName?: string | null;
  entityId?: string | null;
  entityName?: string | null;
  description: string;
  detail?: string | null;
  statusCode?: number | null;
  isSuccess?: boolean | null;
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
  tableName?: string;
  userName?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  statusCategory?: 'all' | 'success' | 'client_error' | 'server_error' | 'failed';
  isFull?: boolean;
}

export const auditController = {
  getAll: (params?: AuditLogFilters): Promise<AuditLogResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.module) searchParams.set('module', params.module);
    if (params?.actionType) searchParams.set('actionType', params.actionType);
    if (params?.tableName) searchParams.set('tableName', params.tableName);
    if (params?.userName) searchParams.set('userName', params.userName);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.statusCategory && params.statusCategory !== 'all') {
      searchParams.set('statusCategory', params.statusCategory);
    }
    const qs = searchParams.toString();
    return fetchApi<AuditLogResponse>(`/audit-logs${qs ? `?${qs}` : ''}`);
  },

  exportCsv: async (params?: AuditLogFilters, isFullExport = false): Promise<void> => {
    const searchParams = new URLSearchParams();
    if (isFullExport || params?.isFull) {
      searchParams.set('full', 'true');
    } else {
      if (params?.module) searchParams.set('module', params.module);
      if (params?.actionType) searchParams.set('actionType', params.actionType);
      if (params?.tableName) searchParams.set('tableName', params.tableName);
      if (params?.userName) searchParams.set('userName', params.userName);
      if (params?.startDate) searchParams.set('startDate', params.startDate);
      if (params?.endDate) searchParams.set('endDate', params.endDate);
      if (params?.search) searchParams.set('search', params.search);
      if (params?.statusCategory && params.statusCategory !== 'all') {
        searchParams.set('statusCategory', params.statusCategory);
      }
    }
    const qs = searchParams.toString();
    const res = await fetch(`${API_URL}/audit-logs/export${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Gagal mengekspor audit log');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const prefix = isFullExport || params?.isFull ? 'all-audit-logs' : 'filtered-audit-logs';
    link.download = `${prefix}-${new Date().toISOString().split('T')[0]}.csv`;
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
