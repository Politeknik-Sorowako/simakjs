import { createHash, createHmac } from 'node:crypto';

/**
 * Serialisasi JSON kanonik (key terurut rekursif) agar hash deterministik
 * dan stabil lintas runtime. Dipakai untuk menghitung `docHash` snapshot
 * dokumen sebelum ditandatangani.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * HMAC-SHA256 atas `<kid>:<docHash>` dengan secret kunci aktif.
 * Mengikat hash dokumen ke kunci kampus sehingga verifikasi dapat
 * membuktikan dokumen diterbitkan oleh server (bukan dipalsukan).
 */
export function hmacSign(kid: string, secret: string, docHash: string): string {
  return createHmac('sha256', secret).update(`${kid}:${docHash}`).digest('hex');
}

export interface SigningKeyConfig {
  activeKid: string;
  keys: Record<string, string>;
}

/**
 * Konfigurasi kunci TTE. Fase 1 memakai satu kunci kampus aktif (`kid`),
 * namun struktur `keys` sudah multi-kid agar rotasi kunci tetap dapat
 * memverifikasi tanda tangan lama.
 *
 * Env:
 * - `SIGN_HMAC_KEYS`: JSON `{"k1":"<secret-hex>"}`
 * - `SIGN_ACTIVE_KID`: kid aktif (default `k1`)
 */
export function getSigningKeyConfig(): SigningKeyConfig {
  const activeKid = process.env.SIGN_ACTIVE_KID || 'k1';
  const raw = process.env.SIGN_HMAC_KEYS;
  if (!raw) {
    throw new Error('SIGN_HMAC_KEYS environment variable is required');
  }
  const keys = JSON.parse(raw) as Record<string, string>;
  if (!keys[activeKid]) {
    throw new Error(`SIGN_HMAC_KEYS tidak memuat kid aktif: ${activeKid}`);
  }
  return { activeKid, keys };
}

/** Base URL halaman verifikasi publik yang dipindai QR. */
export function getVerifyBaseUrl(): string {
  return process.env.VERIFY_BASE_URL || 'https://verify.politekniksorowako.ac.id';
}

/** Masking nama untuk tampilan publik (mis. `Ahmad` -> `A***d`). */
export function maskNama(nama: string): string {
  const trimmed = nama.trim();
  if (trimmed.length <= 2) return `${trimmed.charAt(0) || ''}***`;
  return `${trimmed.charAt(0)}***${trimmed.charAt(trimmed.length - 1)}`;
}

/** Masking NIM untuk tampilan publik (mis. `12345` -> `***2345`). */
export function maskNim(nim: string): string {
  const trimmed = nim.trim();
  if (trimmed.length <= 4) return `***${trimmed}`;
  return `***${trimmed.slice(-4)}`;
}
