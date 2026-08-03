import { FeedbackService } from '../services/feedback.service';
import type { AuthContext } from '../utils/types';

export class FeedbackController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async create({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      return await FeedbackService.create({
        userId: user.id,
        kategori: body.kategori,
        judul: body.judul,
        pesan: body.pesan,
        rating: body.rating,
      });
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getAll({ set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      if (user.role === 'admin' || user.role === 'super_admin') {
        return await FeedbackService.getAll();
      }
      return await FeedbackService.getByUserId(user.id);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async updateStatus({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await FeedbackService.updateStatus(parseInt(params.id), body.status);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }
}
