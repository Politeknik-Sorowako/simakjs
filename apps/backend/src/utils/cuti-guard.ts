import { and, eq, inArray } from 'drizzle-orm';
import { pengajuanCuti } from '../models/schema';
import { db } from './db';

const STATUS_CUTI_AKTIF = ['disetujui_pa', 'disetujui_keuangan', 'disetujui_prodi', 'kembali_aktif'] as const;

export const CUTI_GLOBAL_STATUS = 'cuti';

export function isCutiGlobal(status: string | null | undefined): boolean {
  return status === CUTI_GLOBAL_STATUS;
}

/**
 * Mengembalikan himpunan periode akademik yang sedang/sudah tercakup cuti yang
 * disetujui untuk seorang mahasiswa. Dipakai untuk mengecualikan presensi/
 * kompensasi historis yang jatuh dalam rentang cuti (per-periode).
 */
export async function getCutiPeriodeIds(mahasiswaId: number): Promise<Set<string>> {
  const rows = await db
    .select({ periodeId: pengajuanCuti.periodeId })
    .from(pengajuanCuti)
    .where(and(eq(pengajuanCuti.mahasiswaId, mahasiswaId), inArray(pengajuanCuti.status, [...STATUS_CUTI_AKTIF])));
  return new Set(rows.map((r) => r.periodeId).filter((p): p is string => Boolean(p)));
}
