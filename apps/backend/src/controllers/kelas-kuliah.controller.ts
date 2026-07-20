import { KelasKuliahService } from '../services/kelas-kuliah.service';
import { AuthContext, PaginationQuery } from '../utils/types';

export class KelasKuliahController {
  static async getAll({ query }: AuthContext<any, PaginationQuery & { periodeId?: string }>): Promise<any> {
    const page = query?.page ? parseInt(String(query.page)) : 1;
    const limit = query?.limit ? parseInt(String(query.limit)) : 10;
    const search = query?.search || '';
    const periodeId = query?.periodeId || undefined;
    return await KelasKuliahService.getAll(page, limit, search, periodeId);
  }

  static async getByMk({ query, set }: AuthContext): Promise<any> {
    const mkId = query?.mataKuliahId ? parseInt(query.mataKuliahId) : undefined;
    const periodeId = query?.periodeId;
    if (!mkId || !periodeId) {
      set.status = 400;
      return { error: 'mataKuliahId dan periodeId harus dikirim' };
    }
    return await KelasKuliahService.getByMk(mkId, periodeId);
  }

  static async getById({ params, set }: AuthContext): Promise<any> {
    const data = await KelasKuliahService.getById(parseInt(params.id));
    if (!data) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return data;
  }

  static async create({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const newKelas = await KelasKuliahService.create(body);
    set.status = 201;
    return newKelas;
  }

  static async update({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const updated = await KelasKuliahService.update(parseInt(params.id), body);
    if (!updated) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return updated;
  }

  static async delete({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const deleted = await KelasKuliahService.delete(parseInt(params.id));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'Kelas Kuliah berhasil dihapus' };
  }

  static async import({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const { items } = body as {
      items: {
        kodeMataKuliah?: string;
        periodeId: string;
        namaKelas: string;
        nipDosen?: string;
        sksBebanMengajar?: number;
        idPddikti?: string;
      }[];
    };
    if (!items || !Array.isArray(items) || items.length === 0) {
      set.status = 400;
      return { error: 'Data harus diisi' };
    }
    const result = await KelasKuliahService.import(items);
    set.status = 200;
    return result;
  }

  static async getTemplate({ set, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    set.headers['content-type'] = 'text/csv; charset=utf-8';
    set.headers['content-disposition'] = 'attachment; filename=template-kelas-kuliah.csv';
    return KelasKuliahService.getTemplateCsv();
  }
}
