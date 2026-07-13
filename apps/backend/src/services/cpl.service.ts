import { eq } from 'drizzle-orm';
import { cpl } from '../models/schema';
import { db } from '../utils/db';

export interface CreateCplDto {
  programStudiId: number;
  kode: string;
  deskripsi: string;
  urutan?: number;
}

export class CplService {
  static async getAll(prodiId?: number) {
    if (prodiId) {
      return db.query.cpl.findMany({
        where: eq(cpl.programStudiId, prodiId),
        with: { programStudi: true },
      });
    }
    return db.query.cpl.findMany({
      with: { programStudi: true },
    });
  }

  static async getById(id: number) {
    return db.query.cpl.findFirst({
      where: eq(cpl.id, id),
      with: {
        programStudi: true,
        profilLulusanMappings: {
          with: { profilLulusan: true },
        },
        cpmkMappings: {
          with: {
            cpmk: {
              with: { mataKuliah: true },
            },
          },
        },
      },
    });
  }

  static async create(data: CreateCplDto) {
    const [newData] = await db.insert(cpl).values(data).returning();
    return newData;
  }

  static async update(id: number, data: Partial<CreateCplDto>) {
    const [updated] = await db.update(cpl).set(data).where(eq(cpl.id, id)).returning();
    return updated || null;
  }

  static async delete(id: number) {
    const [deleted] = await db.delete(cpl).where(eq(cpl.id, id)).returning();
    return deleted || null;
  }
}
