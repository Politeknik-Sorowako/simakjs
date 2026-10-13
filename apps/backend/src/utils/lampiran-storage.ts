import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

export const LAMPIRAN_DIR = join(process.cwd(), 'storage', 'status-mahasiswa');
export const LAMPIRAN_MAX_MB = 10;

const ALLOWED_EXT = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_MIME = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

export function validateLampiranFile(file: File): string {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('File lampiran tidak ditemukan.');
  }
  const ext = extname(file.name).toLowerCase();
  if (!ALLOWED_EXT.includes(ext) || (file.type && !ALLOWED_MIME.includes(file.type))) {
    throw new Error('Format lampiran harus PDF atau gambar (jpg, jpeg, png, webp).');
  }
  if (file.size > LAMPIRAN_MAX_MB * 1024 * 1024) {
    throw new Error(`Ukuran lampiran maksimal ${LAMPIRAN_MAX_MB} MB.`);
  }
  return ext;
}

export async function saveLampiranFile(file: File, prefix: string): Promise<string> {
  const ext = validateLampiranFile(file);
  await mkdir(LAMPIRAN_DIR, { recursive: true });
  const base = file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .slice(0, 60);
  const storageKey = `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${base}${ext}`;
  await writeFile(join(LAMPIRAN_DIR, storageKey), new Uint8Array(await file.arrayBuffer()));
  return storageKey;
}

export async function removeLampiranFile(storageKey: string): Promise<void> {
  if (basename(storageKey) !== storageKey) return; // anti path traversal
  try {
    await unlink(join(LAMPIRAN_DIR, storageKey));
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException)?.code !== 'ENOENT') throw e;
  }
}

export function lampiranFilePath(storageKey: string): string | null {
  if (basename(storageKey) !== storageKey) return null;
  return join(LAMPIRAN_DIR, storageKey);
}
