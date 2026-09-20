/**
 * Helper perhitungan nomor semester aktif mahasiswa.
 *
 * Nomor semester dihitung sebagai PERINGKAT periode terpilih dalam daftar
 * periode distinct yang pernah diikuti mahasiswa (dari relasi KRS -> kelas),
 * diurutkan menaik. Pendekatan ini aman terhadap cuti: periode tanpa KRS
 * (mis. semester cuti) otomatis terlewati, sehingga mahasiswa yang kembali
 * dari cuti tidak melompati nomor semester.
 */

export interface PeriodeListItem {
  id: string;
  nama: string;
  aktif: boolean;
}

/**
 * Mengembalikan nomor semester aktif untuk periode terpilih (1-based),
 * atau null bila periode tidak ditemukan dalam daftar periode yang diikuti.
 */
export function hitungSemesterAktif(
  selectedPeriodeId: string | undefined | null,
  periodeList: PeriodeListItem[] | null | undefined,
): number | null {
  if (!selectedPeriodeId || !periodeList || periodeList.length === 0) return null;
  const sorted = [...periodeList].sort((a, b) => a.id.localeCompare(b.id));
  const idx = sorted.findIndex((p) => p.id === selectedPeriodeId);
  return idx >= 0 ? idx + 1 : null;
}
