import { db } from '../utils/db';
import { mahasiswa } from '../models/schema';
import { ilike, or } from 'drizzle-orm';

export interface CreateMahasiswaDto {
  nim: string;
  nama: string;
  email: string;
  programStudiId: number;
  status?: string;
  idPddikti?: string;
  namaIbuKandung: string;
  nik: string;
  jenisKelamin: 'L' | 'P';
  tanggalLahir: string;
}

export class MahasiswaService {
  static async getAll(page = 1, limit = 10, search = '') {
    const offset = (page - 1) * limit;
    if (search) {
      return await db
        .select()
        .from(mahasiswa)
        .where(
          or(
            ilike(mahasiswa.nama, `%${search}%`),
            ilike(mahasiswa.nim, `%${search}%`),
            ilike(mahasiswa.email, `%${search}%`)
          )
        )
        .limit(limit)
        .offset(offset);
    }
    return await db.select().from(mahasiswa).limit(limit).offset(offset);
  }

  static async create(data: CreateMahasiswaDto) {
    const [newMhs] = await db.insert(mahasiswa).values(data).returning();
    return newMhs;
  }
}

