import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { CsvImportService } from '../services/csv-import.service';
import { ProdiService } from '../services/prodi.service';
import { hasRole } from '../utils/role';
import { AuthContext, PaginationQuery } from '../utils/types';

export class ProdiController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll({ query }: AuthContext<any, PaginationQuery>): Promise<any> {
    const page = query?.page ? parseInt(String(query.page)) : 1;
    const limit = query?.limit ? parseInt(String(query.limit)) : 10;
    const search = query?.search || '';
    return await ProdiService.getAll(page, limit, search);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getById({ params, set }: AuthContext): Promise<any> {
    const prodi = await ProdiService.getById(parseInt(params.id));
    if (!prodi) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return prodi;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async create({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const newProdi = await ProdiService.create(body);
    set.status = 201;
    return newProdi;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async update({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }
    const updated = await ProdiService.update(parseInt(params.id), body);
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
    const deleted = await ProdiService.delete(parseInt(params.id));
    if (!deleted) {
      set.status = 404;
      return { error: 'Data tidak ditemukan' };
    }
    return { message: 'Program Studi berhasil dihapus' };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async importCsv({ request, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin'])) {
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
    const result = await CsvImportService.importProgramStudi(text, mode);
    return result;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async uploadSk({ request, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || !hasRole(user, ['admin'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin.' };
    }

    try {
      const formData = await request.formData();
      const file = formData.get('file');
      if (!(file instanceof File) || file.size === 0) {
        set.status = 400;
        return { error: 'File SK tidak ditemukan.' };
      }

      const jenisRaw = String(formData.get('jenis') || 'izin').toLowerCase();
      const jenis = jenisRaw === 'akreditasi' ? 'akreditasi' : 'izin';

      const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
      const ext = extname(file.name).toLowerCase() || '.pdf';
      if (!allowed.includes(ext)) {
        set.status = 400;
        return { error: 'Format file harus PDF atau gambar (jpg, jpeg, png, webp).' };
      }

      const MAX_SK_MB = 10;
      if (file.size > MAX_SK_MB * 1024 * 1024) {
        set.status = 400;
        return { error: `Ukuran file maksimal ${MAX_SK_MB} MB.` };
      }

      const storageDir = join(process.cwd(), 'storage', 'sk-prodi');
      await mkdir(storageDir, { recursive: true });

      const base = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .slice(0, 60);
      const safeFilename = `${jenis}-${Date.now()}-${base}${ext}`;
      const filePath = join(storageDir, safeFilename);

      const buffer = new Uint8Array(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      return {
        url: `/storage/sk-prodi/${safeFilename}`,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
      };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mengunggah file SK.' };
    }
  }
}
