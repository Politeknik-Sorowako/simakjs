import { MahasiswaService } from '../services/mahasiswa.service';
import { AuthContext, PaginationQuery } from '../utils/types';

export class MahasiswaController {
  static async getAll({ query }: AuthContext<any, PaginationQuery>) {
    const page = query?.page ? parseInt(query.page) : 1;
    const limit = query?.limit ? parseInt(query.limit) : 10;
    const search = query?.search || '';
    return await MahasiswaService.getAll(page, limit, search);
  }

  static async create({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const newMhs = await MahasiswaService.create(body);
    set.status = 201;
    return newMhs;
  }
}

