import { eq } from 'drizzle-orm';
import { mahasiswa } from '../models/schema';
import { PelanggaranService } from '../services/pelanggaran.service';
import { db } from '../utils/db';
import { AuthContext } from '../utils/types';

export class PelanggaranController {
  private static async getMahasiswaIdByEmail(email: string): Promise<number | null> {
    const [mhs] = await db.select({ id: mahasiswa.id }).from(mahasiswa).where(eq(mahasiswa.email, email));
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
        dibuatOleh: user.id,
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

  static async getRekap({ query, set, getCurrentUser }: AuthContext<any, { periodeId?: string; programStudiId?: string }>) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'prodi')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const prodiId = query?.programStudiId ? parseInt(query.programStudiId) : undefined;
    return await PelanggaranService.getRekap(query?.periodeId, prodiId);
  }

  static async update({ params, body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    try {
      const id = parseInt(params.id);
      const updated = await PelanggaranService.updatePelanggaran(id, body);
      if (!updated) {
        set.status = 404;
        return { error: 'Data pelanggaran tidak ditemukan' };
      }
      return updated;
    } catch (err: any) {
      set.status = 400;
      return { error: err.message || 'Gagal mengubah pelanggaran.' };
    }
  }
}
