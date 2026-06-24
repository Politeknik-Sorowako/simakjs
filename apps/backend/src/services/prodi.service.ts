import { db } from '../utils/db';
import { programStudi } from '../models/schema';
import { ilike, or } from 'drizzle-orm';

export class ProdiService {
  static async getAll(page = 1, limit = 10, search = '') {
    const offset = (page - 1) * limit;
    if (search) {
      return await db
        .select()
        .from(programStudi)
        .where(
          or(
            ilike(programStudi.nama, `%${search}%`),
            ilike(programStudi.kode, `%${search}%`)
          )
        )
        .limit(limit)
        .offset(offset);
    }
    return await db.select().from(programStudi).limit(limit).offset(offset);
  }

  static async create(data: { kode: string; nama: string; jenjang: string }) {
    const [newProdi] = await db.insert(programStudi).values(data).returning();
    return newProdi;
  }
}

