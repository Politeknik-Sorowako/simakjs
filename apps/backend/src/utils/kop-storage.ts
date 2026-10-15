import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { validateAdmissionFileMagic } from './file-validation';

/** Penyimpanan logo kop surat global — satu berkas tetap `logo.<ext>`. */
export const KOP_DIR = join(process.cwd(), 'storage', 'kop');
export const KOP_LOGO_MAX_MB = 2;

const ALLOWED_EXT = ['.png', '.jpg', '.jpeg'];
const ALLOWED_MIME = ['image/png', 'image/jpeg'];

/**
 * Simpan logo kop (menimpa `logo.<ext>` sebelumnya). Ekstensi lama yang
 * berbeda ikut dihapus agar hanya satu logo aktif. Mengembalikan nama berkas
 * + `updatedAt` milis untuk cache-busting URL.
 */
export async function saveKopLogo(file: File): Promise<{ storageKey: string; updatedAt: number }> {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('File logo tidak ditemukan.');
  }
  const ext = extname(file.name).toLowerCase();
  if (!ALLOWED_EXT.includes(ext) || (file.type && !ALLOWED_MIME.includes(file.type))) {
    throw new Error('Format logo harus PNG atau JPG.');
  }
  if (file.size > KOP_LOGO_MAX_MB * 1024 * 1024) {
    throw new Error(`Ukuran logo maksimal ${KOP_LOGO_MAX_MB} MB.`);
  }
  const buffer = new Uint8Array(await file.arrayBuffer());
  // Anti rename-ekstensi: magic bytes PNG/JPEG harus cocok.
  const magicError = validateAdmissionFileMagic(ext.replace(/^\./, ''), buffer);
  if (magicError) {
    throw new Error('Isi file tidak sesuai dengan format logo (PNG/JPG).');
  }
  await mkdir(KOP_DIR, { recursive: true });
  // Hapus logo lama dengan ekstensi berbeda (hanya 1 logo aktif).
  for (const oldExt of ALLOWED_EXT) {
    const key = `logo${oldExt}`;
    if (key !== `logo${ext}`) {
      try {
        await unlink(join(KOP_DIR, key));
      } catch (e: unknown) {
        if ((e as NodeJS.ErrnoException)?.code !== 'ENOENT') throw e;
      }
    }
  }
  const storageKey = `logo${ext}`;
  await writeFile(join(KOP_DIR, storageKey), buffer);
  const info = await stat(join(KOP_DIR, storageKey));
  return { storageKey, updatedAt: Math.floor(info.mtimeMs) };
}

/** Hapus logo kop kustom (tombol "Kembalikan logo bawaan"). Aman bila tak ada. */
export async function removeKopLogo(): Promise<void> {
  for (const ext of ALLOWED_EXT) {
    try {
      await unlink(join(KOP_DIR, `logo${ext}`));
    } catch (e: unknown) {
      if ((e as NodeJS.ErrnoException)?.code !== 'ENOENT') throw e;
    }
  }
}

/** Path berkas logo aktif (bila ada) untuk disajikan endpooint `GET /settings/kop-logo`. */
export async function findKopLogoFile(): Promise<{ path: string; ext: string; mtimeMs: number } | null> {
  for (const ext of ALLOWED_EXT) {
    // Nama berkas konstan (tanpa user input) — aman dari path traversal.
    const path = join(KOP_DIR, `logo${ext}`);
    try {
      const info = await stat(path);
      if (info.isFile()) return { path, ext, mtimeMs: info.mtimeMs };
    } catch (e: unknown) {
      if ((e as NodeJS.ErrnoException)?.code !== 'ENOENT') throw e;
    }
  }
  return null;
}
