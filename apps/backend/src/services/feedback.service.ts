import { desc, eq } from 'drizzle-orm';
import { systemFeedback, users } from '../models/schema';
import { db } from '../utils/db';

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

  static async getAll() {
    try {
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
          user: {
            id: users.id,
            nama: users.nama,
            email: users.email,
            role: users.role,
          },
        })
        .from(systemFeedback)
        .leftJoin(users, eq(systemFeedback.userId, users.id))
        .orderBy(desc(systemFeedback.createdAt));

      return rows;
    } catch (err: unknown) {
      console.warn('[FeedbackService] Failed to query getAll:', err instanceof Error ? err.message : err);
      return [];
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

  static async updateStatus(id: number, status: string) {
    const [updated] = await db.update(systemFeedback).set({ status }).where(eq(systemFeedback.id, id)).returning();
    return updated || null;
  }
}
