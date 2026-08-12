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
