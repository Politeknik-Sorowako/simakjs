import { CsvImportService } from '../services/csv-import.service';
import { MataKuliahService } from '../services/mata-kuliah.service';
import { AuthContext, PaginationQuery } from '../utils/types';

export class MataKuliahController {
  static async getAll({
    query,
  }: AuthContext<
    any,
    PaginationQuery & { kurikulumId?: number; semester?: number; sortBy?: string; sortOrder?: string }
  >): Promise<any> {
    const page = query?.page ? parseInt(String(query.page)) : 1;
    const limit = query?.limit ? parseInt(String(query.limit)) : 10;
    const search = query?.search || '';
    const kurikulumId = query?.kurikulumId ? Number(query.kurikulumId) : undefined;
    const semester = query?.semester !== undefined ? Number(query.semester) : undefined;
    const sortBy = query?.sortBy || 'nama';
    const sortOrder = (query?.sortOrder as 'asc' | 'desc') || 'asc';
    return await MataKuliahService.getAll(page, limit, search, kurikulumId, semester, sortBy, sortOrder);
  }

  static async getById({ params, set }: AuthContext): Promise<any> {
    const data = await MataKuliahService.getById(parseInt(params.id));
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
    const newMk = await MataKuliahService.create(body);
    set.status = 201;
    return newMk;
  }

  static async update({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const updated = await MataKuliahService.update(parseInt(params.id), body);
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
    const deleted = await MataKuliahService.delete(parseInt(params.id));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'Mata Kuliah berhasil dihapus' };
  }

  static async importCsv({ request, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mode = (formData.get('mode') as string) || 'skip';
    if (!file) {
      set.status = 400;
      return { error: 'File CSV tidak ditemukan.' };
    }

    const text = await file.text();
    const result = await CsvImportService.importMataKuliah(text, mode);
    return result;
  }
}
