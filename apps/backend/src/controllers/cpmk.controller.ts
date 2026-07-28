import { CpmkService } from '../services/cpmk.service';
import { isAdminOrProdiOrDosen } from '../utils/role';
import { AuthContext } from '../utils/types';

export class CpmkController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll({ query }: AuthContext): Promise<any> {
    const page = query.page ? parseInt(query.page) : 1;
    const limit = query.limit ? parseInt(query.limit) : 10;
    const search = query.search || '';
    const kurikulumId = query.kurikulumId ? parseInt(query.kurikulumId) : undefined;
    const mataKuliahId = query.mataKuliahId ? parseInt(query.mataKuliahId) : undefined;
    return await CpmkService.getAll(page, limit, search, kurikulumId, mataKuliahId);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getByMataKuliah({ params }: AuthContext): Promise<any> {
    return await CpmkService.getByMataKuliah(parseInt(params.mataKuliahId));
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getById({ params, set }: AuthContext): Promise<any> {
    const data = await CpmkService.getById(parseInt(params.id));
    if (!data) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return data;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async create({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!isAdminOrProdiOrDosen(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const newCpmk = await CpmkService.create(body);
      set.status = 201;
      return newCpmk;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async update({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!isAdminOrProdiOrDosen(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const updated = await CpmkService.update(parseInt(params.id), body);
      if (!updated) {
        set.status = 404;
        return { error: 'Data tidak ditemukan' };
      }
      return updated;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async delete({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const deleted = await CpmkService.delete(parseInt(params.id));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'CPMK berhasil dihapus' };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async import({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!isAdminOrProdiOrDosen(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const { items } = body as {
      items: { kodeMataKuliah?: string; kode: string; deskripsi: string }[];
    };
    if (!items || !Array.isArray(items) || items.length === 0) {
      set.status = 400;
      return { error: 'Data harus diisi' };
    }
    const result = await CpmkService.import(items);
    set.status = 200;
    return result;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getTemplate({ set, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    set.headers['content-type'] = 'text/csv; charset=utf-8';
    set.headers['content-disposition'] = 'attachment; filename=template-cpmk.csv';
    return CpmkService.getTemplateCsv();
  }
}
