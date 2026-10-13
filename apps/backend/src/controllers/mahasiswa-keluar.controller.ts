import { LampiranStatusService } from '../services/lampiran-status.service';
import { MahasiswaKeluarService } from '../services/mahasiswa-keluar.service';
import { lampiranFilePath } from '../utils/lampiran-storage';
import { hasRole } from '../utils/role';
import { canViewLampiranMahasiswa } from '../utils/status-mahasiswa-access';
import { AuthContext } from '../utils/types';

export class MahasiswaKeluarController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async create({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['admin', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin atau Program Studi yang dapat menonaktifkan mahasiswa.' };
    }

    try {
      const data = await MahasiswaKeluarService.create({
        mahasiswaId: body.mahasiswaId,
        periodeId: body.periodeId,
        statusBaru: body.statusBaru,
        tanggalKeluar: body.tanggalKeluar,
        alasanKeluar: body.alasanKeluar,
        noSk: body.noSk,
        tanggalSk: body.tanggalSk,
        ipk: body.ipk,
        nomorIjazah: body.nomorIjazah,
      });
      set.status = 201;
      return data;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (hasRole(user, ['guest'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    const page = query?.page ? parseInt(query.page) : 1;
    const limit = query?.limit ? parseInt(query.limit) : 10;
    const search = query?.search || '';
    const periodeId = query?.periodeId;

    return await MahasiswaKeluarService.getAll({
      page,
      limit,
      search,
      periodeId,
    });
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getStats({ query, set, getCurrentUser }: AuthContext<any, { periodeId?: string }>): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['admin', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    return await MahasiswaKeluarService.getStats(query?.periodeId);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async update({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['admin', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin atau Program Studi yang dapat mengedit data.' };
    }
    try {
      return await MahasiswaKeluarService.update(parseInt(params.id), body);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async listLampiran({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    const rec = await MahasiswaKeluarService.getById(parseInt(params.id));
    if (!rec) {
      set.status = 404;
      return { error: 'Data tidak ditemukan.' };
    }
    if (!(await canViewLampiranMahasiswa(user, rec.mahasiswaId))) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    return await LampiranStatusService.list({ type: 'keluar', id: rec.id });
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async uploadLampiran({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['admin', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin atau Program Studi yang dapat mengunggah lampiran.' };
    }
    try {
      const rec = await MahasiswaKeluarService.getById(parseInt(params.id));
      if (!rec) {
        set.status = 404;
        return { error: 'Data tidak ditemukan.' };
      }
      const data = await LampiranStatusService.add(
        { type: 'keluar', id: rec.id },
        body.file,
        body.jenis,
        body.keterangan,
        user.id,
      );
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
    const rec = await MahasiswaKeluarService.getById(parseInt(params.id));
    if (!rec) {
      set.status = 404;
      return { error: 'Data tidak ditemukan.' };
    }
    if (!(await canViewLampiranMahasiswa(user, rec.mahasiswaId))) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const row = await LampiranStatusService.getOne({ type: 'keluar', id: rec.id }, parseInt(params.lampiranId));
    const path = row ? lampiranFilePath(row.storageKey) : null;
    const file = path ? Bun.file(path) : null;
    if (!row || !file || !(await file.exists())) {
      set.status = 404;
      return { error: 'Lampiran tidak ditemukan.' };
    }
    set.headers['Content-Type'] = row.fileType;
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
    if (!hasRole(user, ['admin', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin atau Program Studi yang dapat menghapus lampiran.' };
    }
    try {
      await LampiranStatusService.remove({ type: 'keluar', id: parseInt(params.id) }, parseInt(params.lampiranId));
      return { message: 'Lampiran berhasil dihapus.' };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal menghapus lampiran' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async delete({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['admin', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin atau Program Studi yang dapat membatalkan status keluar.' };
    }

    try {
      const data = await MahasiswaKeluarService.delete(parseInt(params.id));
      return { message: 'Status keluar berhasil dibatalkan dan status mahasiswa kembali aktif.', data };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }
}
