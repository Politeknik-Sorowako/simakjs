import { PelanggaranService } from '../services/pelanggaran.service';
import { AuthContext } from '../utils/types';
import { db } from '../utils/db';
import { mahasiswa } from '../models/schema';
import { eq } from 'drizzle-orm';

export class PelanggaranController {
  private static async getMahasiswaIdByEmail(email: string): Promise<number | null> {
    const [mhs] = await db
      .select({ id: mahasiswa.id })
      .from(mahasiswa)
      .where(eq(mahasiswa.email, email));
    return mhs ? mhs.id : null;
  }

  static async create({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin atau Dosen/Komisi Disiplin.' };
    }

    try {
      const payload = {
        ...body,
        dibuatOleh: user.id
      };
      const newViolation = await PelanggaranService.createPelanggaran(payload);
      set.status = 201;
      return newViolation;
    } catch (err: any) {
      set.status = 400;
      return { error: err.message || 'Gagal mencatat pelanggaran.' };
    }
  }

  static async getByMhsId({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role === 'guest') {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    const targetMhsId = parseInt(params.mhsId);
    if (isNaN(targetMhsId)) {
      set.status = 400;
      return { error: 'ID Mahasiswa tidak valid.' };
    }

    // RBAC check
    if (user.role === 'mahasiswa') {
      const myMhsId = await PelanggaranController.getMahasiswaIdByEmail(user.email);
      if (!myMhsId || myMhsId !== targetMhsId) {
        set.status = 403;
        return { error: 'Akses ditolak. Anda hanya dapat melihat riwayat kedisiplinan Anda sendiri.' };
      }
    }

    try {
      return await PelanggaranService.getPelanggaranByMahasiswa(targetMhsId);
    } catch (err: any) {
      set.status = 400;
      return { error: err.message || 'Gagal memproses data.' };
    }
  }

  static async getAll({ set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    return await PelanggaranService.getAllPelanggaran();
  }
}
