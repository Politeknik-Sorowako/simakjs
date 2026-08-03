import { fetchApi } from '../utils/api';

export interface SystemFeedback {
  id: number;
  userId: number;
  kategori: string;
  judul: string;
  pesan: string;
  rating?: number | null;
  status: string;
  createdAt: string;
  user?: { id: number; nama: string; email: string; role: string };
}

export const feedbackController = {
  async create(payload: {
    kategori: string;
    judul: string;
    pesan: string;
    rating?: number | null;
  }): Promise<SystemFeedback> {
    return fetchApi<SystemFeedback>('/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getAll(): Promise<SystemFeedback[]> {
    return fetchApi<SystemFeedback[]>('/feedback');
  },

  async updateStatus(id: number, status: string): Promise<SystemFeedback> {
    return fetchApi<SystemFeedback>(`/feedback/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
};
