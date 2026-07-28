import { KurikulumService } from '../services/kurikulum.service';
import { AuthContext, PaginationQuery } from '../utils/types';

export interface KurikulumQuery extends PaginationQuery {
  prodiId?: number;
}

export class KurikulumController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll({ query }: AuthContext<any, KurikulumQuery>): Promise<any> {
    const page = query?.page ? parseInt(String(query.page)) : 1;
    const limit = query?.limit ? parseInt(String(query.limit)) : 10;
    const search = query?.search || '';
    const prodiId = query?.prodiId ? Number(query.prodiId) : undefined;
    return await KurikulumService.getAll(page, limit, search, prodiId);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getById({ params, set }: AuthContext): Promise<any> {
    const data = await KurikulumService.getById(parseInt(params.id));
    if (!data) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return data;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async create({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const newKur = await KurikulumService.create(body);
    set.status = 201;
    return newKur;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async update({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const updated = await KurikulumService.update(parseInt(params.id), body);
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
    const deleted = await KurikulumService.delete(parseInt(params.id));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'Kurikulum berhasil dihapus' };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async addMataKuliah({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    try {
      const newKmk = await KurikulumService.addMataKuliah(parseInt(params.id), body);
      set.status = 201;
      return newKmk;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async copyFromKurikulum({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    try {
      const result = await KurikulumService.copyFromKurikulum(parseInt(params.id), body.sourceKurikulumId);
      return result;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async downloadImportMkTemplate({ set }: AuthContext): Promise<any> {
    const csv = `kode_mata_kuliah,semester,sks,is_wajib
TI-001,1,3,true
TI-002,1,2,true
TI-003,2,3,false
MK-001,3,2,true`;
    set.headers['Content-Type'] = 'text/csv';
    set.headers['Content-Disposition'] = 'attachment; filename="template-impor-mk-kurikulum.csv"';
    return csv;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async importMkCsv({ params, request, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (!file) {
        set.status = 400;
        return { error: 'File CSV tidak ditemukan.' };
      }
      const text = await file.text();
      const result = await KurikulumService.importMkCsv(parseInt(params.id), text);
      return result;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async duplicate({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    try {
      const newKur = await KurikulumService.duplicate(parseInt(params.id), body.kodeBaru, body.namaBaru);
      set.status = 201;
      return newKur;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async removeMataKuliah({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const deleted = await KurikulumService.removeMataKuliah(parseInt(params.id), parseInt(params.mkId));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'Mata Kuliah berhasil dihapus dari Kurikulum' };
  }
}
