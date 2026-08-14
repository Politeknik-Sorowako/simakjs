import { ProdiScopeService } from '../services/prodi-scope.service';
import { RombelPraktikumService } from '../services/rombel-praktikum.service';
import { hasRole } from '../utils/role';
import { type AuthContext, type PublicContext } from '../utils/types';

const enrollRateLimit = new Map<string, { count: number; resetTime: number }>();
const ENROLL_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const ENROLL_RATE_LIMIT_MAX = 10;

export class RombelPraktikumController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getByKelas({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      return await RombelPraktikumService.getByKelas(parseInt(params.kelasKuliahId));
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async createRombel({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!hasRole(user, ['admin', 'super_admin', 'dosen', 'prodi', 'instruktur'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await RombelPraktikumService.createRombel(body);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async updateRombel({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!hasRole(user, ['admin', 'super_admin', 'dosen', 'prodi', 'instruktur'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await RombelPraktikumService.updateRombel(parseInt(params.id), body);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async deleteRombel({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!hasRole(user, ['admin', 'super_admin', 'dosen', 'prodi', 'instruktur'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await RombelPraktikumService.deleteRombel(parseInt(params.id));
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async assignMahasiswa({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!hasRole(user, ['admin', 'super_admin', 'dosen', 'prodi', 'instruktur'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      await RombelPraktikumService.assignMahasiswa(parseInt(params.id), body.mahasiswaIds || []);
      return { success: true };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getBapByRombel({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      return await RombelPraktikumService.getBapByRombel(parseInt(params.id));
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async createBap({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!hasRole(user, ['admin', 'super_admin', 'dosen', 'prodi', 'instruktur'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await RombelPraktikumService.createBap(body);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async updateBap({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!hasRole(user, ['admin', 'super_admin', 'dosen', 'prodi', 'instruktur'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await RombelPraktikumService.updateBap(parseInt(params.id), body);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async updateBapBulk({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!hasRole(user, ['admin', 'super_admin', 'dosen', 'prodi', 'instruktur'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await RombelPraktikumService.updateBapBulk(body);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async deleteBap({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!hasRole(user, ['admin', 'super_admin', 'dosen', 'prodi', 'instruktur'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      const deleted = await RombelPraktikumService.deleteBap(parseInt(params.id));
      if (!deleted) {
        set.status = 404;
        return { error: 'BAP praktikum tidak ditemukan' };
      }
      return { success: true, id: deleted.id };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async savePresensiBulk({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!hasRole(user, ['admin', 'super_admin', 'dosen', 'prodi', 'instruktur'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      if (!hasRole(user, ['admin', 'super_admin', 'prodi'])) {
        const allowedStatuses = new Set(['hadir', 'telat', 'unknown']);
        const restricted = (body.presensiList || []).filter((p: { status: string }) => !allowedStatuses.has(p.status));
        if (restricted.length > 0) {
          set.status = 400;
          return { error: 'Instruktur hanya dapat menetapkan status Hadir, Telat, atau Unknown.' };
        }
      }
      await RombelPraktikumService.savePresensiBulk(body.bapPraktikumId, body.presensiList || [], user!.id);
      return { success: true };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getPresensiByBap({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      return await RombelPraktikumService.getPresensiByBap(parseInt(params.id));
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getUnknownPresensiPraktikum({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'super_admin', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin/Admin Prodi.' };
    }
    const page = query?.page ? parseInt(query.page) : 1;
    const limit = query?.limit ? parseInt(query.limit) : 20;
    const search = query?.search;
    const statusFilter =
      query?.statusFilter === 'belum' || query?.statusFilter === 'sudah' ? query.statusFilter : undefined;
    let prodiIds: number[] | undefined;
    if (hasRole(user, ['admin', 'super_admin'])) {
      const prodiId = query?.prodiId ? parseInt(query.prodiId) : undefined;
      prodiIds = prodiId ? [prodiId] : undefined;
    } else {
      prodiIds = (await ProdiScopeService.getUserAccessibleProdiIds(user)) || undefined;
    }
    return await RombelPraktikumService.getUnknownPresensiPraktikum(page, limit, search, prodiIds, statusFilter);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async generateEnrollmentToken({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!hasRole(user, ['admin', 'super_admin', 'dosen', 'prodi', 'instruktur'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await RombelPraktikumService.generateEnrollmentToken(parseInt(params.id));
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async toggleEnrollment({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!hasRole(user, ['admin', 'super_admin', 'dosen', 'prodi', 'instruktur'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await RombelPraktikumService.toggleEnrollment(parseInt(params.id), body.enabled);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getRombelByToken({ params, request, set }: PublicContext): Promise<any> {
    try {
      const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
      const userAgent = request.headers.get('user-agent');
      const rombel = await RombelPraktikumService.getRombelByToken(params.token);
      if (!rombel) {
        set.status = 404;
        return { error: 'Token pendaftaran tidak valid' };
      }
      return {
        id: rombel.id,
        namaGroup: rombel.namaGroup,
        keterangan: rombel.keterangan,
        enrollmentEnabled: rombel.enrollmentEnabled,
        enrollmentMaxStudents: rombel.enrollmentMaxStudents,
        enrollmentExpiresAt: rombel.enrollmentExpiresAt,
        enrolledCount: rombel.mahasiswaList?.length || 0,
        instruktur: rombel.instruktur,
        mataKuliah: rombel.kelasKuliah?.mataKuliah || null,
      };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async selfEnroll({ params, request, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }
    // Rate-limit token guesses per user to mitigate enrollment-token brute-force.
    if (process.env.NODE_ENV !== 'test') {
      const now = Date.now();
      const limitKey = `enroll:${user.id}`;
      const record = enrollRateLimit.get(limitKey);
      if (record && now < record.resetTime) {
        if (record.count >= ENROLL_RATE_LIMIT_MAX) {
          set.status = 429;
          return { error: 'Terlalu banyak percobaan pendaftaran. Silakan coba lagi dalam 10 menit.' };
        }
        record.count++;
      } else {
        enrollRateLimit.set(limitKey, { count: 1, resetTime: now + ENROLL_RATE_LIMIT_WINDOW_MS });
      }
    }
    try {
      // IDOR prevention: enroll as the authenticated student only — the
      // mahasiswaId is resolved from the session's email, not from the body.
      const mahasiswaId = await RombelPraktikumService.getMahasiswaIdByEmail(user.email);
      if (!mahasiswaId) {
        set.status = 400;
        return { error: 'Profil mahasiswa tidak ditemukan untuk akun ini.' };
      }
      const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
      const userAgent = request.headers.get('user-agent');
      const result = await RombelPraktikumService.selfEnroll(params.token, mahasiswaId, ipAddress, userAgent);
      set.status = 201;
      return result;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getEnrollmentLog({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!hasRole(user, ['admin', 'super_admin', 'dosen', 'prodi', 'instruktur'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await RombelPraktikumService.getEnrollmentLog(parseInt(params.id));
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async syncPresensi({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!hasRole(user, ['admin', 'super_admin', 'dosen', 'prodi', 'instruktur'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await RombelPraktikumService.syncPresensiPraktikumToKelas(body.bapPraktikumId);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async syncNilai({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!hasRole(user, ['admin', 'super_admin', 'dosen', 'prodi', 'instruktur'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await RombelPraktikumService.syncNilaiPraktikumToKelas(parseInt(params.id));
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }
}
