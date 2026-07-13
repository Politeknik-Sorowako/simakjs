import { eq } from 'drizzle-orm';
import { profilLulusan } from '../models/schema';
import { db } from '../utils/db';

export interface CreateProfilLulusanDto {
  programStudiId: number;
  kode: string;
  deskripsi: string;
  urutan?: number;
}

export class ProfilLulusanService {
  static async getAll(prodiId?: number) {
    if (prodiId) {
      return db.query.profilLulusan.findMany({
        where: eq(profilLulusan.programStudiId, prodiId),
        with: { programStudi: true },
      });
    }
    return db.query.profilLulusan.findMany({
      with: { programStudi: true },
    });
  }

  static async getById(id: number) {
    return db.query.profilLulusan.findFirst({
      where: eq(profilLulusan.id, id),
      with: {
        programStudi: true,
        cplMappings: {
          with: { cpl: true },
        },
      },
    });
  }

  static async create(data: CreateProfilLulusanDto) {
    const [newData] = await db.insert(profilLulusan).values(data).returning();
    return newData;
  }

  static async update(id: number, data: Partial<CreateProfilLulusanDto>) {
    const [updated] = await db.update(profilLulusan).set(data).where(eq(profilLulusan.id, id)).returning();
    return updated || null;
  }

  static async delete(id: number) {
    const [deleted] = await db.delete(profilLulusan).where(eq(profilLulusan.id, id)).returning();
    return deleted || null;
  }
}
