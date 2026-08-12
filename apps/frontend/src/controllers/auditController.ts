import { fetchApi } from '../utils/api';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId?: number | null;
  userRole?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN';
  module: string;
  entityId?: string | null;
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

  getById: (id: string): Promise<{ data: AuditLog }> => fetchApi<{ data: AuditLog }>(`/audit-logs/${id}`),
};
