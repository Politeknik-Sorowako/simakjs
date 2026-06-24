import { db } from '../utils/db';
import { programStudi } from '../models/schema';

export class ProdiService {
  static async getAll() {
    return await db.select().from(programStudi);
  }

  static async create(data: { kode: string; nama: string; jenjang: string }) {
    const [newProdi] = await db.insert(programStudi).values(data).returning();
    return newProdi;
  }
}
