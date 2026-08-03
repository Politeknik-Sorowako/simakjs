import { eq } from 'drizzle-orm';
import { systemFeedback } from '../models/schema';
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
    return await db.query.systemFeedback.findMany({
      with: {
        user: true,
      },
      orderBy: (feedback, { desc }) => [desc(feedback.createdAt)],
    });
  }

  static async getByUserId(userId: number) {
    return await db.query.systemFeedback.findMany({
      where: eq(systemFeedback.userId, userId),
      orderBy: (feedback, { desc }) => [desc(feedback.createdAt)],
    });
  }

  static async updateStatus(id: number, status: string) {
    const [updated] = await db.update(systemFeedback).set({ status }).where(eq(systemFeedback.id, id)).returning();
    return updated || null;
  }
}
