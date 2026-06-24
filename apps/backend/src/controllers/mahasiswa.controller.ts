import { MahasiswaService } from '../services/mahasiswa.service';

export class MahasiswaController {
  static async getAll() {
    return await MahasiswaService.getAll();
  }

  static async create({ body, set, getCurrentUser }: any) {
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
