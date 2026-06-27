import { KhsService } from '../services/khs.service';
import { AuthContext } from '../utils/types';
import { db } from '../utils/db';
import { mahasiswa } from '../models/schema';
import { eq } from 'drizzle-orm';

export class KhsController {
  private static async getMahasiswaIdByEmail(email: string): Promise<number | null> {
    const [mhs] = await db
      .select({ id: mahasiswa.id })
      .from(mahasiswa)
      .where(eq(mahasiswa.email, email));
    return mhs ? mhs.id : null;
  }

  static async getByMhsIdAndPeriode({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu.' };
    }

    const targetMhsId = parseInt(params.mhsId);
    if (isNaN(targetMhsId)) {
      set.status = 400;
      return { error: 'ID Mahasiswa tidak valid.' };
    }

    const targetPeriodeId = params.periodeId;

    // RBAC Check
    if (user.role === 'mahasiswa') {
      const myMhsId = await KhsController.getMahasiswaIdByEmail(user.email);
      if (!myMhsId || myMhsId !== targetMhsId) {
        set.status = 403;
        return { error: 'Akses ditolak. Anda hanya dapat melihat KHS Anda sendiri.' };
      }

      // Check clearance
      const clearance = await KhsService.checkBebasTanggungan(targetMhsId, targetPeriodeId);
      if (!clearance.bebas) {
        return {
          blocked: true,
          reason: clearance.reason,
          detail: clearance.detail
        };
      }
    }

    try {
      const khs = await KhsService.getKhs(targetMhsId, targetPeriodeId);
      return {
        blocked: false,
        ...khs
      };
    } catch (err: any) {
      set.status = 400;
      return { error: err.message || 'Gagal memproses KHS.' };
    }
  }

  static async getTranskrip({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu.' };
    }

    const targetMhsId = parseInt(params.mhsId);
    if (isNaN(targetMhsId)) {
      set.status = 400;
      return { error: 'ID Mahasiswa tidak valid.' };
    }

    // RBAC Check
    if (user.role === 'mahasiswa') {
      const myMhsId = await KhsController.getMahasiswaIdByEmail(user.email);
      if (!myMhsId || myMhsId !== targetMhsId) {
        set.status = 403;
        return { error: 'Akses ditolak. Anda hanya dapat melihat Transkrip Anda sendiri.' };
      }
    }

    try {
      return await KhsService.getTranskrip(targetMhsId);
    } catch (err: any) {
      set.status = 400;
      return { error: err.message || 'Gagal memproses Transkrip Nilai.' };
    }
  }

  static async getExamEligibility({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu.' };
    }

    const targetMhsId = parseInt(params.mhsId);
    if (isNaN(targetMhsId)) {
      set.status = 400;
      return { error: 'ID Mahasiswa tidak valid.' };
    }

    const targetPeriodeId = params.periodeId;

    // RBAC Check
    if (user.role === 'mahasiswa') {
      const myMhsId = await KhsController.getMahasiswaIdByEmail(user.email);
      if (!myMhsId || myMhsId !== targetMhsId) {
        set.status = 403;
        return { error: 'Akses ditolak. Anda hanya dapat melihat kelayakan ujian Anda sendiri.' };
      }
    }

    try {
      return await KhsService.getExamEligibility(targetMhsId, targetPeriodeId);
    } catch (err: any) {
      set.status = 400;
      return { error: err.message || 'Gagal memproses kelayakan ujian.' };
    }
  }
}
