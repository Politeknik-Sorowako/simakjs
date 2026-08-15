import { eq } from 'drizzle-orm';
import { mahasiswa } from '../models/schema';
import { CsvImportService } from '../services/csv-import.service';
import { PelanggaranService } from '../services/pelanggaran.service';
import { db } from '../utils/db';
import { hasRole } from '../utils/role';
import { AuthContext } from '../utils/types';

const DB_ERROR_PATTERN = /Failed query|does not exist|violates .* constraint|syntax error/i;

// Kembalikan pesan kesalahan bisnis yang bermakna, tetapi tutup detail DB/SQL agar tidak bocor ke client.
function safeErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && !DB_ERROR_PATTERN.test(err.message)) {
    return err.message;
  }
  return fallback;
}

export class PelanggaranController {
  private static async getMahasiswaIdByEmail(email: string): Promise<number | null> {
    const [mhs] = await db.select({ id: mahasiswa.id }).from(mahasiswa).where(eq(mahasiswa.email, email));
    return mhs ? mhs.id : null;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async create({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'dosen', 'prodi', 'instruktur', 'super_admin'])) {
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
      console.error('[PelanggaranController.create]', err);
      set.status = 400;
      return { error: safeErrorMessage(err, 'Gagal memproses permintaan') };
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
      console.error('[PelanggaranController.getByMhsId]', err);
      set.status = 400;
      return { error: safeErrorMessage(err, 'Gagal memproses permintaan') };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll({ set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'dosen', 'prodi', 'instruktur', 'super_admin'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    try {
      return await PelanggaranService.getAllPelanggaran();
    } catch (err: unknown) {
      console.error('[PelanggaranController.getAll]', err);
      set.status = 400;
      return { error: safeErrorMessage(err, 'Gagal mengambil data pelanggaran') };
    }
  }

  static async getRekap({
    query,
    set,
    getCurrentUser,
    // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  }: AuthContext<any, { programStudiId?: string }>): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'prodi', 'super_admin'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const prodiId = query?.programStudiId ? parseInt(query.programStudiId) : undefined;
      return await PelanggaranService.getRekap(prodiId);
    } catch (err: unknown) {
      console.error('[PelanggaranController.getRekap]', err);
      set.status = 400;
      return { error: safeErrorMessage(err, 'Gagal mengambil rekap pelanggaran') };
    }
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
      console.error('[PelanggaranController.update]', err);
      set.status = 400;
      return { error: safeErrorMessage(err, 'Gagal memproses permintaan') };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async importCsv({ request, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'prodi', 'super_admin'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin/Admin Prodi.' };
    }

    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const mode = (formData.get('mode') as string) || 'skip';
      if (!file) {
        set.status = 400;
        return { error: 'File CSV tidak ditemukan.' };
      }

      const text = await file.text();
      const result = await CsvImportService.importPelanggaran(text, mode, user.id);
      return result;
    } catch (err: unknown) {
      console.error('[PelanggaranController.importCsv]', err);
      set.status = 400;
      return { error: safeErrorMessage(err, 'Gagal mengimpor data pelanggaran') };
    }
  }
}
