import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { PengumumanService } from '../services/pengumuman.service';
import { AuthContext } from '../utils/types';

export class PengumumanController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getTargetOptions({ set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu' };
      }

      return await PengumumanService.getTargetOptions(user);
    } catch (err: unknown) {
      set.status = 500;
      return { error: err instanceof Error ? err.message : 'Gagal mengambil opsi target' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getFeed({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu' };
      }

      return await PengumumanService.getFeed(user, {
        search: query.search as string | undefined,
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 20,
      });
    } catch (err: unknown) {
      set.status = 500;
      return { error: err instanceof Error ? err.message : 'Gagal mengambil daftar pengumuman' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getManageList({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu' };
      }

      return await PengumumanService.getManageList(user, {
        search: query.search as string | undefined,
        status: query.status as string | undefined,
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 20,
        sortBy: query.sortBy as string | undefined,
        sortOrder: query.sortOrder as string | undefined,
      });
    } catch (err: unknown) {
      set.status = 500;
      return { error: err instanceof Error ? err.message : 'Gagal mengambil daftar kelola pengumuman' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getDetail({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu' };
      }

      const id = Number(params.id);
      if (isNaN(id)) {
        set.status = 400;
        return { error: 'ID pengumuman tidak valid' };
      }

      return await PengumumanService.getDetail(id, user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Pengumuman tidak ditemukan';
      set.status = msg.includes('akses') || msg.includes('ditujukan') ? 403 : 404;
      return { error: msg };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async saveDraft({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu' };
      }

      return await PengumumanService.saveDraft(user, body);
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal menyimpan draft pengumuman' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async publish({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu' };
      }

      return await PengumumanService.publish(user, body);
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal mempublikasikan pengumuman' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async withdraw({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu' };
      }

      const id = Number(params.id);
      if (isNaN(id)) {
        set.status = 400;
        return { error: 'ID pengumuman tidak valid' };
      }

      return await PengumumanService.withdraw(id, user, (body as { reason?: string })?.reason);
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal menarik pengumuman' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async delete({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu' };
      }

      const id = Number(params.id);
      if (isNaN(id)) {
        set.status = 400;
        return { error: 'ID pengumuman tidak valid' };
      }

      return await PengumumanService.delete(id, user);
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal menghapus pengumuman' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async uploadAttachment({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu' };
      }

      const file = (body as { file?: File })?.file;
      if (!file || !(file instanceof File)) {
        set.status = 400;
        return { error: 'File tidak ditemukan' };
      }

      const allowedExtensions = ['.pdf', '.docx', '.xlsx', '.pptx', '.zip', '.png', '.jpg', '.jpeg', '.webp'];
      const ext = extname(file.name).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        set.status = 400;
        return { error: `Format file tidak didukung (${ext}). Gunakan format PDF, Dokumen, ZIP, atau Gambar.` };
      }

      const maxBytes = 25 * 1024 * 1024; // 25 MB
      if (file.size > maxBytes) {
        set.status = 400;
        return { error: 'Ukuran file melebihi batas 25MB' };
      }

      const storageDir = join(process.cwd(), 'storage', 'pengumuman');
      await mkdir(storageDir, { recursive: true });

      const safeRandom = Math.random().toString(36).substring(2, 10);
      const safeFilename = `${Date.now()}-${safeRandom}${ext}`;
      const filePath = join(storageDir, safeFilename);

      await writeFile(filePath, new Uint8Array(await file.arrayBuffer()));

      const isImage = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);

      return {
        nama: file.name,
        tipe: isImage ? 'gambar' : 'file',
        url: `/storage/pengumuman/${safeFilename}`,
        ukuran: file.size,
        mimeType: file.type || 'application/octet-stream',
      };
    } catch (err: unknown) {
      set.status = 500;
      return { error: err instanceof Error ? err.message : 'Gagal mengunggah file' };
    }
  }
}
