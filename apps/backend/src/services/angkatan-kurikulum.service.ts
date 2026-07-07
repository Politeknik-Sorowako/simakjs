import { and, eq } from 'drizzle-orm';
import { angkatanKurikulum, kurikulum } from '../models/schema';
import { db } from '../utils/db';

export interface CreateAngkatanKurikulumDto {
  programStudiId: number;
  angkatan: string;
  kurikulumId: number;
  isActive?: boolean;
}

export class AngkatanKurikulumService {
  static async getAll(programStudiId?: number) {
    const where = programStudiId ? eq(angkatanKurikulum.programStudiId, programStudiId) : undefined;
    return await db.query.angkatanKurikulum.findMany({
      where,
      with: {
        programStudi: true,
        kurikulum: true,
      },
      orderBy: (ak, { desc }) => [desc(ak.createdAt)],
    });
  }

  static async getAktif(programStudiId: number, angkatan: string) {
    const binding = await db.query.angkatanKurikulum.findFirst({
      where: and(eq(angkatanKurikulum.programStudiId, programStudiId), eq(angkatanKurikulum.angkatan, angkatan), eq(angkatanKurikulum.isActive, true)),
      with: {
        kurikulum: {
          with: {
            kurikulumMataKuliah: {
              with: {
                mataKuliah: true,
              },
              orderBy: (kmk, { asc }) => [asc(kmk.semester)],
            },
          },
        },
      },
    });

    if (!binding) return null;
    return binding.kurikulum;
  }

  static async create(data: CreateAngkatanKurikulumDto) {
    return await db.transaction(async (tx) => {
      // 1. Save old active binding BEFORE modifying anything
      const oldActive = await tx.query.angkatanKurikulum.findFirst({
        where: and(
          eq(angkatanKurikulum.programStudiId, data.programStudiId),
          eq(angkatanKurikulum.angkatan, data.angkatan),
          eq(angkatanKurikulum.isActive, true),
        ),
      });

      // 2. Delete old record to avoid unique constraint violation on insert
      await tx
        .delete(angkatanKurikulum)
        .where(and(eq(angkatanKurikulum.programStudiId, data.programStudiId), eq(angkatanKurikulum.angkatan, data.angkatan)));

      // 3. Unlock old kurikulum (using saved reference, not post-update query)
      if (oldActive) {
        await tx.update(kurikulum).set({ isLocked: false }).where(eq(kurikulum.id, oldActive.kurikulumId));
      }

      // 4. Lock new kurikulum
      await tx.update(kurikulum).set({ isLocked: true }).where(eq(kurikulum.id, data.kurikulumId));

      // 5. Insert new binding (no unique constraint conflict since old record was deleted)
      const [newBinding] = await tx.insert(angkatanKurikulum).values(data).returning();
      return newBinding;
    });
  }

  static async update(id: number, data: Partial<CreateAngkatanKurikulumDto>) {
    return await db.transaction(async (tx) => {
      const existing = await tx.query.angkatanKurikulum.findFirst({ where: eq(angkatanKurikulum.id, id) });
      if (!existing) return null;

      // Jika kurikulumId berubah
      if (data.kurikulumId && data.kurikulumId !== existing.kurikulumId) {
        // Unlock kurikulum lama
        await tx.update(kurikulum).set({ isLocked: false }).where(eq(kurikulum.id, existing.kurikulumId));
        // Lock kurikulum baru
        await tx.update(kurikulum).set({ isLocked: true }).where(eq(kurikulum.id, data.kurikulumId));
      }

      const [updated] = await tx.update(angkatanKurikulum).set(data).where(eq(angkatanKurikulum.id, id)).returning();
      return updated;
    });
  }

  static async delete(id: number) {
    return await db.transaction(async (tx) => {
      const existing = await tx.query.angkatanKurikulum.findFirst({ where: eq(angkatanKurikulum.id, id) });
      if (!existing) return null;

      // Unlock kurikulum
      await tx.update(kurikulum).set({ isLocked: false }).where(eq(kurikulum.id, existing.kurikulumId));

      const [deleted] = await tx.delete(angkatanKurikulum).where(eq(angkatanKurikulum.id, id)).returning();
      return deleted;
    });
  }
}
