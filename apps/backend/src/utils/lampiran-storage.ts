import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { validateAdmissionFileMagic } from './file-validation';

export const LAMPIRAN_DIR = join(process.cwd(), 'storage', 'status-mahasiswa');
export const LAMPIRAN_MAX_MB = 10;

// Direktori & limit khusus lampiran sertifikat kegiatan SKPI (lebih ketat).
export const SKPI_LAMPIRAN_DIR = join(process.cwd(), 'storage', 'skpi');
export const SKPI_LAMPIRAN_MAX_MB = 5;

const ALLOWED_EXT = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_MIME = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

export function validateLampiranFile(file: File, maxMb: number = LAMPIRAN_MAX_MB): string {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('File lampiran tidak ditemukan.');
  }
  const ext = extname(file.name).toLowerCase();
  if (!ALLOWED_EXT.includes(ext) || (file.type && !ALLOWED_MIME.includes(file.type))) {
    throw new Error('Format lampiran harus PDF atau gambar (jpg, jpeg, png, webp).');
  }
  if (file.size > maxMb * 1024 * 1024) {
    throw new Error(`Ukuran lampiran maksimal ${maxMb} MB.`);
  }
  return ext;
}

export async function saveLampiranFile(
  file: File,
  prefix: string,
  options?: { dir?: string; maxMb?: number },
): Promise<string> {
  const dir = options?.dir ?? LAMPIRAN_DIR;
  const ext = validateLampiranFile(file, options?.maxMb ?? LAMPIRAN_MAX_MB);
  const buffer = new Uint8Array(await file.arrayBuffer());
  // Cegah berkas yang di-rename ekstensinya (mis. .exe -> .pdf) dengan
  // memverifikasi magic bytes, selaras dengan validasi upload admisi.
  // validateAdmissionFileMagic menerima ekstensi tanpa titik awal.
  const magicError = validateAdmissionFileMagic(ext.replace(/^\./, ''), buffer);
  if (magicError) {
    throw new Error('Isi lampiran tidak sesuai dengan format file (PDF/gambar).');
  }
  await mkdir(dir, { recursive: true });
  const base = file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .slice(0, 60);
  const storageKey = `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${base}${ext}`;
  await writeFile(join(dir, storageKey), buffer);
  return storageKey;
}

export async function removeLampiranFile(storageKey: string, dir: string = LAMPIRAN_DIR): Promise<void> {
  if (basename(storageKey) !== storageKey) return; // anti path traversal
  try {
    await unlink(join(dir, storageKey));
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException)?.code !== 'ENOENT') throw e;
  }
}

export function lampiranFilePath(storageKey: string, dir: string = LAMPIRAN_DIR): string | null {
  if (basename(storageKey) !== storageKey) return null;
  return join(dir, storageKey);
}
