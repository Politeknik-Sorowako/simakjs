import { KhsService } from '../services/khs.service';
import { MahasiswaService } from '../services/mahasiswa.service';
import { SystemParameterService } from '../services/system-parameter.service';
import { hasRole } from '../utils/role';
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
    if (hasRole(user, ['mahasiswa'])) {
      const myMhsId = await MahasiswaService.getMahasiswaIdByEmail(user.email);
      if (!myMhsId || myMhsId !== targetMhsId) {
        set.status = 403;
        return { error: 'Akses ditolak. Anda hanya dapat melihat KHS Anda sendiri.' };
      }

      // Check clearance (dapat dimatikan admin via BLOCK_KHS_JIKA_TANGGUNGAN)
      if (await SystemParameterService.isKhsBlockEnabled()) {
        const clearance = await KhsService.checkBebasTanggungan(targetMhsId, targetPeriodeId);
        if (!clearance.bebas) {
          return {
            blocked: true,
            reason: clearance.reason,
            detail: clearance.detail,
          };
        }
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
  static async getByNim({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu.' };
    }

    const q = (query || {}) as Record<string, string | undefined>;
    const nim = q.nim?.trim();
    const targetPeriodeId = q.periodeId as string | undefined;
    if (!nim) {
      set.status = 400;
      return { error: 'NIM wajib diisi.' };
    }
    if (!targetPeriodeId) {
      set.status = 400;
      return { error: 'Periode akademik wajib diisi.' };
    }

    // Mahasiswa hanya dapat melihat KHS miliknya sendiri; admin/staff boleh by-nim bebas.
    // Cek kepemilikan SEBELUM resolve target agar tidak membocorkan eksistensi NIM lain.
    if (hasRole(user, ['mahasiswa'])) {
      const myMhsId = await MahasiswaService.getMahasiswaIdByEmail(user.email);
      if (!myMhsId) {
        set.status = 403;
        return { error: 'Akses ditolak. Anda hanya dapat melihat KHS Anda sendiri.' };
      }
      const myNim = (await MahasiswaService.getById(myMhsId))?.nim;
      if (nim !== myNim) {
        set.status = 403;
        return { error: 'Akses ditolak. Anda hanya dapat melihat KHS Anda sendiri.' };
      }
    }

    const targetMhsId = await MahasiswaService.getMahasiswaIdByNim(nim);
    if (!targetMhsId) {
      set.status = 404;
      return { error: 'Mahasiswa dengan NIM tersebut tidak ditemukan.' };
    }

    try {
      const khs = await KhsService.getKhs(targetMhsId, targetPeriodeId);
      const response: Record<string, unknown> = { blocked: false, ...khs };

      // Staff tetap bisa melihat walau ada tunggakan; beri flag untuk watermark cetak.
      if (!hasRole(user, ['mahasiswa']) && (await SystemParameterService.isKhsBlockEnabled())) {
        const clearance = await KhsService.checkBebasTanggungan(targetMhsId, targetPeriodeId);
        if (!clearance.bebas) {
          response.warningTunggakan = { reason: clearance.reason, detail: clearance.detail };
        }
      }
      return response;
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
    if (hasRole(user, ['mahasiswa'])) {
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
    if (hasRole(user, ['mahasiswa'])) {
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

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getRincianKomponen({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu.' };
    }

    const q = query as Record<string, string | undefined>;
    const kelasKuliahId = q?.kelasKuliahId ? parseInt(q.kelasKuliahId) : Number.NaN;
    if (Number.isNaN(kelasKuliahId)) {
      set.status = 400;
      return { error: 'ID Kelas Kuliah tidak valid.' };
    }

    // Mahasiswa hanya boleh melihat rincian miliknya sendiri.
    let targetMhsId: number;
    if (hasRole(user, ['mahasiswa'])) {
      const myMhsId = await MahasiswaService.getMahasiswaIdByEmail(user.email);
      if (!myMhsId) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      targetMhsId = myMhsId;
    } else {
      const requested = q?.mahasiswaId ? parseInt(q.mahasiswaId) : Number.NaN;
      if (Number.isNaN(requested)) {
        set.status = 400;
        return { error: 'ID Mahasiswa wajib dikirim.' };
      }
      targetMhsId = requested;
    }

    try {
      return await KhsService.getRincianKomponen(targetMhsId, kelasKuliahId);
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal memproses rincian komponen.' };
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
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['admin', 'prodi'])) {
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
  static async getKonversiRekap({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['admin', 'prodi', 'super_admin'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const raw = (query as Record<string, string | undefined>)?.targetMax;
    const targetMax = raw ? parseInt(raw) : undefined;
    try {
      return await KhsService.getKonversiRekap(targetMax);
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal mengambil rekap konversi nilai.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async bulkSaveKonversi({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['admin', 'super_admin'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    try {
      const payload = body as {
        targetMax?: number;
        rules: Array<{
          id: number;
          nilaiHuruf?: string;
          bobotIndeks?: string | number;
          nilaiMin: string | number;
          nilaiMax: string | number;
          predikat?: string;
        }>;
      };
      if (!Array.isArray(payload?.rules) || payload.rules.length === 0) {
        set.status = 400;
        return { error: 'Tidak ada aturan konversi yang dikirim.' };
      }
      return await KhsService.bulkSaveKonversi(payload.rules, user.id, payload.targetMax);
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal menyimpan konversi nilai massal.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async deleteKonversi({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['admin', 'prodi'])) {
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
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['admin'])) {
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
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['admin'])) {
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
    let mhsId = parseInt(params.mhsId);
    if (isNaN(mhsId)) {
      set.status = 400;
      return { error: 'ID Mahasiswa tidak valid.' };
    }
    // Mahasiswa hanya dapat melihat rekap nilainya sendiri.
    if (hasRole(user, ['mahasiswa'])) {
      const myMhsId = await MahasiswaService.getMahasiswaIdByEmail(user.email);
      if (!myMhsId || myMhsId !== mhsId) {
        set.status = 403;
        return { error: 'Akses ditolak. Anda hanya dapat melihat rekap nilai Anda sendiri.' };
      }
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
    // Rekap per prodi bersifat agregat admin/staff; mahasiswa tidak boleh mengakses.
    if (hasRole(user, ['mahasiswa'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const periodeId = (query as Record<string, unknown>)?.periodeId as string | undefined;
    try {
      return await KhsService.getRekapPerProdi(periodeId);
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal mengambil rekap per prodi.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getMatriksNilaiMK({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login.' };
    }
    // Matriks nilai MK bersifat agregat admin/staff; mahasiswa tidak boleh mengakses.
    if (hasRole(user, ['mahasiswa'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const q = (query || {}) as Record<string, string | undefined>;
    const periodeId = q.periodeId;
    const prodiId = q.prodiId ? parseInt(q.prodiId) : undefined;
    const search = q.search;
    const page = q.page ? parseInt(q.page) : undefined;
    const limit = q.limit ? parseInt(q.limit) : undefined;
    try {
      return await KhsService.getMatriksNilaiMataKuliah({ periodeId, prodiId, search, page, limit });
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal mengambil matriks nilai mata kuliah.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getDetailNilaiMK({ params, query, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login.' };
    }
    // Detail nilai MK bersifat agregat admin/staff; mahasiswa tidak boleh mengakses.
    if (hasRole(user, ['mahasiswa'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const mataKuliahId = parseInt(params.mataKuliahId);
    if (isNaN(mataKuliahId)) {
      set.status = 400;
      return { error: 'ID Mata Kuliah tidak valid.' };
    }
    const periodeId = (query as Record<string, string | undefined>)?.periodeId;
    try {
      return await KhsService.getDetailNilaiMataKuliah(mataKuliahId, periodeId);
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal mengambil detail nilai mata kuliah.' };
    }
  }
}
