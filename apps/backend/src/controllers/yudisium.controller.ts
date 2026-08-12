import { eq } from 'drizzle-orm';
import { mahasiswa } from '../models/schema';
import { YudisiumService } from '../services/yudisium.service';
import { db } from '../utils/db';
import { guardKelasScope } from '../utils/dosen-scope';
import { hasRole } from '../utils/role';
import { AuthContext } from '../utils/types';

export class YudisiumController {
  private static async getMahasiswaIdByEmail(email: string): Promise<number | null> {
    const [mhs] = await db.select({ id: mahasiswa.id }).from(mahasiswa).where(eq(mahasiswa.email, email));
    return mhs ? mhs.id : null;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getPengajuan({ params, set, getCurrentUser }: AuthContext): Promise<any> {
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
      const myMhsId = await YudisiumController.getMahasiswaIdByEmail(user.email);
      if (!myMhsId || myMhsId !== targetMhsId) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
    }

    const result = await YudisiumService.getPengajuan(targetMhsId);
    if (!result) {
      set.status = 404;
      return { error: 'Pengajuan yudisium tidak ditemukan' };
    }
    return result;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async submitPengajuan({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login.' };
    }

    const targetMhsId = parseInt(params.mhsId);
    if (isNaN(targetMhsId)) {
      set.status = 400;
      return { error: 'ID Mahasiswa tidak valid.' };
    }

    // RBAC check: student can only submit their own, admin/dosen can submit for anyone
    if (hasRole(user, ['mahasiswa'])) {
      const myMhsId = await YudisiumController.getMahasiswaIdByEmail(user.email);
      if (!myMhsId || myMhsId !== targetMhsId) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
    } else if (!hasRole(user, ['admin', 'dosen', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    try {
      const result = await YudisiumService.createOrUpdatePengajuan(targetMhsId, body);
      set.status = 201;
      return result;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal menyimpan pengajuan yudisium.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async updateStatus({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'dosen', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin, Prodi, atau Dosen.' };
    }

    const targetMhsId = parseInt(params.mhsId);
    if (isNaN(targetMhsId)) {
      set.status = 400;
      return { error: 'ID Mahasiswa tidak valid.' };
    }

    try {
      const result = await YudisiumService.updateStatus(targetMhsId, body.status, body.catatan);
      return result;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memperbarui status yudisium.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll({ set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'dosen', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    return await YudisiumService.getAllPengajuan();
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getStats({ query, set, getCurrentUser }: AuthContext<any, { periodeId?: string }>): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    return await YudisiumService.getStats(query?.periodeId);
  }

  // --- GRADE COMPONENTS CONTROLLERS ---

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getKomponen({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'dosen', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const kelasKuliahId = parseInt(params.kelasKuliahId);
    const scopeError = await guardKelasScope(user, kelasKuliahId);
    if (scopeError) {
      set.status = 403;
      return { error: scopeError };
    }
    return await YudisiumService.getKomponen(kelasKuliahId);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async saveKomponen({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'dosen', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    const scopeError = await guardKelasScope(user, body.kelasKuliahId);
    if (scopeError) {
      set.status = 403;
      return { error: scopeError };
    }

    try {
      const result = await YudisiumService.saveKomponen(body.kelasKuliahId, body.komponenList);
      set.status = 200;
      return result;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal menyimpan komponen nilai.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getNilaiMahasiswa({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'dosen', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    const kelasKuliahId = parseInt(params.kelasKuliahId);
    const scopeError = await guardKelasScope(user, kelasKuliahId);
    if (scopeError) {
      set.status = 403;
      return { error: scopeError };
    }

    return await YudisiumService.getNilaiMahasiswa(kelasKuliahId);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async saveNilaiMahasiswa({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'dosen', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    const scopeError = await guardKelasScope(user, body.kelasKuliahId);
    if (scopeError) {
      set.status = 403;
      return { error: scopeError };
    }

    try {
      const result = await YudisiumService.saveNilaiMahasiswa(body.kelasKuliahId, body.nilaiList);
      return result;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal menyimpan nilai komponen mahasiswa.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async lockKelas({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'dosen', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    const kelasKuliahId = parseInt(params.kelasKuliahId);
    const scopeError = await guardKelasScope(user, kelasKuliahId);
    if (scopeError) {
      set.status = 403;
      return { error: scopeError };
    }

    try {
      const result = await YudisiumService.lockKelas(kelasKuliahId);
      return result;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mengunci nilai kelas.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async unlockKelas({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'dosen', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Anda tidak memiliki wewenang untuk membuka kunci nilai kelas.' };
    }

    const kelasKuliahId = parseInt(params.kelasKuliahId);
    const scopeError = await guardKelasScope(user, kelasKuliahId);
    if (scopeError) {
      set.status = 403;
      return { error: scopeError };
    }

    try {
      const result = await YudisiumService.unlockKelas(kelasKuliahId);
      return result;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal membuka kunci nilai kelas.' };
    }
  }
}
