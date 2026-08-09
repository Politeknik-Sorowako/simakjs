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
  user?: { id: number; nama: string; email: string; role: string };
}

type FeedbackSingleEden = Promise<{ data?: SystemFeedback | null; error?: unknown }>;
type FeedbackListEden = Promise<{ data?: SystemFeedback[] | null; error?: unknown }>;

export const feedbackController = {
  async create(payload: {
    kategori: string;
    judul: string;
    pesan: string;
    rating?: number | null;
  }): Promise<SystemFeedback> {
    return unwrap<SystemFeedback>(eden.feedback.post(payload) as unknown as FeedbackSingleEden);
  },

  async getAll(): Promise<SystemFeedback[]> {
    return unwrap<SystemFeedback[]>(eden.feedback.get() as unknown as FeedbackListEden);
  },

  async updateStatus(id: number, status: string): Promise<SystemFeedback> {
    return fetchApi<SystemFeedback>(`/feedback/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },
};
