import { KelasKuliahService } from '../services/kelas-kuliah.service';
import { getDosenAllowedKelasIds, getDosenIdByEmail } from '../utils/dosen-scope';
import { hasRole } from '../utils/role';
import { AuthContext, PaginationQuery } from '../utils/types';

type KelasKuliahQuery = PaginationQuery & { periodeId?: string; dosenId?: string };

export class KelasKuliahController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll({ query, getCurrentUser }: AuthContext<any, KelasKuliahQuery>): Promise<any> {
    const page = query?.page ? parseInt(String(query.page)) : 1;
    const limit = query?.limit ? parseInt(String(query.limit)) : 10;
    const search = query?.search || '';
    const periodeId = query?.periodeId || undefined;
    let dosenId = query?.dosenId ? parseInt(query.dosenId) : undefined;

    if (getCurrentUser) {
      const user = await getCurrentUser();
      if (user && hasRole(user, ['dosen', 'instruktur'])) {
        const userDosenId = await getDosenIdByEmail(user.email);
        if (!userDosenId) {
          return {
            data: [],
            meta: {
              total: 0,
              page,
              limit,
              totalPages: 0,
            },
          };
        }
        dosenId = userDosenId;
      }
    }

    return await KelasKuliahService.getAll(page, limit, search, periodeId, dosenId);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async myClasses({ query, set, getCurrentUser }: AuthContext<any, KelasKuliahQuery>): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Tidak terautentikasi' };
    }
    if (!hasRole(user, ['dosen', 'instruktur'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Dosen/Instruktur.' };
    }

    const page = query?.page ? parseInt(String(query.page)) : 1;
    const limit = query?.limit ? parseInt(String(query.limit)) : 10;
    const search = query?.search || '';
    const periodeId = query?.periodeId || undefined;

    const dosenId = await getDosenIdByEmail(user.email);
    if (!dosenId) {
      set.status = 404;
      return { error: 'Profil dosen tidak ditemukan. Hubungi admin untuk menautkan akun dengan data dosen.' };
    }

    return await KelasKuliahService.getAll(page, limit, search, periodeId, dosenId);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getByMk({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    const mkId = query?.mataKuliahId ? parseInt(query.mataKuliahId) : undefined;
    const periodeId = query?.periodeId;
    if (!mkId || !periodeId) {
      set.status = 400;
      return { error: 'mataKuliahId dan periodeId harus dikirim' };
    }
    const user = await getCurrentUser();
    if (user && hasRole(user, ['dosen', 'instruktur'])) {
      const dosenId = await getDosenIdByEmail(user.email);
      if (!dosenId) {
        set.status = 404;
        return { error: 'Profil dosen tidak ditemukan. Hubungi admin untuk menautkan akun dengan data dosen.' };
      }
      const allowed = await getDosenAllowedKelasIds(dosenId);
      const kelasList = await KelasKuliahService.getByMk(mkId, periodeId);
      return kelasList.filter((k) => allowed.includes(k.id));
    }
    return await KelasKuliahService.getByMk(mkId, periodeId);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getById({ params, set }: AuthContext): Promise<any> {
    const data = await KelasKuliahService.getById(parseInt(params.id));
    if (!data) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return data;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async create({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const newKelas = await KelasKuliahService.create(body);
    set.status = 201;
    return newKelas;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async update({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin'])) {
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

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async delete({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin'])) {
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

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async import({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const { items } = body as {
      items: {
        kodeProdi?: string;
        kodeMataKuliah?: string;
        periodeId: string;
        namaKelas: string;
        nipDosen?: string;
        sksBebanMengajar?: number | string;
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

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getTemplate({ set, getCurrentUser }: AuthContext): Promise<any> {
    await getCurrentUser();
    set.headers['content-type'] = 'text/csv; charset=utf-8';
    set.headers['content-disposition'] = 'attachment; filename=template-kelas-kuliah.csv';
    return KelasKuliahService.getTemplateCsv();
  }
}
