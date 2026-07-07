import { AngkatanKurikulumService } from '../services/angkatan-kurikulum.service';
import { AuthContext } from '../utils/types';

export interface AngkatanKurikulumQuery {
  programStudiId?: string;
}

export class AngkatanKurikulumController {
  static async getAll({ query }: AuthContext<any, AngkatanKurikulumQuery>) {
    const prodiId = query?.programStudiId ? parseInt(query.programStudiId) : undefined;
    return await AngkatanKurikulumService.getAll(prodiId);
  }

  static async getAktif({ query, set }: AuthContext<any, { programStudiId?: string; angkatan?: string }>) {
    if (!query?.programStudiId || !query?.angkatan) {
      set.status = 400;
      return { error: 'Parameter programStudiId dan angkatan diperlukan' };
    }
    const data = await AngkatanKurikulumService.getAktif(parseInt(query.programStudiId), query.angkatan);
    if (!data) {
      set.status = 404;
      return { error: 'Tidak ada kurikulum aktif untuk angkatan ini' };
    }
    return data;
  }

  static async create({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const newBinding = await AngkatanKurikulumService.create(body);
    set.status = 201;
    return newBinding;
  }

  static async update({ params, body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const updated = await AngkatanKurikulumService.update(parseInt(params.id), body);
    if (!updated) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return updated;
  }

  static async delete({ params, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const deleted = await AngkatanKurikulumService.delete(parseInt(params.id));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'Binding Angkatan Kurikulum berhasil dihapus' };
  }
}
