import type { RekapHarianRow } from '../controllers/presensiController';

/** Status ketidakhadiran yang dihitung sebagai beban pada cap harian. */
export const CAP_STATUS = ['SAKIT', 'IZIN', 'ALPA', 'TERLAMBAT'];

interface BatasDurasiInput {
  maksHarian: number;
  rows: RekapHarianRow[];
  rowId: number;
  isVerified: boolean;
  durasiTersimpan: number;
}

/**
 * Menghitung batas maksimum durasi (menit) yang boleh disimpan saat verifikasi
 * untuk SATU baris ketidakhadiran, mencerminkan aturan server
 * (`verifikasi-unknown.service.ts`):
 *  - Beban harian = total baris terverifikasi berstatus SAKIT/IZIN/ALPA/TERLAMBAT,
 *    TANPA menghitung baris yang sedang diedit.
 *  - Baris BELUM terverifikasi: sisa kuota = maksHarian - totalBarisLain.
 *  - Baris SUDAH terverifikasi: koreksi turun selalu diizinkan, sehingga batasnya
 *    max(sisaBarisLain, durasiTersimpan) — durasi tersimpan "dilepas" lebih dulu.
 */
export function hitungBatasDurasi(input: BatasDurasiInput): number {
  const totalBarisLain = input.rows
    .filter((r) => r.id !== input.rowId && r.isVerified && CAP_STATUS.includes(r.status))
    .reduce((sum, r) => sum + Number(r.durasiMenit || 0), 0);

  const sisaBarisLain = Math.max(input.maksHarian - totalBarisLain, 0);

  if (!input.isVerified) return sisaBarisLain;
  return Math.max(sisaBarisLain, input.durasiTersimpan);
}

/**
 * Pesan notice ketika durasi input melebihi batas harian yang tersisa untuk baris
 * ini. Dipakai konsisten oleh VerifyModal dan halaman verifikasi Apel.
 */
export function pesanBatasDurasi(batas: number): string {
  return `Durasi melebihi batas baris ini (${batas} menit), disesuaikan otomatis ke ${batas} menit`;
}

/**
 * Throttle notice agar tidak membanjiri toast saat pengguna mengetik digit demi
 * digit. Hanya izinkan notice baru bila sudah lewat `jedaMs` sejak notice terakhir.
 */
export function bolehNotice(lastAt: number, now: number, jedaMs = 1500): boolean {
  return now - lastAt >= jedaMs;
}
