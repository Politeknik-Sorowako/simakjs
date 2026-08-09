import { ApelService } from '../services/apel.service';
import { hasRole } from '../utils/role';
import { type AuthContext, allowed } from '../utils/types';

export class ApelController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async createKelompok({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'super_admin'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      if (!body?.namaKelompok) {
        set.status = 400;
        return { error: 'Nama kelompok wajib diisi.' };
      }
      return await ApelService.createKelompok(body);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async updateKelompok({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'prodi'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await ApelService.updateKelompok(parseInt(params.id), body);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async deleteKelompok({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await ApelService.deleteKelompok(parseInt(params.id));
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getKelompokByProdi({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      let dosenId = query?.dosenId ? parseInt(query.dosenId) : undefined;

      if (hasRole(user, ['dosen']) && !dosenId) {
        const dosenUser = await ApelService.getDosenByEmail(user.email);
        if (dosenUser) dosenId = dosenUser.id;
      }
      return await ApelService.getKelompokByProdi(undefined, dosenId);
    } catch (e: unknown) {
      console.error('[ApelController] Error fetching kelompok apel:', e);
      return [];
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getKelompokDetail({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      return await ApelService.getKelompokDetail(parseInt(params.id));
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async manageAnggota({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'prodi'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await ApelService.addAnggota(parseInt(params.id), body.mahasiswaIds);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async removeAnggota({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'prodi'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await ApelService.removeAnggota(parseInt(params.id), parseInt(params.mhsId));
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async bukaSesi({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user || !allowed(user, ['admin', 'dosen', 'prodi', 'instruktur'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      let dosenId = body?.dosenId;
      if (!dosenId && hasRole(user, ['dosen'])) {
        const dosenUser = await ApelService.getDosenByEmail(user.email);
        if (dosenUser) dosenId = dosenUser.id;
      }
      if (!dosenId) {
        set.status = 400;
        return { error: 'Pilih Dosen PJ Sesi terlebih dahulu.' };
      }
      return await ApelService.bukaSesi({ ...body, dosenId });
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async submitPresensi({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'dosen', 'prodi', 'instruktur'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      // Hanya admin/super_admin yang boleh menetapkan status sakit/izin/alpa secara langsung.
      // Dosen/PJ apel hanya dapat menetapkan Hadir, Terlambat, atau Unknown.
      if (!allowed(user, ['admin', 'super_admin'])) {
        const allowedStatuses = new Set(['hadir', 'terlambat', 'unknown']);
        const restricted = (body.presensiList || []).filter((p: { status: string }) => !allowedStatuses.has(p.status));
        if (restricted.length > 0) {
          set.status = 400;
          return { error: 'Dosen hanya dapat menetapkan status Hadir, Terlambat, atau Unknown untuk presensi apel.' };
        }
      }
      return await ApelService.submitPresensi(parseInt(params.id), body.presensiList);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getSesiPresensi({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      return await ApelService.getSesiPresensi(parseInt(params.id));
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getSesiByKelompok({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      return await ApelService.getSesiByKelompok(parseInt(params.kelompokId));
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async tutupSesi({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'dosen', 'prodi', 'instruktur'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await ApelService.tutupSesi(parseInt(params.id));
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async bukaKembaliSesi({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'dosen', 'prodi', 'instruktur'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await ApelService.bukaKembaliSesi(parseInt(params.id));
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async deleteSesi({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await ApelService.deleteSesi(parseInt(params.id));
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async updateSesi({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'dosen', 'prodi', 'instruktur'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      return await ApelService.updateSesi(parseInt(params.id), body);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getSesiAktif({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      let dosenId = query?.dosenId ? parseInt(query.dosenId) : undefined;
      if (hasRole(user, ['dosen']) && !dosenId) {
        const dosenUser = await ApelService.getDosenByEmail(user.email);
        if (dosenUser) dosenId = dosenUser.id;
      }
      return await ApelService.getSesiAktif(dosenId);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getMonitorRealtime({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'dosen', 'prodi', 'instruktur'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      const u = user!;
      let dosenId = query?.dosenId ? parseInt(query.dosenId) : undefined;
      const tanggal = query?.tanggal || undefined;
      if (hasRole(u, ['dosen']) && !dosenId) {
        const dosenUser = await ApelService.getDosenByEmail(u.email);
        if (dosenUser) dosenId = dosenUser.id;
      }
      return await ApelService.getMonitorRealtime(dosenId, tanggal);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getPresensiUnknown({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'prodi'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      const page = query?.page ? parseInt(query.page) : 1;
      const limit = query?.limit ? parseInt(query.limit) : 20;
      const prodiId = query?.prodiId ? parseInt(query.prodiId) : undefined;
      const kelompokId = query?.kelompokId ? parseInt(query.kelompokId) : undefined;
      const tanggal = query?.tanggal || undefined;
      return await ApelService.getPresensiUnknown(page, limit, prodiId, kelompokId, tanggal);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async verifyPresensi({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!allowed(user, ['admin', 'prodi'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      const u = user!;
      return await ApelService.verifyPresensi(parseInt(params.id), {
        verifiedStatus: body.verifiedStatus,
        verifiedBy: u.id,
        verificationNote: body.verificationNote,
        menitTerlambat: body.menitTerlambat,
      });
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getRekapApel({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      return await ApelService.getRekapApel(parseInt(params.kelompokId));
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }
}
