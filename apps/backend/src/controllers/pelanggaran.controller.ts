import { eq } from 'drizzle-orm';
import { mahasiswa } from '../models/schema';
import { PelanggaranService } from '../services/pelanggaran.service';
import { db } from '../utils/db';
import { hasRole } from '../utils/role';
import { AuthContext } from '../utils/types';

export class PelanggaranController {
  private static async getMahasiswaIdByEmail(email: string): Promise<number | null> {
    const [mhs] = await db.select({ id: mahasiswa.id }).from(mahasiswa).where(eq(mahasiswa.email, email));
    return mhs ? mhs.id : null;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async create({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'dosen', 'prodi', 'instruktur'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin, Dosen, Prodi, atau Instruktur.' };
    }

    try {
      const payload = {
        ...body,
        dibuatOleh: user.id,
      };
      const newViolation = await PelanggaranService.createPelanggaran(payload);
      set.status = 201;
      return newViolation;
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getByMhsId({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || hasRole(user, ['guest'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    const targetMhsId = parseInt(params.mhsId);
    if (isNaN(targetMhsId)) {
      set.status = 400;
      return { error: 'ID Mahasiswa tidak valid.' };
    }

    // RBAC check
    if (hasRole(user, ['mahasiswa'])) {
      const myMhsId = await PelanggaranController.getMahasiswaIdByEmail(user.email);
      if (!myMhsId || myMhsId !== targetMhsId) {
        set.status = 403;
        return { error: 'Akses ditolak. Anda hanya dapat melihat riwayat kedisiplinan Anda sendiri.' };
      }
    }

    try {
      return await PelanggaranService.getPelanggaranByMahasiswa(targetMhsId);
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll({ set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'dosen', 'prodi', 'instruktur'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    return await PelanggaranService.getAllPelanggaran();
  }

  static async getRekap({
    query,
    set,
    getCurrentUser,
    // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  }: AuthContext<any, { periodeId?: string; programStudiId?: string }>): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const prodiId = query?.programStudiId ? parseInt(query.programStudiId) : undefined;
    return await PelanggaranService.getRekap(query?.periodeId, prodiId);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async update({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin'])) {
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
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal memproses permintaan' };
    }
  }
}
