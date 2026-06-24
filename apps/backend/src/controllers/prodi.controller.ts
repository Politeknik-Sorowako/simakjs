import { ProdiService } from '../services/prodi.service';
import { AuthContext, PaginationQuery } from '../utils/types';

export class ProdiController {
  static async getAll({ query }: AuthContext<any, PaginationQuery>) {
    const page = query?.page ? parseInt(query.page) : 1;
    const limit = query?.limit ? parseInt(query.limit) : 10;
    const search = query?.search || '';
    return await ProdiService.getAll(page, limit, search);
  }

  static async create({ body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const newProdi = await ProdiService.create(body);
    set.status = 201;
    return newProdi;
  }
}

