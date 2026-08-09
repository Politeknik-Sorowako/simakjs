import { eq } from 'drizzle-orm';
import { mahasiswa } from '../models/schema';
import { CsvImportService } from '../services/csv-import.service';
import { KrsService } from '../services/krs.service';
import { db } from '../utils/db';
import { hasRole } from '../utils/role';
import { AuthContext, PaginationQuery } from '../utils/types';

type KrsQuery = PaginationQuery & { kelasKuliahId?: number };

export class KrsController {
  private static async getMahasiswaIdByEmail(email: string): Promise<number | null> {
    const [mhs] = await db.select({ id: mahasiswa.id }).from(mahasiswa).where(eq(mahasiswa.email, email));
    return mhs ? mhs.id : null;
  }

  private static async getDosenIdByEmail(email: string): Promise<number | null> {
    const { dosen } = await import('../models/schema');
    const [dsn] = await db.select({ id: dosen.id }).from(dosen).where(eq(dosen.email, email)).limit(1);
    return dsn ? dsn.id : null;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll({ query, set, getCurrentUser }: AuthContext<any, KrsQuery>): Promise<any> {
    const user = await getCurrentUser();
    if (!user || hasRole(user, ['guest'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Guest tidak diizinkan mengakses data KRS.' };
    }
    const page = query?.page ? parseInt(String(query.page)) : 1;
    const limit = query?.limit ? parseInt(String(query.limit)) : 10;
    const search = query?.search || '';
    const kelasKuliahId = query?.kelasKuliahId ? parseInt(String(query.kelasKuliahId)) : undefined;

    let filterMhsId: number | undefined = undefined;
    let dosenPaId: number | undefined = undefined;

    if (hasRole(user, ['mahasiswa'])) {
      const myMhsId = await KrsController.getMahasiswaIdByEmail(user.email);
      if (!myMhsId) {
        return {
          data: [],
          meta: { total: 0, page, limit, totalPages: 0 },
        };
      }
      filterMhsId = myMhsId;
    } else if (hasRole(user, ['dosen'])) {
      const dsnId = await KrsController.getDosenIdByEmail(user.email);
      if (dsnId) {
        dosenPaId = dsnId;
      }
    }

    return await KrsService.getAll(page, limit, search, filterMhsId, dosenPaId, kelasKuliahId);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getById({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || hasRole(user, ['guest'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Guest tidak diizinkan mengakses data KRS.' };
    }
    const data = await KrsService.getById(parseInt(params.id));
    if (!data) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    if (hasRole(user, ['mahasiswa'])) {
      const myMhsId = await KrsController.getMahasiswaIdByEmail(user.email);
      if (!myMhsId || myMhsId !== data.mahasiswaId) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
    }
    return data;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async create({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 403;
      return { error: 'Akses ditolak. Silakan login.' };
    }
    if (hasRole(user, ['mahasiswa'])) {
      const myMhsId = await KrsController.getMahasiswaIdByEmail(user.email);
      if (!myMhsId || myMhsId !== body.mahasiswaId) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }
    }
    try {
      const newKrs = await KrsService.create(body);
      set.status = 201;
      return newKrs;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async bulkCreate({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || hasRole(user, ['guest']) || hasRole(user, ['mahasiswa'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Pengisian KRS massal hanya untuk Admin/Dosen/Prodi.' };
    }
    try {
      const { mahasiswaIds, kelasKuliahIds, isApproved } = body;
      return await KrsService.bulkCreate(mahasiswaIds, kelasKuliahIds, isApproved ?? false);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getStats({ query, set, getCurrentUser }: AuthContext<any, { periodeId?: string }>): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    return await KrsService.getStats(query?.periodeId);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async approve({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['dosen', 'admin', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Dosen Pembimbing Akademik, Prodi, atau Admin yang dapat menyetujui KRS.' };
    }
    try {
      const updated = await KrsService.approveKrs(body.mahasiswaId, body.periodeId, user.email);
      return { message: 'KRS berhasil disetujui', count: updated.length, data: updated };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async update({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 403;
      return { error: 'Akses ditolak. Silakan login.' };
    }
    if (!hasRole(user, ['admin', 'dosen', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin, Dosen, atau Prodi yang dapat mengubah KRS.' };
    }
    const updated = await KrsService.update(parseInt(params.id), body);
    if (!updated) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return updated;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async delete({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 403;
      return { error: 'Akses ditolak. Silakan login.' };
    }
    const deleted = await KrsService.delete(parseInt(params.id));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'KRS berhasil dihapus' };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getPendingStudents({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['dosen', 'admin', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const periodeId = query?.periodeId;
    if (!periodeId) {
      set.status = 400;
      return { error: 'periodeId wajib disertakan.' };
    }
    try {
      let dosenPaId: number | undefined = undefined;
      if (hasRole(user, ['dosen'])) {
        const dsnId = await KrsController.getDosenIdByEmail(user.email);
        if (dsnId) dosenPaId = dsnId;
      }
      return await KrsService.getPendingStudents(periodeId, dosenPaId);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async approveBatch({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['dosen', 'admin', 'prodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const updated = await KrsService.approveBatchKrs(body.mahasiswaIds, body.periodeId, user.email);
      return { message: 'KRS mahasiswa terpilih berhasil disetujui', count: updated.length, data: updated };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getRencanaStudi({ query, set }: AuthContext): Promise<any> {
    const mahasiswaId = query?.mahasiswaId ? parseInt(query.mahasiswaId) : undefined;
    if (!mahasiswaId) {
      set.status = 400;
      return { error: 'mahasiswaId harus dikirim' };
    }
    const data = await KrsService.getRencanaStudi(mahasiswaId);
    if (!data) {
      set.status = 404;
      return { error: 'Tidak ada rencana studi untuk mahasiswa ini (pastikan angkatan sudah di-binding ke kurikulum)' };
    }
    return data;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async validasiKrs({ query, set }: AuthContext): Promise<any> {
    const mahasiswaId = query?.mahasiswaId ? parseInt(query.mahasiswaId) : undefined;
    const periodeId = query?.periodeId;
    if (!mahasiswaId || !periodeId) {
      set.status = 400;
      return { error: 'mahasiswaId dan periodeId harus dikirim' };
    }
    const data = await KrsService.validasiKrs(mahasiswaId, periodeId);
    if (!data) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return data;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async importCsv({ request, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      set.status = 400;
      return { error: 'File CSV tidak ditemukan.' };
    }

    const text = await file.text();
    const result = await CsvImportService.importKrs(text);
    return result;
  }
}
