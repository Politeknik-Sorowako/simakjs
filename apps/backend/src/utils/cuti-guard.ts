import { and, eq, inArray } from 'drizzle-orm';
import { pengajuanCuti } from '../models/schema';
import { db } from './db';

// Hanya cuti yang sudah final disetujui (disetujui_prodi) dan yang sudah kembali
// aktif dihitung sebagai periode cuti. Status pertengahan (disetujui_pa /
// disetujui_keuangan) TIDAK ikut — konsisten dengan flag global mahasiswa.status
// yang baru di-set 'cuti' pada disetujui_prodi (cuti.service.ts).
export const STATUS_CUTI_AKTIF = ['disetujui_prodi', 'kembali_aktif'] as const;

export const CUTI_GLOBAL_STATUS = 'cuti';

export function isCutiGlobal(status: string | null | undefined): boolean {
  return status === CUTI_GLOBAL_STATUS;
}

function idxOf(pid: string | null | undefined): number | null {
  if (!pid || pid.length < 5) return null;
  const t = parseInt(pid.slice(0, 4), 10);
  const tr = parseInt(pid.slice(4, 5), 10) || 1;
  if (Number.isNaN(t)) return null;
  return t * 2 + tr;
}

function idxToPeriode(idx: number): string {
  const tahun = Math.floor((idx - 1) / 2);
  const term = idx - tahun * 2; // 1 atau 2
  return `${tahun}${term}`;
}

/**
 * Mengembalikan himpunan periode akademik yang tercakup cuti yang sudah disetujui
 * final untuk seorang mahasiswa. Cakupan diambil dari rentang
 * semesterMulaiCuti–semesterBerakhirCuti (diperluas lintas semester seperti pada
 * penghitungan semester KHS); bila rentang tidak diisi, cukup periode anchor
 * `periodeId`. Dipakai untuk mengecualikan presensi/kompensasi historis per-periode.
 */
export async function getCutiPeriodeIds(mahasiswaId: number): Promise<Set<string>> {
  const rows = await db
    .select({
      periodeId: pengajuanCuti.periodeId,
      mulai: pengajuanCuti.semesterMulaiCuti,
      berakhir: pengajuanCuti.semesterBerakhirCuti,
    })
    .from(pengajuanCuti)
    .where(and(eq(pengajuanCuti.mahasiswaId, mahasiswaId), inArray(pengajuanCuti.status, [...STATUS_CUTI_AKTIF])));

  const result = new Set<string>();
  for (const row of rows) {
    if (row.periodeId) result.add(row.periodeId);

    const lo = idxOf(row.mulai) ?? idxOf(row.berakhir);
    const hi = idxOf(row.berakhir) ?? idxOf(row.mulai);
    if (lo === null || hi === null) continue;
    const from = Math.min(lo, hi);
    const to = Math.max(lo, hi);
    for (let i = from; i <= to; i++) {
      result.add(idxToPeriode(i));
    }
  }
  return result;
}
