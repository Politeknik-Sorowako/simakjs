import { basename, join } from 'node:path';
import { CsvImportService } from '../services/csv-import.service';
import { getSuratUploadDir, PresensiService } from '../services/presensi.service';
import { ProdiScopeService } from '../services/prodi-scope.service';
import { getBapKelasId, guardKelasScope } from '../utils/dosen-scope';
import { hasRole } from '../utils/role';
import { AuthContext } from '../utils/types';

export class PresensiController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async saveBulk({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'dosen', 'prodi', 'instruktur'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const bapKelasId = await getBapKelasId(Number(body.bapId));
    if (bapKelasId) {
      const scopeError = await guardKelasScope(user, bapKelasId);
      if (scopeError) {
        set.status = 403;
        return { error: scopeError };
      }
    }
    // Dosen/instruktur only may set hadir, telat( +durasi) or unknown; admin & prodi may validate unknown into sakit/izin/alpa.
    if (!hasRole(user, ['admin', 'super_admin', 'prodi'])) {
      const allowedStatuses = new Set(['hadir', 'telat', 'unknown']);
      const restricted = (body.presensiList || []).filter((p: { status: string }) => !allowedStatuses.has(p.status));
      if (restricted.length > 0) {
        set.status = 400;
        return { error: 'Dosen hanya dapat menetapkan status Hadir, Telat, atau Unknown untuk presensi.' };
      }
    }
    return await PresensiService.saveBulkPresensi(body.bapId, body.presensiList, user.id);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getByBap({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Akses ditolak. Silakan login.' };
    }
    const bapKelasId = await getBapKelasId(parseInt(params.bapId));
    if (bapKelasId) {
      const scopeError = await guardKelasScope(user, bapKelasId);
      if (scopeError) {
        set.status = 403;
        return { error: scopeError };
      }
    }
    return await PresensiService.getPresensiByBap(parseInt(params.bapId));
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getLaporanKompensasi({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user || !hasRole(user, ['admin', 'dosen'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      const page = query?.page ? parseInt(query.page) : 1;
      const limit = query?.limit ? parseInt(query.limit) : 20;
      const search = query?.search;
      const prodiId = query?.prodiId ? parseInt(query.prodiId) : undefined;
      const sortBy = query?.sortBy || 'sisa';
      const sortOrder = query?.sortOrder || 'desc';
      const statusLunas = query?.statusLunas;
      const exportAll = query?.exportAll === 'true';
      return await PresensiService.getLaporanKompensasi(
        page,
        limit,
        search,
        prodiId,
        sortBy,
        sortOrder,
        statusLunas,
        exportAll,
      );
    } catch (e: unknown) {
      console.error('[PresensiController.getLaporanKompensasi]', {
        error: e instanceof Error ? e.message : e,
      });
      set.status = 500;
      return { error: 'Gagal memuat laporan kompensasi. Silakan coba lagi.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getLaporanKompensasiStats({ set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'dosen'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    return await PresensiService.getLaporanKompensasiStats();
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getKompensasiDetail({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }
    const targetMhsId = parseInt(params.mahasiswaId);
    const detail = await PresensiService.getKompensasiDetail(targetMhsId);
    if (hasRole(user, ['mahasiswa']) && detail.mahasiswa.email !== user.email) {
      set.status = 403;
      return { error: 'Akses ditolak. Anda hanya dapat melihat data Anda sendiri.' };
    }
    if (hasRole(user, ['mahasiswa']) && detail?.summary) {
      detail.summary.sisaKompensasi = Math.max(0, detail.summary.sisaKompensasi);
    }
    return detail;
  }

  static async getRekapKehadiran({
    query,
    set,
    getCurrentUser,
    // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  }: AuthContext<any, { kelasKuliahId?: string }>): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'dosen', 'instruktur'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const kelasKuliahId = query?.kelasKuliahId ? parseInt(query.kelasKuliahId) : undefined;
    if (!kelasKuliahId) {
      set.status = 400;
      return { error: 'Parameter kelasKuliahId diperlukan.' };
    }
    const scopeError = await guardKelasScope(user, kelasKuliahId);
    if (scopeError) {
      set.status = 403;
      return { error: scopeError };
    }
    return await PresensiService.getRekapKehadiran(kelasKuliahId);
  }

  static async getRekapKehadiranMahasiswa({
    query,
    set,
    getCurrentUser,
    // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  }: AuthContext<any, { mahasiswaId?: string; periodeId?: string }>): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }
    const mahasiswaId = query?.mahasiswaId ? parseInt(query.mahasiswaId) : undefined;
    if (!mahasiswaId) {
      set.status = 400;
      return { error: 'Parameter mahasiswaId diperlukan.' };
    }
    return await PresensiService.getRekapKehadiranMahasiswa(mahasiswaId, query?.periodeId);
  }

  static async getRekapKelasList({
    query,
    set,
    getCurrentUser,
    // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  }: AuthContext<any, { periodeId?: string; prodiId?: string; search?: string }>): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'dosen', 'prodi', 'instruktur', 'super_admin'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const prodiId = query?.prodiId ? parseInt(query.prodiId) : undefined;
    return await PresensiService.getRekapKelasList(query?.periodeId, prodiId, query?.search);
  }

  static async getRekapMahasiswaList({
    query,
    set,
    getCurrentUser,
    // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  }: AuthContext<any, { periodeId?: string; prodiId?: string; search?: string }>): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'dosen', 'prodi', 'instruktur', 'super_admin'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const prodiId = query?.prodiId ? parseInt(query.prodiId) : undefined;
    return await PresensiService.getRekapMahasiswaList(query?.periodeId, prodiId, query?.search);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async bayarKompensasi({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const payload = {
      ...body,
      petugasId: user.id,
    };
    const newPayment = await PresensiService.bayarKompensasi(payload);
    set.status = 201;
    return newPayment;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async updateKompensasiBayar({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    try {
      const id = parseInt(params.id);
      const updated = await PresensiService.updateKompensasiBayar(id, body);
      if (!updated) {
        set.status = 404;
        return { error: 'Data penyelesaian kompensasi tidak ditemukan.' };
      }
      return updated;
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async importKompensasiBayar({ request, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'prodi', 'keuangan'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin/Admin Prodi/Keuangan.' };
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mode = (formData.get('mode') as string) || 'skip';
    if (!file) {
      set.status = 400;
      return { error: 'File CSV tidak ditemukan.' };
    }

    const text = await file.text();
    return await CsvImportService.importKompensasiBayar(text, mode, user.id);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getUnknownPresensi({ query, set, getCurrentUser }: AuthContext): Promise<any> {
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
    return await PresensiService.getUnknownPresensi(page, limit, search, prodiIds, statusFilter);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async resolveUnknown({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'super_admin', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin/Admin Prodi.' };
    }
    try {
      const id = parseInt(params.id);
      const updated = await PresensiService.resolveUnknownPresensi(
        id,
        body.newStatus,
        user.id,
        body.keteranganAdmin,
        body.lampiranEvidens,
        body.isAnulir,
      );
      if (!updated) {
        set.status = 404;
        return { error: 'Data presensi tidak ditemukan.' };
      }
      return updated;
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async uploadSuratIzin({ request, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      const mhs = await PresensiService.getMahasiswaByEmail(user.email);
      if (!mhs) {
        set.status = 403;
        return { error: 'Profil mahasiswa tidak ditemukan. Hubungi admin.' };
      }

      const formData = await request.formData();
      const presensiId = Number(formData.get('presensiId'));
      const jenis = (formData.get('jenis') as string) || '';
      const keterangan = (formData.get('keterangan') as string) || undefined;
      const file = formData.get('file') as File | null;

      if (!presensiId || !file) {
        set.status = 400;
        return { error: 'presensiId dan file wajib diisi.' };
      }
      if (jenis !== 'sakit' && jenis !== 'izin') {
        set.status = 400;
        return { error: 'Jenis surat harus sakit atau izin.' };
      }

      const updated = await PresensiService.uploadSuratIzin({
        presensiId,
        mahasiswaId: mhs.id,
        jenis,
        keterangan,
        file,
      });
      if (!updated) {
        set.status = 404;
        return { error: 'Data presensi tidak ditemukan.' };
      }
      return {
        message: 'Surat berhasil diunggah dan menunggu verifikasi admin',
        presensiId: updated.id,
        lampiranEvidens: updated.lampiranEvidens,
      };
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getMahasiswaPresensiList({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      const periodeId = query?.periodeId || undefined;

      if (hasRole(user, ['mahasiswa'])) {
        const mhs = await PresensiService.getMahasiswaByEmail(user.email);
        if (!mhs) {
          set.status = 403;
          return { error: 'Profil mahasiswa tidak ditemukan. Hubungi admin.' };
        }
        return await PresensiService.getMahasiswaPresensiList(mhs.id, periodeId);
      }

      if (!hasRole(user, ['admin', 'super_admin', 'prodi', 'dosen', 'instruktur'])) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      const mahasiswaId = query?.mahasiswaId ? parseInt(query.mahasiswaId) : undefined;
      if (!mahasiswaId) {
        set.status = 400;
        return { error: 'Parameter mahasiswaId diperlukan untuk akses non-mahasiswa.' };
      }
      return await PresensiService.getMahasiswaPresensiList(mahasiswaId, periodeId);
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal memuat riwayat presensi' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getLampiranBerkas({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      const raw = String(params.filename || '');
      const filename = basename(raw);
      if (filename !== raw || !filename.startsWith('surat_')) {
        set.status = 404;
        return { error: 'Berkas tidak ditemukan' };
      }
      const allowed = await PresensiService.canAccessLampiran(user, filename);
      if (!allowed) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
      const file = Bun.file(join(getSuratUploadDir(), filename));
      if (!(await file.exists())) {
        set.status = 404;
        return { error: 'Berkas tidak ditemukan' };
      }
      set.headers['Content-Type'] = file.type || 'application/octet-stream';
      set.headers['Content-Disposition'] = `inline; filename="${filename}"`;
      return file;
    } catch (err: unknown) {
      set.status = 404;
      return { error: err instanceof Error ? err.message : 'Berkas tidak ditemukan' };
    }
  }
}
