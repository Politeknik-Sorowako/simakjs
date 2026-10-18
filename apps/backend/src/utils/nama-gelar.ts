/**
 * Utilitas pemrosesan nama dan gelar akademik dosen.
 * Format standar: [Gelar Depan] [Nama Asli][, Gelar Belakang]
 * Contoh: "Dr. Ir. Budi Santoso, S.T., M.T." ->
 *   gelarDepan: "Dr. Ir."
 *   nama: "Budi Santoso"
 *   gelarBelakang: "S.T., M.T."
 */

const KNOWN_FRONT_TITLES = new Set([
  'prof.',
  'prof',
  'dr.',
  'dr',
  'drs.',
  'drs',
  'dra.',
  'dra',
  'ir.',
  'ir',
  'h.',
  'h',
  'hj.',
  'hj',
  'apt.',
  'apt',
  'ns.',
  'ns',
  'drg.',
  'drg',
  'k.h.',
  'kh',
  'ust.',
  'ustadz',
  'ustazah',
]);

export interface ParsedNamaGelar {
  gelarDepan: string | null;
  nama: string;
  gelarBelakang: string | null;
}

/**
 * Mem-parsing string nama lengkap menjadi 3 bagian:
 * 1. gelarDepan: kumpulan gelar di depan nama (mis. "Prof. Dr. Ir.")
 * 2. nama: nama asli bersih tanpa gelar (mis. "Budi Santoso")
 * 3. gelarBelakang: gelar akademik setelah tanda koma (mis. "S.T., M.T.")
 */
export function parseNamaGelar(rawName: string | null | undefined): ParsedNamaGelar {
  const input = (rawName ?? '').trim();
  if (!input) {
    return { gelarDepan: null, nama: '', gelarBelakang: null };
  }

  // 1. Pisahkan berdasarkan koma pertama (nama [+ gelar depan] vs gelar belakang)
  const commaIndex = input.indexOf(',');
  let frontAndNamePart = commaIndex !== -1 ? input.slice(0, commaIndex).trim() : input;
  let backPart = commaIndex !== -1 ? input.slice(commaIndex + 1).trim() : null;

  // Bersihkan koma trailing/leading pada backPart jika ada
  if (backPart) {
    backPart = backPart.replace(/^[\s,]+|[\s,]+$/g, '').trim() || null;
  }

  // 2. Ekstrak gelar depan dari frontAndNamePart
  const words = frontAndNamePart.split(/\s+/).filter(Boolean);
  const frontTitles: string[] = [];
  let nameStartIndex = 0;

  for (let i = 0; i < words.length - 1; i++) {
    const wordClean = words[i].toLowerCase();
    if (KNOWN_FRONT_TITLES.has(wordClean)) {
      frontTitles.push(words[i]);
      nameStartIndex = i + 1;
    } else {
      break;
    }
  }

  const nameWords = words.slice(nameStartIndex);
  let cleanName = nameWords.join(' ').trim();

  // Bila seluruh kata terdeteksi sebagai gelar depan (kasus ekstrem), kembalikan kata terakhir sebagai nama
  if (!cleanName && frontTitles.length > 0) {
    cleanName = frontTitles.pop() || '';
  }

  return {
    gelarDepan: frontTitles.length > 0 ? frontTitles.join(' ') : null,
    nama: cleanName || frontAndNamePart,
    gelarBelakang: backPart || null,
  };
}

/**
 * Merangkai kembali struktur gelar & nama menjadi satu string nama lengkap bergelar rapi.
 * Format: [gelarDepan ]nama[, gelarBelakang]
 */
export function formatNamaGelar(
  nama: string | null | undefined,
  gelarDepan?: string | null,
  gelarBelakang?: string | null,
): string {
  const cleanName = (nama ?? '').trim();
  const front = (gelarDepan ?? '').trim();
  const back = (gelarBelakang ?? '').trim();

  if (!cleanName) return '';

  let result = cleanName;
  if (front) {
    result = `${front} ${result}`;
  }
  if (back) {
    result = `${result}, ${back}`;
  }
  return result;
}
