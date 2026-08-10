import { FeedbackService } from '../services/feedback.service';
import { SettingsService } from '../services/settings.service';
import { hasRole } from '../utils/role';
import type { AuthContext } from '../utils/types';

export class FeedbackController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async create({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const isEnabled = await SettingsService.isFeedbackEnabled();
      if (!isEnabled) {
        set.status = 403;
        return { error: 'Modul Evaluasi dan Feedback Sistem sedang dinonaktifkan oleh administrator.' };
      }

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
      console.error('[FeedbackController.create] Error:', e instanceof Error ? e.message : e);
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
      if (hasRole(user, ['admin', 'super_admin'])) {
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
      if (!user || !hasRole(user, ['admin', 'super_admin'])) {
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
