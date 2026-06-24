import { db } from '../utils/db';
import { mahasiswa } from '../models/schema';

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
  static async getAll() {
    return await db.select().from(mahasiswa);
  }

  static async create(data: CreateMahasiswaDto) {
    const [newMhs] = await db.insert(mahasiswa).values(data).returning();
    return newMhs;
  }
}
