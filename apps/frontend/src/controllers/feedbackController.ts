import { fetchApi } from '../utils/api';
import { eden, unwrap } from '../utils/eden';

export interface SystemFeedback {
  id: number;
  userId: number;
  kategori: string;
  judul: string;
  pesan: string;
  rating?: number | null;
  status: string;
  createdAt: string;
  updatedAt?: string;
  likeCount?: number;
  commentCount?: number;
  user?: { id: number; nama: string; email: string; role: string };
}

export interface FeedbackComment {
  id: number;
  feedbackId: number;
  userId: number;
  pesan: string;
  createdAt: string;
  updatedAt?: string;
  user?: { id: number; nama: string; email: string; role: string };
}

export interface FeedbackDetail extends SystemFeedback {
  isLiked: boolean;
  comments: FeedbackComment[];
}

export interface FeedbackListResponse {
  data: SystemFeedback[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

type FeedbackSingleEden = Promise<{ data?: SystemFeedback | null; error?: unknown }>;
type FeedbackListEden = Promise<{ data?: FeedbackListResponse | null; error?: unknown }>;

export const feedbackController = {
  async create(payload: {
    kategori: string;
    judul: string;
    pesan: string;
    rating?: number | null;
  }): Promise<SystemFeedback> {
    return unwrap<SystemFeedback>(eden.feedback.post(payload) as unknown as FeedbackSingleEden);
  },

  async getAll(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<FeedbackListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.sortBy) query.append('sortBy', params.sortBy);
    if (params?.sortOrder) query.append('sortOrder', params.sortOrder);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchApi<FeedbackListResponse>(`/feedback${qs}`);
  },

  async getById(id: number): Promise<FeedbackDetail> {
    return fetchApi<FeedbackDetail>(`/feedback/${id}`);
  },

  async update(
    id: number,
    data: Partial<{ kategori: string; judul: string; pesan: string; rating?: number | null }>,
  ): Promise<SystemFeedback> {
    return fetchApi<SystemFeedback>(`/feedback/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async remove(id: number): Promise<{ success: boolean }> {
    return fetchApi<{ success: boolean }>(`/feedback/${id}`, {
      method: 'DELETE',
    });
  },

  async addComment(id: number, pesan: string): Promise<FeedbackComment> {
    return fetchApi<FeedbackComment>(`/feedback/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ pesan }),
    });
  },

  async toggleLike(id: number): Promise<{ liked: boolean; likeCount: number }> {
    return fetchApi<{ liked: boolean; likeCount: number }>(`/feedback/${id}/like`, {
      method: 'POST',
    });
  },

  async updateStatus(id: number, status: string): Promise<SystemFeedback> {
    return fetchApi<SystemFeedback>(`/feedback/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
};
