import { desc, eq } from 'drizzle-orm';
import { notifications } from '../models/schema';
import { db } from '../utils/db';
import { AuthContext } from '../utils/types';

export class NotificationController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll({ set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu.' };
      }

      const list = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(20);

      return list;
    } catch (error: unknown) {
      set.status = 500;
      return { error: 'Gagal mengambil notifikasi' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async markRead({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu.' };
      }

      const notifId = parseInt(params.id);
      if (isNaN(notifId)) {
        set.status = 400;
        return { error: 'ID notifikasi tidak valid' };
      }

      await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, notifId));

      return { message: 'Notifikasi telah ditandai dibaca' };
    } catch (error: unknown) {
      set.status = 500;
      return { error: 'Gagal memperbarui notifikasi' };
    }
  }
}
