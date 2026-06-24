import { ProdiService } from '../services/prodi.service';

export class ProdiController {
  static async getAll() {
    return await ProdiService.getAll();
  }

  static async create({ body, set, getCurrentUser }: any) {
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
