import { KhsService } from '../services/khs.service';
import { MahasiswaService } from '../services/mahasiswa.service';
import { AuthContext } from '../utils/types';

export class KhsController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getByMhsIdAndPeriode({ params, set, getCurrentUser }: AuthContext): Promise<any> {
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
      const myMhsId = await MahasiswaService.getMahasiswaIdByEmail(user.email);
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
          detail: clearance.detail,
        };
      }
    }

    try {
      const khs = await KhsService.getKhs(targetMhsId, targetPeriodeId);
      return {
        blocked: false,
        ...khs,
      };
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal memproses KHS.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getTranskrip({ params, set, getCurrentUser }: AuthContext): Promise<any> {
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
      const myMhsId = await MahasiswaService.getMahasiswaIdByEmail(user.email);
      if (!myMhsId || myMhsId !== targetMhsId) {
        set.status = 403;
        return { error: 'Akses ditolak. Anda hanya dapat melihat Transkrip Anda sendiri.' };
      }
    }

    try {
      return await KhsService.getTranskrip(targetMhsId);
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal memproses Transkrip Nilai.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getExamEligibility({ params, set, getCurrentUser }: AuthContext): Promise<any> {
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
      const myMhsId = await MahasiswaService.getMahasiswaIdByEmail(user.email);
      if (!myMhsId || myMhsId !== targetMhsId) {
        set.status = 403;
        return { error: 'Akses ditolak. Anda hanya dapat melihat kelayakan ujian Anda sendiri.' };
      }
    }

    try {
      return await KhsService.getExamEligibility(targetMhsId, targetPeriodeId);
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal memproses kelayakan ujian.' };
    }
  }

  // --- KONVERSI NILAI ---

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAllKonversi({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login.' };
    }
    const prodiId = (query as Record<string, unknown>)?.programStudiId
      ? parseInt((query as Record<string, unknown>).programStudiId as string)
      : undefined;
    return await KhsService.getAllKonversi(prodiId);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async saveKonversi({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'prodi')) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin dan Prodi.' };
    }
    try {
      // biome-ignore lint/suspicious/noExplicitAny: Elysia body type inference requires cast for service call
      return await KhsService.saveKonversi(body as any);
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal menyimpan konversi nilai.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async deleteKonversi({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'prodi')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const id = parseInt(params.id);
    if (isNaN(id)) {
      set.status = 400;
      return { error: 'ID tidak valid' };
    }
    await KhsService.deleteKonversi(id);
    return { message: 'Aturan konversi nilai berhasil dihapus' };
  }

  // --- SKALA PREDIKAT KELULUSAN ---

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAllPredikat({ set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login.' };
    }
    return await KhsService.getAllPredikat();
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async savePredikat({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    try {
      // biome-ignore lint/suspicious/noExplicitAny: Elysia body type inference requires cast for service call
      return await KhsService.savePredikat(body as any);
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal menyimpan skala predikat.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async deletePredikat({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const id = parseInt(params.id);
    if (isNaN(id)) {
      set.status = 400;
      return { error: 'ID tidak valid' };
    }
    await KhsService.deletePredikat(id);
    return { message: 'Skala predikat kelulusan berhasil dihapus' };
  }

  // --- REKAP NILAI ---

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getRekapNilai({ params, query, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login.' };
    }
    const mhsId = parseInt(params.mhsId);
    if (isNaN(mhsId)) {
      set.status = 400;
      return { error: 'ID Mahasiswa tidak valid.' };
    }
    const periodeId = (query as Record<string, unknown>)?.periodeId as string | undefined;
    try {
      return await KhsService.getRekapNilai(mhsId, periodeId);
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getRekapPerProdi({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login.' };
    }
    const periodeId = (query as Record<string, unknown>)?.periodeId as string | undefined;
    try {
      return await KhsService.getRekapPerProdi(periodeId);
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal mengambil rekap per prodi.' };
    }
  }
}
