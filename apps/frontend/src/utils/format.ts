/**
 * Mengembalikan tanggal kalender hari ini dalam format `YYYY-MM-DD` berbasis waktu
 * lokal perangkat/browser pengguna. Timezone-safe: tidak melalui konversi UTC agar
 * tidak bergeser satu hari (misal 07:00 WITA = 23:00 UTC hari sebelumnya).
 */
export function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fmtWaktu(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format tanggal kalender (YYYY-MM-DD) menjadi "DD MMM YYYY" (mis. "12 Agu 2026").
 * Timezone-safe: tidak melewati konversi UTC agar tidak bergeser satu hari.
 */
export function fmtTanggal(tanggal?: string | null): string {
  if (!tanggal) return '-';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(tanggal);
  if (!m) return tanggal;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return tanggal;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
