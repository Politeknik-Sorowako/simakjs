import { VisiMisiService } from '../services/visi-misi.service';
import { isAdminOrProdi } from '../utils/role';
import { AuthContext } from '../utils/types';

export class VisiMisiController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll({ query, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const prodiId = query.prodiId ? parseInt(query.prodiId) : undefined;
    return await VisiMisiService.getAll(prodiId);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAktif({ query, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const prodiId = parseInt(query.prodiId);
    const data = await VisiMisiService.getAktif(prodiId);
    if (!data) {
      return { error: 'Visi Misi aktif tidak ditemukan' };
    }
    return data;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getById({ params, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    const data = await VisiMisiService.getById(parseInt(params.id));
    if (!data) {
      return { error: 'Data tidak ditemukan' };
    }
    return data;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async create({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!isAdminOrProdi(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const newData = await VisiMisiService.create(body);
    set.status = 201;
    return newData;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async update({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!isAdminOrProdi(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const updated = await VisiMisiService.update(parseInt(params.id), body);
    if (!updated) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return updated;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async delete({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const deleted = await VisiMisiService.delete(parseInt(params.id));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'Visi Misi berhasil dihapus' };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async setAktif({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!isAdminOrProdi(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const updated = await VisiMisiService.setAktif(parseInt(params.id));
    if (!updated) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return updated;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async import({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!isAdminOrProdi(user)) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const { programStudiId, items } = body as {
      programStudiId?: number;
      items: {
        kodeProdi?: string;
        tahunBerlaku: string;
        visi: string;
        misi: string;
        tujuan?: string;
        sasaran?: string;
      }[];
    };
    if (!items || !Array.isArray(items) || items.length === 0) {
      set.status = 400;
      return { error: 'Data harus diisi' };
    }
    const result = await VisiMisiService.import(programStudiId, items);
    set.status = 200;
    return result;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getTemplate({ set, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    set.headers['content-type'] = 'text/csv; charset=utf-8';
    set.headers['content-disposition'] = 'attachment; filename=template-visi-misi.csv';
    return VisiMisiService.getTemplateCsv();
  }
}
