import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Enkripsi nilai parameter rahasia (mis. `FEEDER_PASSWORD`) sebelum disimpan ke tabel
 * `system_settings`, agar tidak lagi tersimpan sebagai plaintext at-rest.
 *
 * Format tersimpan: `enc:v1:<iv-b64url>.<tag-b64url>.<ciphertext-b64url>` (AES-256-GCM).
 * Nilai TANPA prefix dianggap data lama (plaintext historis) dan tetap dapat dibaca
 * (backward-compatible) — `decryptSecret()` mengembalikannya apa adanya.
 *
 * Kunci diambil dari env `SETTINGS_SECRET_KEY` (menerima hex 64 karakter, base64 32
 * byte, atau string utf-8 32 karakter). Bila env belum diset/invalid, penyimpanan
 * JATUH ke plaintext (fail-open, sekali warning) supaya deployment tanpa env baru
 * tidak rusak; sebaliknya `decryptSecret()` untuk nilai terenkripsi tanpa kunci
 * mengembalikan string kosong agar kunci salah tidak terkirim ke server eksternal.
 */

const ENC_PREFIX = 'enc:v1:';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_ENV = 'SETTINGS_SECRET_KEY';

let warnedMissingKey = false;

function resolveKey(): Buffer | null {
  const raw = process.env[KEY_ENV];
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return Buffer.from(trimmed, 'hex');
  const base64 = Buffer.from(trimmed, 'base64');
  if (base64.length === 32) return base64;
  const utf8 = Buffer.from(trimmed, 'utf8');
  if (utf8.length === 32) return utf8;
  console.warn(
    `[secret-crypto] ${KEY_ENV} diset tetapi bukan kunci 32 byte yang valid (hex 64 karakter / base64 / utf-8 32 karakter).`,
  );
  return null;
}

function warnMissingKeyOnce(): void {
  if (warnedMissingKey) return;
  warnedMissingKey = true;
  console.warn(
    `[secret-crypto] ${KEY_ENV} belum diset — parameter rahasia (mis. FEEDER_PASSWORD) disimpan sebagai plaintext. Set env ${KEY_ENV} (openssl rand -hex 32) agar tersimpan terenkripsi.`,
  );
}

/** True bila nilai tersimpan sudah dalam format terenkripsi (`enc:v1:...`). */
export function isSecretEncrypted(stored: string): boolean {
  return typeof stored === 'string' && stored.startsWith(ENC_PREFIX);
}

/**
 * Enkripsi nilai rahasia. Tanpa kunci valid, nilai dikembalikan apa adanya (plaintext)
 * agar deployment lama tetap berfungsi.
 */
export function encryptSecret(plain: string): string {
  const key = resolveKey();
  if (!key) {
    warnMissingKeyOnce();
    return plain;
  }
  try {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${ENC_PREFIX}${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`;
  } catch (e: unknown) {
    console.error('[secret-crypto] Gagal mengenkripsi nilai rahasia:', e instanceof Error ? e.message : e);
    return plain;
  }
}

/**
 * Dekripsi nilai tersimpan. Nilai tanpa prefix (plaintext historis) dikembalikan apa
 * adanya. Gagal dekripsi (kunci berubah/hilang/rusak) → string kosong beserta error
 * log; nilai chipertext tidak pernah dikembalikan sebagai "nilai rahasia".
 */
export function decryptSecret(stored: string): string {
  if (!isSecretEncrypted(stored)) return stored ?? '';
  const key = resolveKey();
  if (!key) {
    console.error(
      `[secret-crypto] Nilai rahasia tersimpan terenkripsi tetapi ${KEY_ENV} tidak tersedia — kembalikan nilai kosong. Set ${KEY_ENV} sesuai env saat nilai disimpan.`,
    );
    return '';
  }
  const payload = stored.slice(ENC_PREFIX.length);
  const [ivPart, tagPart, cipherPart] = payload.split('.');
  if (!ivPart || !tagPart || !cipherPart) {
    console.error('[secret-crypto] Format nilai rahasia terenkripsi tidak dikenal.');
    return '';
  }
  try {
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivPart, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(cipherPart, 'base64url')), decipher.final()]).toString('utf8');
  } catch (e: unknown) {
    console.error(
      '[secret-crypto] Gagal mendekripsi nilai rahasia (kunci berubah/tidak cocok):',
      e instanceof Error ? e.message : e,
    );
    return '';
  }
}
