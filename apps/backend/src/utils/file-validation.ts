export const MAX_ADMISSION_FILE_BYTES = 5 * 1024 * 1024;

export const ADMISSION_ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];

const MAGIC_BYTES: Array<{ ext: string; bytes: number[] }> = [
  { ext: 'pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
  { ext: 'jpg', bytes: [0xff, 0xd8, 0xff] },
  { ext: 'png', bytes: [0x89, 0x50, 0x4e, 0x47] },
];

/**
 * Menentukan tipe berkas dari magic bytes (8 byte pertama). Kembalikan null
 * bila tidak dikenali. WebP (RIFF....WEBP) diperiksa lewat penanda ASCII.
 */
export function detectFileType(buffer: Uint8Array): string | null {
  for (const { ext, bytes } of MAGIC_BYTES) {
    let match = true;
    for (let i = 0; i < bytes.length; i++) {
      if (buffer[i] !== bytes[i]) {
        match = false;
        break;
      }
    }
    if (match) return ext;
  }
  const head = new TextDecoder().decode(buffer.subarray(0, 12));
  if (head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP') return 'webp';
  return null;
}

/**
 * Validasi berkas upload admisi: ukuran, ekstensi, dan magic bytes.
 * Mengembalikan pesan error bila tidak valid, atau `null` bila valid.
 */
export function validateAdmissionFile(file: { name: string; size: number }): string | null {
  if (!file || !file.name || file.size <= 0) {
    return 'File wajib diisi';
  }
  if (file.size > MAX_ADMISSION_FILE_BYTES) {
    return 'Ukuran file maksimal 5 MB';
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ADMISSION_ALLOWED_EXTENSIONS.includes(ext)) {
    return 'Tipe file tidak diizinkan. Gunakan PDF, JPG, PNG, atau WebP';
  }
  return null;
}

/**
 * Validasi magic bytes setelah berkas dibaca. Ini mencegah file yang
 * di-rename ekstensinya (mis. exe diubah jadi .pdf).
 */
export function validateAdmissionFileMagic(ext: string, buffer: Uint8Array): string | null {
  const detected = detectFileType(buffer);
  const normalizedExt = ext.toLowerCase() === 'jpeg' ? 'jpg' : ext.toLowerCase();
  if (!detected) {
    return 'Konten file tidak dikenali atau korup';
  }
  if (detected !== normalizedExt) {
    return 'Isi file tidak sesuai dengan ekstensi yang diklaim';
  }
  return null;
}

/**
 * Membersihkan nama file agar aman untuk header `Content-Disposition`
 * (mencegah header-injection via `"` atau CR/LF).
 */
export function sanitizeContentDispositionName(name: string): string {
  const cleaned = String(name || '')
    .replace(/["\\\r\n]/g, '')
    .trim();
  return cleaned.length > 0 ? cleaned : 'dokumen';
}
