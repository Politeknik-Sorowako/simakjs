import { eq } from 'drizzle-orm';
import { dosen, mahasiswa } from '../models/schema';
import { AktivitasInput, AktivitasMbkmService, type StatusAktivitas } from '../services/aktivitas-mbkm.service';
import { ProdiScopeService } from '../services/prodi-scope.service';
import { db } from '../utils/db';
import { hasRole } from '../utils/role';
import { AuthContext, UserPayload, UserRole } from '../utils/types';

/** Role yang boleh membuat/menjalankan aktivitas MBKM (selalu dalam prodi scope masing-masing). */
const MANAGER_ROLES: UserRole[] = ['admin', 'super_admin', 'prodi', 'kaprodi', 'kemahasiswaan'];
const APPROVER_ROLES: UserRole[] = ['admin', 'super_admin', 'prodi', 'kaprodi', 'kemahasiswaan'];
const READER_ROLES: UserRole[] = [...APPROVER_ROLES, 'dosen', 'mahasiswa'];

export class AktivitasMbkmController {
  private static async getMahasiswaIdByEmail(email: string): Promise<number | null> {
    const [mhs] = await db.select({ id: mahasiswa.id }).from(mahasiswa).where(eq(mahasiswa.email, email));
    return mhs ? mhs.id : null;
  }

  private static async getDosenIdByEmail(email: string): Promise<number | null> {
    const [dsn] = await db.select({ id: dosen.id }).from(dosen).where(eq(dosen.email, email));
    return dsn ? dsn.id : null;
  }

  private static denyIfUnauthorized(user: UserPayload | null, roles: UserRole[], message: string) {
    if (!user) return 'Silakan login terlebih dahulu';
    if (!hasRole(user, roles)) return message;
    return null;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getJenis({ set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      const denied = AktivitasMbkmController.denyIfUnauthorized(user, READER_ROLES, 'Akses ditolak.');
      if (denied) {
        set.status = user ? 403 : 401;
        return { error: denied };
      }
      return { data: await AktivitasMbkmService.listJenis() };
    } catch (err: unknown) {
      set.status = 500;
      return { error: err instanceof Error ? err.message : 'Gagal mengambil jenis aktivitas' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll({ query, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      const denied = AktivitasMbkmController.denyIfUnauthorized(user, READER_ROLES, 'Akses ditolak.');
      if (denied || !user) {
        set.status = user ? 403 : 401;
        return { error: denied ?? 'Silakan login terlebih dahulu' };
      }

      // Cakupan prodi hanya berlaku untuk operator admin/prodi/kaprodi. Mahasiswa
      // dan dosen sudah dibatasi ke miliknya masing-masing, jadi scope kosong
      // (tanpa user_prodi_scopes) tidak boleh membuat daftar kosong.
      let scopedProdiIds = await ProdiScopeService.getUserAccessibleProdiIds(user);
      let mahasiswaId: number | undefined;
      let restrictToPembimbing = false;
      if (hasRole(user, ['mahasiswa'])) {
        scopedProdiIds = null;
        mahasiswaId = (await AktivitasMbkmController.getMahasiswaIdByEmail(user.email)) ?? -1;
      } else if (hasRole(user, ['dosen']) && !hasRole(user, MANAGER_ROLES)) {
        scopedProdiIds = null;
        restrictToPembimbing = true;
      }

      if (restrictToPembimbing) {
        const myDosenId = await AktivitasMbkmController.getDosenIdByEmail(user.email);
        if (myDosenId === null) {
          return { data: [], total: 0, page: 1, limit: 25, totalPages: 0 };
        }
        const result = await AktivitasMbkmService.list(
          {
            status: query?.status as StatusAktivitas | undefined,
            periodeId: query?.periodeId ? String(query.periodeId) : undefined,
            jenisId: query?.jenisId ? Number(query.jenisId) : undefined,
            search: query?.search ? String(query.search) : undefined,
            page: query?.page ? Number(query.page) : 1,
            limit: query?.limit ? Number(query.limit) : 25,
          },
          scopedProdiIds,
        );
        const filtered = result.data.filter((item) => item.pembimbing.some((p) => p.dosenId === myDosenId));
        return { ...result, data: filtered, total: filtered.length };
      }

      return await AktivitasMbkmService.list(
        {
          status: query?.status as StatusAktivitas | undefined,
          programStudiId: query?.programStudiId ? Number(query.programStudiId) : undefined,
          periodeId: query?.periodeId ? String(query.periodeId) : undefined,
          jenisId: query?.jenisId ? Number(query.jenisId) : undefined,
          search: query?.search ? String(query.search) : undefined,
          page: query?.page ? Number(query.page) : 1,
          limit: query?.limit ? Number(query.limit) : 25,
          mahasiswaId,
        },
        scopedProdiIds,
      );
    } catch (err: unknown) {
      set.status = 500;
      return { error: err instanceof Error ? err.message : 'Gagal mengambil data aktivitas' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getById({ params, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      const denied = AktivitasMbkmController.denyIfUnauthorized(user, READER_ROLES, 'Akses ditolak.');
      if (denied || !user) {
        set.status = user ? 403 : 401;
        return { error: denied ?? 'Silakan login terlebih dahulu' };
      }
      const data = await AktivitasMbkmService.getById(Number(params.id));
      if (hasRole(user, ['mahasiswa'])) {
        const myId = await AktivitasMbkmController.getMahasiswaIdByEmail(user.email);
        if (!data.anggota.some((a) => a.mahasiswaId === myId)) {
          set.status = 403;
          return { error: 'Akses ditolak.' };
        }
      }
      return { data };
    } catch (err: unknown) {
      set.status = 404;
      return { error: err instanceof Error ? err.message : 'Aktivitas tidak ditemukan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async create({ body, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      const denied = AktivitasMbkmController.denyIfUnauthorized(
        user,
        MANAGER_ROLES,
        'Akses ditolak. Hanya Admin/Prodi/Kaprodi/Kemahasiswaan.',
      );
      if (denied || !user) {
        set.status = user ? 403 : 401;
        return { error: denied ?? 'Silakan login terlebih dahulu' };
      }
      const scopedProdiIds = await ProdiScopeService.getUserAccessibleProdiIds(user);
      const input = body as AktivitasInput;
      if (input.programStudiId && scopedProdiIds && !scopedProdiIds.includes(input.programStudiId)) {
        set.status = 400;
        return { error: 'Program studi berada di luar cakupan Anda.' };
      }
      const row = await AktivitasMbkmService.create(input, user.id);
      set.status = 201;
      return { message: 'Aktivitas dibuat.', data: row };
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal membuat aktivitas' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async update({ params, body, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      const denied = AktivitasMbkmController.denyIfUnauthorized(
        user,
        MANAGER_ROLES,
        'Akses ditolak. Hanya Admin/Prodi/Kaprodi/Kemahasiswaan.',
      );
      if (denied || !user) {
        set.status = user ? 403 : 401;
        return { error: denied ?? 'Silakan login terlebih dahulu' };
      }
      const scopedProdiIds = await ProdiScopeService.getUserAccessibleProdiIds(user);
      const row = await AktivitasMbkmService.update(Number(params.id), body as AktivitasInput, scopedProdiIds);
      return { message: 'Aktivitas diperbarui.', data: row };
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal memperbarui aktivitas' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async remove({ params, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      const denied = AktivitasMbkmController.denyIfUnauthorized(
        user,
        MANAGER_ROLES,
        'Akses ditolak. Hanya Admin/Prodi/Kaprodi/Kemahasiswaan.',
      );
      if (denied || !user) {
        set.status = user ? 403 : 401;
        return { error: denied ?? 'Silakan login terlebih dahulu' };
      }
      const scopedProdiIds = await ProdiScopeService.getUserAccessibleProdiIds(user);
      const result = await AktivitasMbkmService.remove(Number(params.id), scopedProdiIds);
      return { message: 'Aktivitas dihapus.', data: result };
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal menghapus aktivitas' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async addAnggota({ params, body, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      const denied = AktivitasMbkmController.denyIfUnauthorized(
        user,
        MANAGER_ROLES,
        'Akses ditolak. Hanya Admin/Prodi/Kaprodi/Kemahasiswaan.',
      );
      if (denied || !user) {
        set.status = user ? 403 : 401;
        return { error: denied ?? 'Silakan login terlebih dahulu' };
      }
      const row = await AktivitasMbkmService.addAnggota(Number(params.id), {
        mahasiswaId: Number((body as { mahasiswaId: number }).mahasiswaId),
        peran: (body as { peran?: 'ketua' | 'anggota' }).peran,
      });
      set.status = 201;
      return { message: 'Anggota ditambahkan.', data: row };
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal menambahkan anggota' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async removeAnggota({ params, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      const denied = AktivitasMbkmController.denyIfUnauthorized(
        user,
        MANAGER_ROLES,
        'Akses ditolak. Hanya Admin/Prodi/Kaprodi/Kemahasiswaan.',
      );
      if (denied || !user) {
        set.status = user ? 403 : 401;
        return { error: denied ?? 'Silakan login terlebih dahulu' };
      }
      const result = await AktivitasMbkmService.removeAnggota(Number(params.id), Number(params.anggotaId));
      return { message: 'Anggota dihapus.', data: result };
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal menghapus anggota' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async addPembimbing({ params, body, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      const denied = AktivitasMbkmController.denyIfAuthorizationFallback(user);
      if (denied || !user) {
        set.status = user ? 403 : 401;
        return { error: denied ?? 'Silakan login terlebih dahulu' };
      }
      const row = await AktivitasMbkmService.addPembimbing(Number(params.id), {
        dosenId: Number((body as { dosenId: number }).dosenId),
        kategori: (body as { kategori?: 'pembimbing' | 'pendamping' }).kategori,
      });
      set.status = 201;
      return { message: 'Pembimbing ditambahkan.', data: row };
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal menambahkan pembimbing' };
    }
  }

  private static denyIfAuthorizationFallback(user: UserPayload | null) {
    return AktivitasMbkmController.denyIfUnauthorized(
      user,
      MANAGER_ROLES,
      'Akses ditolak. Hanya Admin/Prodi/Kaprodi/Kemahasiswaan.',
    );
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async removePembimbing({ params, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      const denied = AktivitasMbkmController.denyIfAuthorizationFallback(user);
      if (denied || !user) {
        set.status = user ? 403 : 401;
        return { error: denied ?? 'Silakan login terlebih dahulu' };
      }
      const result = await AktivitasMbkmService.removePembimbing(Number(params.id), Number(params.pembimbingId));
      return { message: 'Pembimbing dihapus.', data: result };
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal menghapus pembimbing' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async addKonversi({ params, body, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      const denied = AktivitasMbkmController.denyIfAuthorizationFallback(user);
      if (denied || !user) {
        set.status = user ? 403 : 401;
        return { error: denied ?? 'Silakan login terlebih dahulu' };
      }
      const row = await AktivitasMbkmService.addKonversi(Number(params.id), {
        mataKuliahId: Number((body as { mataKuliahId: number }).mataKuliahId),
        sksDiakui: Number((body as { sksDiakui: number }).sksDiakui),
      });
      set.status = 201;
      return { message: 'Rekognisi SKS ditambahkan.', data: row };
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal menambah rekognisi SKS' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async removeKonversi({ params, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      const denied = AktivitasMbkmController.denyIfAuthorizationFallback(user);
      if (denied || !user) {
        set.status = user ? 403 : 401;
        return { error: denied ?? 'Silakan login terlebih dahulu' };
      }
      const result = await AktivitasMbkmService.removeKonversi(Number(params.id), Number(params.konversiId));
      return { message: 'Rekognisi SKS dihapus.', data: result };
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal menghapus rekognisi SKS' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async ajukan({ params, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      const denied = AktivitasMbkmController.denyIfAuthorizationFallback(user);
      if (denied || !user) {
        set.status = user ? 403 : 401;
        return { error: denied ?? 'Silakan login terlebih dahulu' };
      }
      const scopedProdiIds = await ProdiScopeService.getUserAccessibleProdiIds(user);
      const row = await AktivitasMbkmService.ajukan(Number(params.id), scopedProdiIds);
      return { message: 'Aktivitas diajukan untuk verifikasi.', data: row };
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal mengajukan aktivitas' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async setujui({ params, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      const denied = AktivitasMbkmController.denyIfUnauthorized(
        user,
        APPROVER_ROLES,
        'Akses ditolak. Hanya Admin/Prodi/Kaprodi/Kemahasiswaan.',
      );
      if (denied || !user) {
        set.status = user ? 403 : 401;
        return { error: denied ?? 'Silakan login terlebih dahulu' };
      }
      const scopedProdiIds = await ProdiScopeService.getUserAccessibleProdiIds(user);
      const result = await AktivitasMbkmService.setujui(Number(params.id), user.id, scopedProdiIds);
      return {
        message: `Aktivitas disetujui. ${result.bimbinganDibuat} bimbingan PKL dibuat otomatis, ${result.bimbinganDilewati} sudah ada.`,
        data: result.row,
      };
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal menyetujui aktivitas' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async tolak({ params, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      const denied = AktivitasMbkmController.denyIfUnauthorized(
        user,
        APPROVER_ROLES,
        'Akses ditolak. Hanya Admin/Prodi/Kaprodi/Kemahasiswaan.',
      );
      if (denied || !user) {
        set.status = user ? 403 : 401;
        return { error: denied ?? 'Silakan login terlebih dahulu' };
      }
      const scopedProdiIds = await ProdiScopeService.getUserAccessibleProdiIds(user);
      const row = await AktivitasMbkmService.tolak(Number(params.id), scopedProdiIds);
      return { message: 'Aktivitas ditolak.', data: row };
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal menolak aktivitas' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async setSelesai({ params, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      const denied = AktivitasMbkmController.denyIfAuthorizationFallback(user);
      if (denied || !user) {
        set.status = user ? 403 : 401;
        return { error: denied ?? 'Silakan login terlebih dahulu' };
      }
      const scopedProdiIds = await ProdiScopeService.getUserAccessibleProdiIds(user);
      const row = await AktivitasMbkmService.setSelesai(Number(params.id), scopedProdiIds);
      return { message: 'Aktivitas ditandai selesai.', data: row };
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal menandai aktivitas selesai' };
    }
  }
}
