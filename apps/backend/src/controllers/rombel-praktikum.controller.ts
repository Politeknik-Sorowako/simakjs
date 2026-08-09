import { RombelPraktikumService } from '../services/rombel-praktikum.service';
import { type AuthContext, allowed, type PublicContext } from '../utils/types';

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
      if (!allowed(user, ['admin', 'super_admin', 'dosen', 'prodi'])) {
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
      if (!allowed(user, ['admin', 'super_admin', 'dosen', 'prodi'])) {
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
      if (!allowed(user, ['admin', 'super_admin', 'dosen', 'prodi'])) {
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
      if (!allowed(user, ['admin', 'super_admin', 'dosen', 'prodi'])) {
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
      return await RombelPraktikumService.getBapByRombel(parseInt(params.rombelId));
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async createBap({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'super_admin', 'dosen', 'prodi'])) {
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
      if (!allowed(user, ['admin', 'super_admin', 'dosen', 'prodi'])) {
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
  static async savePresensiBulk({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'super_admin', 'dosen', 'prodi'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      if (!allowed(user, ['admin', 'super_admin'])) {
        const allowedStatuses = new Set(['hadir', 'telat', 'unknown']);
        const restricted = (body.presensiList || []).filter((p: { status: string }) => !allowedStatuses.has(p.status));
        if (restricted.length > 0) {
          set.status = 400;
          return { error: 'Instruktur hanya dapat menetapkan status Hadir, Telat, atau Unknown.' };
        }
      }
      await RombelPraktikumService.savePresensiBulk(body.bapPraktikumId, body.presensiList || []);
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
      return await RombelPraktikumService.getPresensiByBap(parseInt(params.bapPraktikumId));
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async generateEnrollmentToken({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'super_admin', 'dosen', 'prodi', 'instruktur'])) {
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
      if (!allowed(user, ['admin', 'super_admin', 'dosen', 'prodi', 'instruktur'])) {
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
  static async selfEnroll({ params, body, request, set }: PublicContext): Promise<any> {
    try {
      const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
      const userAgent = request.headers.get('user-agent');
      const result = await RombelPraktikumService.selfEnroll(params.token, body.mahasiswaId, ipAddress, userAgent);
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
      if (!allowed(user, ['admin', 'super_admin', 'dosen', 'prodi', 'instruktur'])) {
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
      if (!allowed(user, ['admin', 'super_admin', 'dosen', 'prodi'])) {
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
      if (!allowed(user, ['admin', 'super_admin', 'dosen', 'prodi'])) {
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
