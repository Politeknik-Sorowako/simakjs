import { eq } from 'drizzle-orm';
import type { PembimbingJenis } from '../models/schema';
import { dosen, mahasiswa } from '../models/schema';
import { PembimbingService } from '../services/pembimbing.service';
import { ProdiScopeService } from '../services/prodi-scope.service';
import { db } from '../utils/db';
import { hasRole } from '../utils/role';
import { AuthContext, UserPayload, UserRole } from '../utils/types';

/** Role yang boleh menetapkan/mengganti pembimbing (selalu dalam prodi scope masing-masing). */
const MANAGER_ROLES: UserRole[] = ['admin', 'super_admin', 'prodi', 'kaprodi'];
/** Role yang boleh membaca daftar penetapan pembimbing. */
const READER_ROLES: UserRole[] = ['admin', 'super_admin', 'prodi', 'kaprodi', 'dosen', 'mahasiswa'];

interface SetPembimbingBody {
  mahasiswaId: number;
  jenis: PembimbingJenis;
  dosenId?: number | null;
  namaEksternal?: string | null;
  instansiEksternal?: string | null;
  catatan?: string | null;
}

type BulkSetBody = Omit<SetPembimbingBody, 'mahasiswaId'> & { mahasiswaIds: number[] };

export class PembimbingController {
  private static async getMahasiswaIdByEmail(email: string): Promise<number | null> {
    const [mhs] = await db.select({ id: mahasiswa.id }).from(mahasiswa).where(eq(mahasiswa.email, email));
    return mhs ? mhs.id : null;
  }

  private static async getDosenIdByEmail(email: string): Promise<number | null> {
    const [dsn] = await db.select({ id: dosen.id }).from(dosen).where(eq(dosen.email, email));
    return dsn ? dsn.id : null;
  }

  /**
   * Cek apakah user boleh melihat penetapan pembimbing mahasiswa tertentu:
   * staf dalam prodi scope, mahasiswa itu sendiri, atau dosen yang menjadi
   * PA/pembimbing aktif mahasiswa tersebut.
   */
  private static async canAccessMahasiswa(user: UserPayload, mahasiswaId: number): Promise<boolean> {
    if (hasRole(user, ['admin', 'super_admin', 'prodi', 'kaprodi'])) {
      await ProdiScopeService.assertMahasiswaInScope(user, [mahasiswaId]);
      return true;
    }
    if (hasRole(user, ['mahasiswa'])) {
      const myId = await PembimbingController.getMahasiswaIdByEmail(user.email);
      return myId !== null && myId === mahasiswaId;
    }
    if (hasRole(user, ['dosen'])) {
      const myDosenId = await PembimbingController.getDosenIdByEmail(user.email);
      if (myDosenId === null) return false;
      const result = await PembimbingService.list({ dosenId: myDosenId, limit: 1 }, null);
      return result.data.some((item) => item.mahasiswaId === mahasiswaId);
    }
    return false;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll({ query, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu' };
      }
      if (!hasRole(user, READER_ROLES)) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      const scopedProdiIds = await ProdiScopeService.getUserAccessibleProdiIds(user);

      // Mahasiswa hanya boleh melihat miliknya; dosen hanya mahasiswa bimbingannya.
      let mahasiswaIdFilter: number | undefined;
      let dosenIdFilter: number | undefined;
      if (hasRole(user, ['mahasiswa'])) {
        mahasiswaIdFilter = (await PembimbingController.getMahasiswaIdByEmail(user.email)) ?? -1;
      } else if (hasRole(user, ['dosen'])) {
        dosenIdFilter = (await PembimbingController.getDosenIdByEmail(user.email)) ?? -1;
      }

      const angkatanIds = query?.angkatanIds
        ? String(query.angkatanIds)
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
        : undefined;

      return await PembimbingService.list(
        {
          programStudiId: query?.programStudiId ? Number(query.programStudiId) : undefined,
          angkatan: query?.angkatan ? String(query.angkatan) : undefined,
          angkatanIds,
          jenis: query?.jenis as PembimbingJenis | undefined,
          belumDitetapkan: query?.belumDitetapkan === true || query?.belumDitetapkan === 'true',
          status: query?.status === 'semua' ? 'semua' : 'aktif',
          search: query?.search ? String(query.search) : undefined,
          page: query?.page ? Number(query.page) : 1,
          limit: query?.limit ? Number(query.limit) : 25,
          mahasiswaId: mahasiswaIdFilter,
          dosenId: dosenIdFilter,
        },
        scopedProdiIds,
      );
    } catch (err: unknown) {
      set.status = 500;
      return { error: err instanceof Error ? err.message : 'Gagal mengambil data pembimbing' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getByMahasiswa({ params, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu' };
      }
      if (!hasRole(user, READER_ROLES)) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      const mahasiswaId = Number(params.mahasiswaId);
      const allowed = await PembimbingController.canAccessMahasiswa(user, mahasiswaId);
      if (!allowed) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      const data = await PembimbingService.getByMahasiswa(mahasiswaId);
      if (!data) {
        set.status = 404;
        return { error: 'Data mahasiswa tidak ditemukan.' };
      }
      const riwayat = await PembimbingService.getRiwayat(mahasiswaId);
      return { data, riwayat };
    } catch (err: unknown) {
      set.status = 500;
      return { error: err instanceof Error ? err.message : 'Gagal mengambil data pembimbing mahasiswa' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async set({ body, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu' };
      }
      if (!hasRole(user, MANAGER_ROLES)) {
        set.status = 403;
        return { error: 'Akses ditolak. Hanya Admin, Super Admin, dan Admin Prodi/Kaprodi.' };
      }
      const dto = body as SetPembimbingBody;
      await ProdiScopeService.assertMahasiswaInScope(user, [dto.mahasiswaId]);
      const scopedProdiIds = await ProdiScopeService.getUserAccessibleProdiIds(user);
      const saved = await PembimbingService.set(dto, user.id, scopedProdiIds);
      return { message: 'Pembimbing berhasil ditetapkan.', data: saved };
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal menetapkan pembimbing' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async bulkSet({ body, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu' };
      }
      if (!hasRole(user, MANAGER_ROLES)) {
        set.status = 403;
        return { error: 'Akses ditolak. Hanya Admin, Super Admin, dan Admin Prodi/Kaprodi.' };
      }
      const dto = body as BulkSetBody;
      await ProdiScopeService.assertMahasiswaInScope(user, dto.mahasiswaIds);
      const scopedProdiIds = await ProdiScopeService.getUserAccessibleProdiIds(user);
      const result = await PembimbingService.bulkSet(
        {
          mahasiswaIds: dto.mahasiswaIds,
          jenis: dto.jenis,
          dosenId: dto.dosenId,
          namaEksternal: dto.namaEksternal,
          instansiEksternal: dto.instansiEksternal,
          catatan: dto.catatan,
        },
        user.id,
        scopedProdiIds,
      );
      return {
        message: `Berhasil menetapkan pembimbing untuk ${result.updated} mahasiswa.`,
        data: result,
      };
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal menetapkan pembimbing massal' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async nonaktifkan({ params, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu' };
      }
      if (!hasRole(user, MANAGER_ROLES)) {
        set.status = 403;
        return { error: 'Akses ditolak. Hanya Admin, Super Admin, dan Admin Prodi/Kaprodi.' };
      }
      const scopedProdiIds = await ProdiScopeService.getUserAccessibleProdiIds(user);
      const updated = await PembimbingService.nonaktifkan(Number(params.id), scopedProdiIds);
      return { message: 'Penetapan pembimbing dinonaktifkan.', data: updated };
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal menonaktifkan penetapan pembimbing' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async importCsv({ request, query, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu' };
      }
      if (!hasRole(user, MANAGER_ROLES)) {
        set.status = 403;
        return { error: 'Akses ditolak. Hanya Admin, Super Admin, dan Admin Prodi/Kaprodi.' };
      }
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (!file) {
        set.status = 400;
        return { error: 'File CSV tidak ditemukan.' };
      }
      const jenisDefault = (query?.jenis ? String(query.jenis) : undefined) as PembimbingJenis | undefined;
      const scopedProdiIds = await ProdiScopeService.getUserAccessibleProdiIds(user);
      const result = await PembimbingService.importCsv(await file.text(), {
        jenisDefault,
        ditetapkanOlehId: user.id,
        scopedProdiIds,
      });
      return {
        message: `Impor selesai: ${result.successCount} berhasil, ${result.errors.length} gagal.`,
        data: result,
      };
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal mengimpor CSV pembimbing' };
    }
  }
}
