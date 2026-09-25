/**
 * Filter bersama antar-tab pada halaman /ketidakhadiran-kompensasi.
 * Dimiliki di parent (KetidakhadiranKompensasi) dan diteruskan ke tiap tab
 * agar perubahan filter di satu tab ikut berlaku di tab lain.
 */
export interface SharedKompensasiFilters {
  search: () => string;
  setSearch: (v: string) => void;
  debouncedSearch: () => string;
  prodiId: () => number | undefined;
  setProdiId: (v: number | undefined) => void;
  tglDari: () => string;
  setTglDari: (v: string) => void;
  tglSampai: () => string;
  setTglSampai: (v: string) => void;
  sumber: () => string;
  setSumber: (v: string) => void;
  resetShared: () => void;
}
