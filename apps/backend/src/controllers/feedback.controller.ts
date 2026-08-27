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
  static async getAll({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      // Semua user yang terautentikasi dapat melihat seluruh saran pengembangan
      // (papan saran kolaboratif), dengan sorting & pagination.
      return await FeedbackService.getAll({
        page: query?.page ? Number(query.page) : undefined,
        limit: query?.limit ? Number(query.limit) : undefined,
        sortBy: query?.sortBy,
        sortOrder: query?.sortOrder === 'asc' ? 'asc' : query?.sortOrder === 'desc' ? 'desc' : undefined,
      });
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getById({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      const id = parseInt(params.id);
      const feedback = await FeedbackService.getById(id, user.id);

      if (!feedback) {
        set.status = 404;
        return { error: 'Masukan tidak ditemukan.' };
      }

      return feedback;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async update({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      const id = parseInt(params.id);
      const existing = await FeedbackService.findByIdBasic(id);
      if (!existing) {
        set.status = 404;
        return { error: 'Masukan tidak ditemukan.' };
      }

      const isAuthor = existing.userId === user.id;
      if (!isAuthor && !hasRole(user, ['admin', 'super_admin'])) {
        set.status = 403;
        return { error: 'Akses ditolak. Hanya pengirim atau admin yang dapat mengedit masukan.' };
      }

      if (!body.kategori && !body.judul && !body.pesan && body.rating === undefined) {
        set.status = 400;
        return { error: 'Minimal satu field harus diisi.' };
      }

      const updated = await FeedbackService.update(id, {
        kategori: body.kategori ?? undefined,
        judul: body.judul ?? undefined,
        pesan: body.pesan ?? undefined,
        rating: body.rating !== undefined ? body.rating : undefined,
      });

      if (!updated) {
        set.status = 404;
        return { error: 'Masukan tidak ditemukan.' };
      }
      return updated;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async remove({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      const id = parseInt(params.id);
      const existing = await FeedbackService.findByIdBasic(id);
      if (!existing) {
        set.status = 404;
        return { error: 'Masukan tidak ditemukan.' };
      }

      const isAuthor = existing.userId === user.id;
      if (!isAuthor && !hasRole(user, ['admin', 'super_admin'])) {
        set.status = 403;
        return { error: 'Akses ditolak. Hanya pengirim atau admin yang dapat menghapus masukan.' };
      }

      const deleted = await FeedbackService.delete(id);
      if (!deleted) {
        set.status = 404;
        return { error: 'Masukan tidak ditemukan.' };
      }
      return { success: true };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getComments({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      const id = parseInt(params.id);
      const feedback = await FeedbackService.findByIdBasic(id);
      if (!feedback) {
        set.status = 404;
        return { error: 'Masukan tidak ditemukan.' };
      }
      return await FeedbackService.getComments(id);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async addComment({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      const id = parseInt(params.id);
      const feedback = await FeedbackService.findByIdBasic(id);
      if (!feedback) {
        set.status = 404;
        return { error: 'Masukan tidak ditemukan.' };
      }
      if (!body.pesan?.trim()) {
        set.status = 400;
        return { error: 'Isi komentar tidak boleh kosong.' };
      }
      const newComment = await FeedbackService.addComment(id, user.id, body.pesan.trim());
      return newComment;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async toggleLike({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      const id = parseInt(params.id);
      const feedback = await FeedbackService.findByIdBasic(id);
      if (!feedback) {
        set.status = 404;
        return { error: 'Masukan tidak ditemukan.' };
      }
      const result = await FeedbackService.toggleLike(id, user.id);
      return { ...result, likeCount: await FeedbackService.getLikeCount(id) };
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
