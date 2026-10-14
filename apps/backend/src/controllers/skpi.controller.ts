import { eq } from 'drizzle-orm';
import { dosen, mahasiswa } from '../models/schema';
import { ProdiScopeService } from '../services/prodi-scope.service';
import { SkpiService } from '../services/skpi.service';
import { db } from '../utils/db';
import { lampiranFilePath, SKPI_LAMPIRAN_DIR } from '../utils/lampiran-storage';
import { canAccessAllProdi, hasRole } from '../utils/role';
import { AuthContext, UserPayload, UserRole } from '../utils/types';

/** Role staf yang boleh memverifikasi / mengelola rekaman kegiatan SKPI. */
const STAFF_VERIFIER_ROLES: UserRole[] = ['super_admin', 'admin', 'prodi', 'kaprodi', 'kemahasiswaan'];

export class SkpiController {
  private static async getMahasiswaIdByEmail(email: string): Promise<number | null> {
    const [mhs] = await db.select({ id: mahasiswa.id }).from(mahasiswa).where(eq(mahasiswa.email, email));
    return mhs ? mhs.id : null;
  }

  private static async getDosenIdByEmail(email: string): Promise<number | null> {
    const [dsn] = await db.select({ id: dosen.id }).from(dosen).where(eq(dosen.email, email));
    return dsn ? dsn.id : null;
  }

  private static isStaffVerifier(user: UserPayload): boolean {
    return hasRole(user, STAFF_VERIFIER_ROLES);
  }

  /**
   * Cek akses user terhadap satu rekaman kegiatan:
   * pemilik mahasiswa, Dosen PA pemilik mahasiswa, atau staf verifier dalam prodi scope.
   */
  private static async canAccessKegiatan(
    user: UserPayload,
    kegiatan: Awaited<ReturnType<typeof SkpiService.getById>>,
  ): Promise<boolean> {
    if (!kegiatan) return false;
    if (SkpiController.isStaffVerifier(user)) {
      return ProdiScopeService.canAccessProdi(user, kegiatan.mahasiswa?.programStudiId);
    }
    if (hasRole(user, ['mahasiswa'])) {
      const myMhsId = await SkpiController.getMahasiswaIdByEmail(user.email);
      return myMhsId !== null && myMhsId === kegiatan.mahasiswaId;
    }
    if (hasRole(user, ['dosen'])) {
      const myDsnId = await SkpiController.getDosenIdByEmail(user.email);
      return myDsnId !== null && kegiatan.mahasiswa?.dosenPaId === myDsnId;
    }
    return false;
  }

  /**
   * Validasi filter `?mahasiswaId=` pada daftar rekaman sesuai peran:
   * staf divalidasi via prodi-scope, mahasiswa hanya boleh dirinya sendiri,
   * dosen hanya boleh mahasiswa bimbingan PA-nya.
   */
  private static async authorizeMahasiswaQuery(user: UserPayload, mahasiswaId: number): Promise<void> {
    if (SkpiController.isStaffVerifier(user)) {
      await ProdiScopeService.assertMahasiswaInScope(user, [mahasiswaId]);
      return;
    }
    if (hasRole(user, ['mahasiswa'])) {
      const myMhsId = await SkpiController.getMahasiswaIdByEmail(user.email);
      if (myMhsId === null || myMhsId !== mahasiswaId) {
        throw new Error('Anda hanya dapat melihat rekaman kegiatan milik sendiri.');
      }
      return;
    }
    if (hasRole(user, ['dosen'])) {
      const myDsnId = await SkpiController.getDosenIdByEmail(user.email);
      if (myDsnId === null) throw new Error('Profil dosen tidak ditemukan.');
      const [mhs] = await db
        .select({ dosenPaId: mahasiswa.dosenPaId })
        .from(mahasiswa)
        .where(eq(mahasiswa.id, mahasiswaId));
      if (!mhs || mhs.dosenPaId !== myDsnId) {
        throw new Error('Mahasiswa tidak termasuk dalam bimbingan Anda.');
      }
      return;
    }
    throw new Error('Akses ditolak.');
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getKategori({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    const includeInactive = query?.semua === 'true' && SkpiController.isStaffVerifier(user);
    return { data: await SkpiService.getKategoriAll(includeInactive) };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async createKategori({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!SkpiController.isStaffVerifier(user)) {
      set.status = 403;
      return { error: 'Hanya Admin, Prodi, Kaprodi, atau Kemahasiswaan yang dapat mengelola kategori kegiatan.' };
    }
    try {
      const data = await SkpiService.createKategori({
        nama: body.nama,
        jenis: body.jenis,
        poinDefault: body.poinDefault,
        isAktif: body.isAktif,
      });
      set.status = 201;
      return data;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal membuat kategori' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async updateKategori({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!SkpiController.isStaffVerifier(user)) {
      set.status = 403;
      return { error: 'Hanya Admin, Prodi, Kaprodi, atau Kemahasiswaan yang dapat mengelola kategori kegiatan.' };
    }
    try {
      return await SkpiService.updateKategori(params.id, body);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mengubah kategori' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async deleteKategori({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['super_admin', 'admin'])) {
      set.status = 403;
      return { error: 'Hanya Admin atau Super Admin yang dapat menghapus kategori kegiatan.' };
    }
    try {
      const data = await SkpiService.deleteKategori(params.id);
      return { message: 'Kategori kegiatan berhasil dihapus.', data };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal menghapus kategori' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (hasRole(user, ['guest', 'calon_mahasiswa'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    const page = query?.page ?? 1;
    const limit = query?.limit ?? 10;
    const empty = { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
    let scope: { mahasiswaId?: number; dosenPaId?: number; prodiIds?: number[] | null } = {};

    if (SkpiController.isStaffVerifier(user)) {
      if (!canAccessAllProdi(user)) {
        const prodiIds = await ProdiScopeService.getUserAccessibleProdiIds(user);
        if (prodiIds !== null && prodiIds.length === 0) return empty;
        scope.prodiIds = prodiIds;
      }
    } else if (hasRole(user, ['mahasiswa'])) {
      const myMhsId = await SkpiController.getMahasiswaIdByEmail(user.email);
      if (!myMhsId) return empty;
      scope.mahasiswaId = myMhsId;
    } else if (hasRole(user, ['dosen'])) {
      const myDsnId = await SkpiController.getDosenIdByEmail(user.email);
      if (!myDsnId) return empty;
      scope.dosenPaId = myDsnId;
    } else {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    if (query?.mahasiswaId) {
      try {
        await SkpiController.authorizeMahasiswaQuery(user, query.mahasiswaId);
      } catch (e: unknown) {
        set.status = 403;
        return { error: e instanceof Error ? e.message : 'Akses ditolak.' };
      }
      scope = { ...scope, mahasiswaId: query.mahasiswaId, dosenPaId: undefined };
    }

    return await SkpiService.getAll({
      page: query?.page,
      limit: query?.limit,
      status: query?.status,
      kategoriId: query?.kategoriId,
      search: query?.search,
      scope,
    });
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getById({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (hasRole(user, ['guest', 'calon_mahasiswa'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    const data = await SkpiService.getById(params.id);
    if (!data) {
      set.status = 404;
      return { error: 'Rekaman kegiatan tidak ditemukan.' };
    }
    if (!(await SkpiController.canAccessKegiatan(user, data))) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    return data;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async create({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (hasRole(user, ['guest', 'calon_mahasiswa'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    let mahasiswaId: number;
    if (hasRole(user, ['mahasiswa']) && !SkpiController.isStaffVerifier(user)) {
      const myMhsId = await SkpiController.getMahasiswaIdByEmail(user.email);
      if (!myMhsId) {
        set.status = 404;
        return { error: 'Profil mahasiswa tidak ditemukan.' };
      }
      mahasiswaId = myMhsId;
    } else if (SkpiController.isStaffVerifier(user)) {
      if (!body.mahasiswaId) {
        set.status = 400;
        return { error: 'mahasiswaId wajib diisi untuk input rekaman oleh staf.' };
      }
      try {
        await ProdiScopeService.assertMahasiswaInScope(user, [body.mahasiswaId]);
      } catch (e: unknown) {
        set.status = 403;
        return { error: e instanceof Error ? e.message : 'Akses ditolak.' };
      }
      mahasiswaId = body.mahasiswaId;
    } else {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    try {
      const data = await SkpiService.create({
        mahasiswaId,
        kategoriKegiatanId: body.kategoriKegiatanId,
        namaKegiatan: body.namaKegiatan,
        penyelenggara: body.penyelenggara,
        tanggalMulai: body.tanggalMulai,
        tanggalSelesai: body.tanggalSelesai,
        lokasi: body.lokasi,
        deskripsi: body.deskripsi,
        nomorSertifikat: body.nomorSertifikat,
        createdById: user.id,
      });
      set.status = 201;
      return data;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal membuat rekaman kegiatan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async update({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    const kegiatan = await SkpiService.getById(params.id);
    if (!kegiatan) {
      set.status = 404;
      return { error: 'Rekaman kegiatan tidak ditemukan.' };
    }
    if (!(await SkpiController.canAccessKegiatan(user, kegiatan))) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      return await SkpiService.update(params.id, body);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mengubah rekaman kegiatan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async delete({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    const kegiatan = await SkpiService.getById(params.id);
    if (!kegiatan) {
      set.status = 404;
      return { error: 'Rekaman kegiatan tidak ditemukan.' };
    }
    if (!(await SkpiController.canAccessKegiatan(user, kegiatan))) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    // Hapus hanya boleh oleh pemilik (mahasiswa) atau admin — staf verifier
    // non-admin dan Dosen PA tidak boleh menghapus (plan §4.2).
    const isAdmin = hasRole(user, ['super_admin', 'admin']);
    const ownerMahasiswaId = hasRole(user, ['mahasiswa'])
      ? ((await SkpiController.getMahasiswaIdByEmail(user.email)) ?? undefined)
      : undefined;
    if (!isAdmin && ownerMahasiswaId !== kegiatan.mahasiswaId) {
      set.status = 403;
      return { error: 'Hanya pemilik rekaman atau admin yang dapat menghapus rekaman.' };
    }
    try {
      const data = await SkpiService.delete(params.id, { ownerMahasiswaId, isAdmin });
      return { message: 'Rekaman kegiatan berhasil dihapus.', data };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal menghapus rekaman kegiatan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async verify({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (hasRole(user, ['mahasiswa', 'guest', 'calon_mahasiswa']) && !SkpiController.isStaffVerifier(user)) {
      set.status = 403;
      return { error: 'Akses ditolak. Anda tidak memiliki wewenang untuk memverifikasi rekaman kegiatan.' };
    }

    const kegiatan = await SkpiService.getById(params.id);
    if (!kegiatan) {
      set.status = 404;
      return { error: 'Rekaman kegiatan tidak ditemukan.' };
    }

    if (SkpiController.isStaffVerifier(user)) {
      const inScope = await ProdiScopeService.canAccessProdi(user, kegiatan.mahasiswa?.programStudiId);
      if (!inScope) {
        set.status = 403;
        return { error: 'Akses ditolak. Mahasiswa berada di luar lingkup prodi Anda.' };
      }
    } else if (hasRole(user, ['dosen'])) {
      const myDsnId = await SkpiController.getDosenIdByEmail(user.email);
      if (!myDsnId || kegiatan.mahasiswa?.dosenPaId !== myDsnId) {
        set.status = 403;
        return { error: 'Hanya Dosen Pendamping (PA) mahasiswa ini yang dapat memverifikasi.' };
      }
    } else {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    try {
      return await SkpiService.verify(params.id, user.id, {
        action: body.action,
        catatan: body.catatan,
        poin: body.poin,
      });
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memverifikasi rekaman' };
    }
  }

  // ─── Lampiran ──────────────────────────────────────────────────────────────

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async listLampiran({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    const kegiatan = await SkpiService.getById(params.id);
    if (!kegiatan) {
      set.status = 404;
      return { error: 'Rekaman kegiatan tidak ditemukan.' };
    }
    if (!(await SkpiController.canAccessKegiatan(user, kegiatan))) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    return { data: await SkpiService.listLampiran(kegiatan.id) };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async uploadLampiran({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    const kegiatan = await SkpiService.getById(params.id);
    if (!kegiatan) {
      set.status = 404;
      return { error: 'Rekaman kegiatan tidak ditemukan.' };
    }
    if (!(await SkpiController.canAccessKegiatan(user, kegiatan))) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const data = await SkpiService.addLampiran(kegiatan.id, body.file, body.keterangan, user.id);
      set.status = 201;
      return data;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mengunggah lampiran' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async downloadLampiran({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    const kegiatan = await SkpiService.getById(params.id);
    if (!kegiatan) {
      set.status = 404;
      return { error: 'Rekaman kegiatan tidak ditemukan.' };
    }
    if (!(await SkpiController.canAccessKegiatan(user, kegiatan))) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const row = await SkpiService.getLampiran(kegiatan.id, params.lampiranId);
    const path = row ? lampiranFilePath(row.storageKey, SKPI_LAMPIRAN_DIR) : null;
    const file = path ? Bun.file(path) : null;
    if (!row || !file || !(await file.exists())) {
      set.status = 404;
      return { error: 'Lampiran tidak ditemukan.' };
    }
    set.headers['Content-Type'] = row.mimeType;
    set.headers['Content-Disposition'] = `inline; filename*=UTF-8''${encodeURIComponent(row.fileName)}`;
    set.headers['Cache-Control'] = 'private, no-store';
    return file;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async deleteLampiran({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    const kegiatan = await SkpiService.getById(params.id);
    if (!kegiatan) {
      set.status = 404;
      return { error: 'Rekaman kegiatan tidak ditemukan.' };
    }
    if (!(await SkpiController.canAccessKegiatan(user, kegiatan))) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const data = await SkpiService.removeLampiran(kegiatan.id, params.lampiranId);
      return { message: 'Lampiran berhasil dihapus.', data };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal menghapus lampiran' };
    }
  }
}
