import { and, count, desc, eq, type SQL, sql } from 'drizzle-orm';
import { feedbackComments, feedbackLikes, systemFeedback, users } from '../models/schema';
import { db } from '../utils/db';

export type FeedbackSortBy = 'createdAt' | 'rating' | 'kategori' | 'judul' | 'likeCount';

export class FeedbackService {
  static async create(data: {
    userId: number;
    kategori: string;
    judul: string;
    pesan: string;
    rating?: number | null;
  }) {
    const [newFeedback] = await db.insert(systemFeedback).values(data).returning();
    return newFeedback;
  }

  static async getAll(options?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }) {
    try {
      const page = Math.max(1, options?.page || 1);
      const limit = Math.min(100, Math.max(1, options?.limit || 20));
      const offset = (page - 1) * limit;

      const likeCountExpr = sql<number>`(SELECT COUNT(*) FROM ${feedbackLikes} WHERE ${feedbackLikes.feedbackId} = ${systemFeedback.id})`;
      const commentCountExpr = sql<number>`(SELECT COUNT(*) FROM ${feedbackComments} WHERE ${feedbackComments.feedbackId} = ${systemFeedback.id})`;

      const conditions: SQL<unknown>[] = [];
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalRow] = await db
        .select({ total: count() })
        .from(systemFeedback)
        .leftJoin(users, eq(systemFeedback.userId, users.id))
        .where(whereClause);

      const sortOrder = options?.sortOrder === 'asc' ? sql`ASC` : sql`DESC`;
      const sortBy = options?.sortBy || 'createdAt';
      const orderExpr =
        sortBy === 'rating'
          ? sql`${systemFeedback.rating} ${sortOrder} NULLS LAST`
          : sortBy === 'kategori'
            ? sql`${systemFeedback.kategori} ${sortOrder}`
            : sortBy === 'judul'
              ? sql`${systemFeedback.judul} ${sortOrder}`
              : sortBy === 'likeCount'
                ? sql`${likeCountExpr} ${sortOrder}`
                : sql`${systemFeedback.createdAt} ${sortOrder}`;

      const rows = await db
        .select({
          id: systemFeedback.id,
          userId: systemFeedback.userId,
          kategori: systemFeedback.kategori,
          judul: systemFeedback.judul,
          pesan: systemFeedback.pesan,
          rating: systemFeedback.rating,
          status: systemFeedback.status,
          createdAt: systemFeedback.createdAt,
          updatedAt: systemFeedback.updatedAt,
          likeCount: likeCountExpr,
          commentCount: commentCountExpr,
          user: {
            id: users.id,
            nama: users.nama,
            email: users.email,
            role: users.role,
          },
        })
        .from(systemFeedback)
        .leftJoin(users, eq(systemFeedback.userId, users.id))
        .where(whereClause)
        .orderBy(orderExpr)
        .limit(limit)
        .offset(offset);

      return {
        data: rows.map((r) => ({
          ...r,
          likeCount: Number(r.likeCount || 0),
          commentCount: Number(r.commentCount || 0),
        })),
        meta: {
          page,
          limit,
          total: Number(totalRow?.total || 0),
          totalPages: Math.ceil(Number(totalRow?.total || 0) / limit) || 1,
        },
      };
    } catch (err: unknown) {
      console.warn('[FeedbackService] Failed to query getAll:', err instanceof Error ? err.message : err);
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } };
    }
  }

  static async getByUserId(userId: number) {
    try {
      return await db.query.systemFeedback.findMany({
        where: eq(systemFeedback.userId, userId),
        orderBy: (feedback, { desc: descFn }) => [descFn(feedback.createdAt)],
      });
    } catch (err: unknown) {
      console.warn('[FeedbackService] Failed to query getByUserId:', err instanceof Error ? err.message : err);
      return [];
    }
  }

  static async getById(id: number, viewerUserId?: number) {
    const likeCountExpr = sql<number>`(SELECT COUNT(*) FROM ${feedbackLikes} WHERE ${feedbackLikes.feedbackId} = ${systemFeedback.id})`;
    const commentCountExpr = sql<number>`(SELECT COUNT(*) FROM ${feedbackComments} WHERE ${feedbackComments.feedbackId} = ${systemFeedback.id})`;

    const [row] = await db
      .select({
        id: systemFeedback.id,
        userId: systemFeedback.userId,
        kategori: systemFeedback.kategori,
        judul: systemFeedback.judul,
        pesan: systemFeedback.pesan,
        rating: systemFeedback.rating,
        status: systemFeedback.status,
        createdAt: systemFeedback.createdAt,
        updatedAt: systemFeedback.updatedAt,
        likeCount: likeCountExpr,
        commentCount: commentCountExpr,
        user: {
          id: users.id,
          nama: users.nama,
          email: users.email,
          role: users.role,
        },
      })
      .from(systemFeedback)
      .leftJoin(users, eq(systemFeedback.userId, users.id))
      .where(eq(systemFeedback.id, id));

    if (!row) {
      return null;
    }

    let isLiked = false;
    if (viewerUserId) {
      const [like] = await db
        .select({ id: feedbackLikes.id })
        .from(feedbackLikes)
        .where(and(eq(feedbackLikes.feedbackId, id), eq(feedbackLikes.userId, viewerUserId)))
        .limit(1);
      isLiked = !!like;
    }

    const comments = await this.getComments(id);

    return {
      ...row,
      likeCount: Number(row.likeCount || 0),
      commentCount: Number(row.commentCount || 0),
      isLiked,
      comments,
    };
  }

  static async update(
    id: number,
    data: Partial<{
      kategori: string;
      judul: string;
      pesan: string;
      rating?: number | null;
    }>,
  ) {
    const [updated] = await db.update(systemFeedback).set(data).where(eq(systemFeedback.id, id)).returning();
    return updated || null;
  }

  static async delete(id: number) {
    // Komentar & like dihapus otomatis via ON DELETE CASCADE.
    const [deleted] = await db.delete(systemFeedback).where(eq(systemFeedback.id, id)).returning();
    return deleted || null;
  }

  static async getComments(feedbackId: number) {
    const rows = await db
      .select({
        id: feedbackComments.id,
        feedbackId: feedbackComments.feedbackId,
        userId: feedbackComments.userId,
        pesan: feedbackComments.pesan,
        createdAt: feedbackComments.createdAt,
        updatedAt: feedbackComments.updatedAt,
        user: {
          id: users.id,
          nama: users.nama,
          email: users.email,
          role: users.role,
        },
      })
      .from(feedbackComments)
      .leftJoin(users, eq(feedbackComments.userId, users.id))
      .where(eq(feedbackComments.feedbackId, feedbackId))
      .orderBy(desc(feedbackComments.createdAt), desc(feedbackComments.id));

    return rows;
  }

  static async addComment(feedbackId: number, userId: number, pesan: string) {
    const [newComment] = await db.insert(feedbackComments).values({ feedbackId, userId, pesan }).returning();
    return newComment;
  }

  static async toggleLike(feedbackId: number, userId: number) {
    const [existing] = await db
      .select({ id: feedbackLikes.id })
      .from(feedbackLikes)
      .where(and(eq(feedbackLikes.feedbackId, feedbackId), eq(feedbackLikes.userId, userId)))
      .limit(1);

    if (existing) {
      await db.delete(feedbackLikes).where(eq(feedbackLikes.id, existing.id));
      return { liked: false };
    }

    await db.insert(feedbackLikes).values({ feedbackId, userId });
    return { liked: true };
  }

  static async getLikeCount(feedbackId: number) {
    const [row] = await db
      .select({ total: count() })
      .from(feedbackLikes)
      .where(eq(feedbackLikes.feedbackId, feedbackId));
    return Number(row?.total || 0);
  }

  static async updateStatus(id: number, status: string) {
    const [updated] = await db.update(systemFeedback).set({ status }).where(eq(systemFeedback.id, id)).returning();
    return updated || null;
  }
}
