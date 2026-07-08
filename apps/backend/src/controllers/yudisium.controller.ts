import { eq } from 'drizzle-orm';
import { mahasiswa } from '../models/schema';
import { YudisiumService } from '../services/yudisium.service';
import { db } from '../utils/db';
import { AuthContext } from '../utils/types';

export class YudisiumController {
  private static async getMahasiswaIdByEmail(email: string): Promise<number | null> {
    const [mhs] = await db.select({ id: mahasiswa.id }).from(mahasiswa).where(eq(mahasiswa.email, email));
    return mhs ? mhs.id : null;
  }

  static async getPengajuan({ params, set, getCurrentUser }: AuthContext) {
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

  static async submitPengajuan({ params, body, set, getCurrentUser }: AuthContext) {
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
    if (user.role === 'mahasiswa') {
      const myMhsId = await YudisiumController.getMahasiswaIdByEmail(user.email);
      if (!myMhsId || myMhsId !== targetMhsId) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
    } else if (user.role !== 'admin' && user.role !== 'dosen' && user.role !== 'prodi') {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    try {
      const result = await YudisiumService.createOrUpdatePengajuan(targetMhsId, body);
      set.status = 201;
      return result;
    } catch (e: any) {
      set.status = 400;
      return { error: e.message || 'Gagal menyimpan pengajuan yudisium.' };
    }
  }

  static async updateStatus({ params, body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen' && user.role !== 'prodi')) {
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
    } catch (e: any) {
      set.status = 400;
      return { error: e.message || 'Gagal memperbarui status yudisium.' };
    }
  }

  static async getAll({ set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen' && user.role !== 'prodi')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    return await YudisiumService.getAllPengajuan();
  }

  static async getStats({ query, set, getCurrentUser }: AuthContext<any, { periodeId?: string }>) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'prodi')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    return await YudisiumService.getStats(query?.periodeId);
  }

  // --- GRADE COMPONENTS CONTROLLERS ---

  static async getKomponen({ params }: AuthContext) {
    return await YudisiumService.getKomponen(parseInt(params.kelasKuliahId));
  }

  static async saveKomponen({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen' && user.role !== 'prodi')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    try {
      const result = await YudisiumService.saveKomponen(body.kelasKuliahId, body.komponenList);
      set.status = 200;
      return result;
    } catch (e: any) {
      set.status = 400;
      return { error: e.message || 'Gagal menyimpan komponen nilai.' };
    }
  }

  static async getNilaiMahasiswa({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen' && user.role !== 'prodi')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    return await YudisiumService.getNilaiMahasiswa(parseInt(params.kelasKuliahId));
  }

  static async saveNilaiMahasiswa({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen' && user.role !== 'prodi')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    try {
      const result = await YudisiumService.saveNilaiMahasiswa(body.kelasKuliahId, body.nilaiList);
      return result;
    } catch (e: any) {
      set.status = 400;
      return { error: e.message || 'Gagal menyimpan nilai komponen mahasiswa.' };
    }
  }

  static async lockKelas({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen' && user.role !== 'prodi')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    try {
      const result = await YudisiumService.lockKelas(parseInt(params.kelasKuliahId));
      return result;
    } catch (e: any) {
      set.status = 400;
      return { error: e.message || 'Gagal mengunci nilai kelas.' };
    }
  }

  static async unlockKelas({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen' && user.role !== 'prodi')) {
      set.status = 403;
      return { error: 'Akses ditolak. Anda tidak memiliki wewenang untuk membuka kunci nilai kelas.' };
    }

    try {
      const result = await YudisiumService.unlockKelas(parseInt(params.kelasKuliahId));
      return result;
    } catch (e: any) {
      set.status = 400;
      return { error: e.message || 'Gagal membuka kunci nilai kelas.' };
    }
  }
}
