import { eq } from 'drizzle-orm';
import { dosen, mahasiswa } from '../models/schema';
import { CsvImportService } from '../services/csv-import.service';
import { DocumentSignatureService } from '../services/document-signature.service';
import { ProdiScopeService } from '../services/prodi-scope.service';
import { SkpiService } from '../services/skpi.service';
import { db } from '../utils/db';
import { getVerifyBaseUrl } from '../utils/document-signing';
import { lampiranFilePath, SKPI_LAMPIRAN_DIR } from '../utils/lampiran-storage';
import { canAccessAllProdi, hasRole } from '../utils/role';
import { AuthContext, UserPayload, UserRole } from '../utils/types';

/** Role staf yang boleh memverifikasi / mengelola rekaman kegiatan SKPI. */
const STAFF_VERIFIER_ROLES: UserRole[] = ['super_admin', 'admin', 'prodi', 'kaprodi', 'kemahasiswaan'];

/** Body pencabutan tanda tangan SKPI massal. */
interface BulkRevokeDokumenBody {
  mahasiswaIds: number[];
  reason: string;
}

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

    // Filter prodi: staf wajib dalam lingkup prodi terkait; untuk peran lain
    // filter ini hanya mempersempit data yang memang sudah terbatas (own/bimbingan).
    if (query?.prodiId) {
      if (SkpiController.isStaffVerifier(user)) {
        const allowed = await ProdiScopeService.canAccessProdi(user, query.prodiId);
        if (!allowed) {
          set.status = 403;
          return { error: 'Prodi di luar lingkup akses Anda.' };
        }
      }
      scope = { ...scope, prodiIds: [query.prodiId] };
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

  /**
   * Impor CSV daftar rekaman kegiatan oleh staf-verifier (hasil `pending`).
   * Scope prodi dihitung sekali lalu ditegakkan per baris — baris di luar
   * lingkup masuk daftar error per-baris (bukan 403 utuh), agar file campuran
   * tetap mengimpor baris yang valid.
   */
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async importKegiatan({ body, set, getCurrentUser }: AuthContext<{ file: File }>): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!SkpiController.isStaffVerifier(user)) {
      set.status = 403;
      return { error: 'Hanya staf Admin/Prodi/Kaprodi/Kemahasiswaan yang dapat mengimpor rekaman kegiatan.' };
    }

    // FormData sudah diparse Elysia via body schema (`t.File`, pola uploadLampiran).
    const file = body?.file;
    if (!(file instanceof File)) {
      set.status = 400;
      return { error: 'File CSV tidak ditemukan (field "file").' };
    }
    let csvText: string;
    try {
      csvText = await file.text();
    } catch {
      set.status = 400;
      return { error: 'Gagal membaca file CSV.' };
    }

    try {
      const allowedProdiIds = await ProdiScopeService.getUserAccessibleProdiIds(user);
      if (allowedProdiIds !== null && allowedProdiIds.length === 0) {
        set.status = 403;
        return { error: 'Tidak ada program studi dalam lingkup akses Anda.' };
      }
      return await CsvImportService.importKegiatanSkpi(csvText, { createdById: user.id, allowedProdiIds });
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mengimpor rekaman kegiatan.' };
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

  /**
   * Otorisasi aksi verifikasi satu rekaman: staf verifier dalam prodi scope,
   * atau Dosen PA pemilik mahasiswa. Mengembalikan pesan error bila ditolak
   * (null = lolos). Dipakai `verify` (tunggal) dan `verifyBulk` (massal) agar
   * aturannya tidak duplikat.
   */
  private static async authorizeVerify(
    user: UserPayload,
    kegiatan: Awaited<ReturnType<typeof SkpiService.getById>>,
  ): Promise<string | null> {
    if (!kegiatan) return 'Rekaman kegiatan tidak ditemukan.';
    if (SkpiController.isStaffVerifier(user)) {
      const inScope = await ProdiScopeService.canAccessProdi(user, kegiatan.mahasiswa?.programStudiId);
      return inScope ? null : 'Akses ditolak. Mahasiswa berada di luar lingkup prodi Anda.';
    }
    if (hasRole(user, ['dosen'])) {
      const myDsnId = await SkpiController.getDosenIdByEmail(user.email);
      if (!myDsnId || kegiatan.mahasiswa?.dosenPaId !== myDsnId) {
        return 'Hanya Dosen Pendamping (PA) mahasiswa ini yang dapat memverifikasi.';
      }
      return null;
    }
    return 'Akses ditolak.';
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

    const authError = await SkpiController.authorizeVerify(user, kegiatan);
    if (authError) {
      set.status = 403;
      return { error: authError };
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

  /**
   * Verifikasi massal (approve) — keputusan produk: checkbox + setujui
   * terpilih; penolakan massal TIDAK disediakan (catatan wajib per rekaman,
   * tetap lewat `verify` tunggal). Proses per baris dengan hasil individual:
   * satu rekaman gagal (bukan pending / di luar otorisasi) tidak membatalkan
   * baris lain — konvensi bulk repo.
   */
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async verifyBulk({ body, set, getCurrentUser }: AuthContext<{ ids: number[] }>): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (hasRole(user, ['mahasiswa', 'guest', 'calon_mahasiswa']) && !SkpiController.isStaffVerifier(user)) {
      set.status = 403;
      return { error: 'Akses ditolak. Anda tidak memiliki wewenang untuk memverifikasi rekaman kegiatan.' };
    }

    const ids = [...new Set(body.ids)];
    const approved: number[] = [];
    const failed: { id: number; error: string }[] = [];

    for (const id of ids) {
      try {
        const kegiatan = await SkpiService.getById(id);
        if (!kegiatan) {
          failed.push({ id, error: 'Rekaman kegiatan tidak ditemukan.' });
          continue;
        }
        const authError = await SkpiController.authorizeVerify(user, kegiatan);
        if (authError) {
          failed.push({ id, error: authError });
          continue;
        }
        await SkpiService.verify(id, user.id, { action: 'approve' });
        approved.push(id);
      } catch (e: unknown) {
        failed.push({ id, error: e instanceof Error ? e.message : 'Gagal memverifikasi rekaman.' });
      }
    }

    return { total: ids.length, approvedCount: approved.length, failedCount: failed.length, approved, failed };
  }

  /**
   * Membatalkan hasil verifikasi (diverifikasi/ditolak → pending). Koreksi
   * pasca-verifikasi: khusus staff-verifier dalam scope (admin global).
   */
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async unverify({ params, set, getCurrentUser }: AuthContext): Promise<any> {
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
    if (!SkpiController.isStaffVerifier(user)) {
      set.status = 403;
      return { error: 'Hanya staf Admin/Prodi/Kaprodi/Kemahasiswaan yang dapat membatalkan hasil verifikasi.' };
    }
    try {
      const inScope = await ProdiScopeService.canAccessProdi(user, kegiatan.mahasiswa?.programStudiId);
      if (!inScope) {
        set.status = 403;
        return { error: 'Akses ditolak. Mahasiswa berada di luar lingkup prodi Anda.' };
      }
      return await SkpiService.unverify(params.id);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal membatalkan hasil verifikasi.' };
    }
  }

  /**
   * Mengedit hasil verifikasi (poin & catatan) rekaman `diverifikasi` tanpa
   * mengubah status. Khusus staff-verifier dalam scope (admin global).
   */
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async editHasilVerifikasi({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
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
    if (!SkpiController.isStaffVerifier(user)) {
      set.status = 403;
      return { error: 'Hanya staf Admin/Prodi/Kaprodi/Kemahasiswaan yang dapat mengedit hasil verifikasi.' };
    }
    try {
      const inScope = await ProdiScopeService.canAccessProdi(user, kegiatan.mahasiswa?.programStudiId);
      if (!inScope) {
        set.status = 403;
        return { error: 'Akses ditolak. Mahasiswa berada di luar lingkup prodi Anda.' };
      }
      return await SkpiService.updateHasilVerifikasi(params.id, { poin: body.poin, catatan: body.catatan });
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mengedit hasil verifikasi.' };
    }
  }

  // ─── Dokumen SKPI (siap cetak + TTE) ───────────────────────────────────────

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getDokumen({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (hasRole(user, ['guest', 'calon_mahasiswa'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const mhsId = Number(params.mhsId);
    if (!Number.isInteger(mhsId) || mhsId < 1) {
      set.status = 400;
      return { error: 'ID Mahasiswa tidak valid.' };
    }

    if (hasRole(user, ['mahasiswa'])) {
      const myMhsId = await SkpiController.getMahasiswaIdByEmail(user.email);
      if (myMhsId !== mhsId) {
        set.status = 403;
        return { error: 'Akses ditolak. Anda hanya dapat melihat dokumen SKPI milik sendiri.' };
      }
    } else {
      try {
        await ProdiScopeService.assertMahasiswaInScope(user, [mhsId]);
      } catch (e: unknown) {
        set.status = 403;
        return { error: e instanceof Error ? e.message : 'Akses ditolak.' };
      }
    }

    try {
      const dokumen = await SkpiService.getDokumen(mhsId);
      const sig = await DocumentSignatureService.getByRef('SKPI', `skpi:${mhsId}`);
      return {
        ...dokumen,
        signature: sig
          ? {
              verifyUuid: sig.verifyUuid,
              verifyUrl: `${getVerifyBaseUrl()}/v/${sig.verifyUuid}`,
              docHash: sig.docHash,
              kid: sig.kid,
              signedAt: sig.signedAt.toISOString(),
              signerNama: sig.signerNama,
              signerJabatan: sig.signerJabatan,
            }
          : null,
      };
    } catch (e: unknown) {
      set.status = 404;
      return { error: e instanceof Error ? e.message : 'Gagal mengambil dokumen SKPI.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async signDokumen({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    const mhsId = Number(params.mhsId);
    if (!Number.isInteger(mhsId) || mhsId < 1) {
      set.status = 400;
      return { error: 'ID Mahasiswa tidak valid.' };
    }

    // Keputusan produk (Tahap berikut): penerbitan tanda tangan khusus
    // staff-verifier (super_admin/admin/prodi/kaprodi/kemahasiswaan, admin
    // global). Mahasiswa TIDAK menerbitkan sendiri — termasuk pemilik.
    // Penandatangan dokumen tetap di-resolve server (Kaprodi → fallback).
    if (SkpiController.isStaffVerifier(user)) {
      try {
        await ProdiScopeService.assertMahasiswaInScope(user, [mhsId]);
      } catch (e: unknown) {
        set.status = 403;
        return { error: e instanceof Error ? e.message : 'Akses ditolak.' };
      }
    } else {
      set.status = 403;
      return {
        error: 'Penerbitan tanda tangan SKPI hanya untuk staf Admin/Prodi/Kaprodi/Kemahasiswaan.',
      };
    }

    try {
      return await DocumentSignatureService.signSkpi(mhsId);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal menandatangani SKPI.' };
    }
  }

  /**
   * Daftar Penerbitan: mahasiswa dengan ≥1 rekaman kegiatan (status apa pun),
   * agregat hitung per status + syarat + status tanda tangan (batch). Khusus
   * staff-verifier dalam scope prodi.
   */
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getPenerbitan({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!SkpiController.isStaffVerifier(user)) {
      set.status = 403;
      return {
        error: 'Akses ditolak. Hanya staf Admin/Prodi/Kaprodi/Kemahasiswaan yang dapat melihat tab Penerbitan.',
      };
    }

    const allowedProdiIds = await ProdiScopeService.getUserAccessibleProdiIds(user);
    if (allowedProdiIds !== null && allowedProdiIds.length === 0) {
      return { data: [], meta: { total: 0, page: query?.page ?? 1, limit: query?.limit ?? 10, totalPages: 0 } };
    }
    if (query?.prodiId && allowedProdiIds !== null && !allowedProdiIds.includes(query.prodiId)) {
      set.status = 403;
      return { error: 'Prodi di luar lingkup akses Anda.' };
    }

    try {
      const page = await SkpiService.getPenerbitan({
        page: query?.page,
        limit: query?.limit,
        search: query?.search,
        prodiId: query?.prodiId,
        siapTerbit: query?.siapTerbit === 'true',
        allowedProdiIds,
      });

      // Status tanda tangan per baris (1 query batch, bukan N+1).
      const sigByRef = await DocumentSignatureService.getActiveByRefs(
        'SKPI',
        page.data.map((d) => `skpi:${d.mahasiswaId}`),
      );
      const data = page.data.map((d) => {
        const sig = sigByRef.get(`skpi:${d.mahasiswaId}`);
        return {
          ...d,
          signature: sig
            ? { verifyUuid: sig.verifyUuid, signedAt: sig.signedAt.toISOString(), signerNama: sig.signerNama }
            : null,
        };
      });
      return { data, meta: page.meta };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mengambil daftar penerbitan SKPI.' };
    }
  }

  /**
   * Penerbitan tanda tangan massal — preseden `signKhsBulk`: per mahasiswa
   * dengan penanganan error individual (syarat §4.4 dienforce `signSkpi`;
   * satu mahasiswa gagal tidak membatalkan sisanya). Otorisasi sama dengan
   * sign tunggal: staff-verifier + seluruh id wajib dalam scope (403 utuh).
   */
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async signDokumenBulk({ body, set, getCurrentUser }: AuthContext<{ mahasiswaIds: number[] }>): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!SkpiController.isStaffVerifier(user)) {
      set.status = 403;
      return { error: 'Penerbitan tanda tangan SKPI hanya untuk staf Admin/Prodi/Kaprodi/Kemahasiswaan.' };
    }
    try {
      await ProdiScopeService.assertMahasiswaInScope(user, body.mahasiswaIds);
    } catch (e: unknown) {
      set.status = 403;
      return { error: e instanceof Error ? e.message : 'Akses ditolak.' };
    }

    const uniqueIds = [...new Set(body.mahasiswaIds)];
    const failed: { mahasiswaId: number; error: string }[] = [];
    let signedCount = 0;
    for (const mhsId of uniqueIds) {
      try {
        // QR tidak dibutuhkan jalur massal (hanya status) — lewati pembuatannya.
        await DocumentSignatureService.signSkpi(mhsId, { withQr: false });
        signedCount++;
      } catch (e: unknown) {
        failed.push({ mahasiswaId: mhsId, error: e instanceof Error ? e.message : 'Gagal menandatangani SKPI.' });
      }
    }
    return { total: uniqueIds.length, signedCount, failedCount: failed.length, failed };
  }

  /**
   * Pencabutan tanda tangan SKPI tunggal — staff-verifier dalam scope (lebih
   * luas dari jalur TTE generik yang dibatasi admin/kaprodi; keputusan produk
   * tab Penerbitan). Alasan wajib (≥3 karakter setelah trim).
   */
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async revokeDokumen({ params, body, set, getCurrentUser }: AuthContext<{ reason: string }>): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    const mhsId = Number(params.mhsId);
    if (!Number.isInteger(mhsId) || mhsId < 1) {
      set.status = 400;
      return { error: 'ID Mahasiswa tidak valid.' };
    }
    if (!SkpiController.isStaffVerifier(user)) {
      set.status = 403;
      return { error: 'Pencabutan tanda tangan SKPI hanya untuk staf Admin/Prodi/Kaprodi/Kemahasiswaan.' };
    }
    try {
      await ProdiScopeService.assertMahasiswaInScope(user, [mhsId]);
    } catch (e: unknown) {
      set.status = 403;
      return { error: e instanceof Error ? e.message : 'Akses ditolak.' };
    }

    const reason = body.reason.trim();
    if (reason.length < 3) {
      set.status = 400;
      return { error: 'Alasan pencabutan minimal 3 karakter.' };
    }
    try {
      const sig = await DocumentSignatureService.getByRef('SKPI', `skpi:${mhsId}`);
      if (!sig) {
        set.status = 400;
        return { error: 'SKPI mahasiswa ini belum ditandatangani.' };
      }
      await DocumentSignatureService.revoke(sig.verifyUuid, user.id, reason);
      return { success: true, message: 'Tanda tangan SKPI berhasil dicabut.' };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mencabut tanda tangan SKPI.' };
    }
  }

  /**
   * Pencabutan tanda tangan SKPI massal — per baris dengan hasil individual
   * (konvensi bulk repo); mahasiswa belum ditandatangani masuk `failed`,
   * bukan membuat seluruh permintaan gagal.
   */
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async revokeDokumenBulk({ body, set, getCurrentUser }: AuthContext<BulkRevokeDokumenBody>): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!SkpiController.isStaffVerifier(user)) {
      set.status = 403;
      return { error: 'Pencabutan tanda tangan SKPI hanya untuk staf Admin/Prodi/Kaprodi/Kemahasiswaan.' };
    }
    try {
      await ProdiScopeService.assertMahasiswaInScope(user, body.mahasiswaIds);
    } catch (e: unknown) {
      set.status = 403;
      return { error: e instanceof Error ? e.message : 'Akses ditolak.' };
    }

    const reason = body.reason.trim();
    if (reason.length < 3) {
      set.status = 400;
      return { error: 'Alasan pencabutan minimal 3 karakter.' };
    }

    const uniqueIds = [...new Set(body.mahasiswaIds)];
    const failed: { mahasiswaId: number; error: string }[] = [];
    let revokedCount = 0;
    for (const mhsId of uniqueIds) {
      try {
        const sig = await DocumentSignatureService.getByRef('SKPI', `skpi:${mhsId}`);
        if (!sig) {
          failed.push({ mahasiswaId: mhsId, error: 'SKPI belum ditandatangani.' });
          continue;
        }
        // `revoke` no-op untuk baris sudah dicabut → aman di-re-run.
        await DocumentSignatureService.revoke(sig.verifyUuid, user.id, reason);
        revokedCount++;
      } catch (e: unknown) {
        failed.push({
          mahasiswaId: mhsId,
          error: e instanceof Error ? e.message : 'Gagal mencabut tanda tangan SKPI.',
        });
      }
    }
    return { total: uniqueIds.length, revokedCount, failedCount: failed.length, failed };
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
