import { and, eq, inArray } from 'drizzle-orm';
import {
  bap,
  dosen,
  dosenPengajarKelas,
  kelasKuliah,
  rencanaEvaluasi,
  rombelPraktikum,
  rps,
  rpsTopik,
} from '../models/schema';
import { db } from './db';
import { hasRole } from './role';
import type { UserPayload } from './types';

export async function getDosenIdByEmail(email?: string | null): Promise<number | null> {
  if (!email) return null;
  const profile = await db.query.dosen.findFirst({ where: eq(dosen.email, email) });
  return profile?.id ?? null;
}

export async function getDosenAllowedKelasIds(dosenId: number): Promise<number[]> {
  const rows = await db
    .select({ kelasKuliahId: dosenPengajarKelas.kelasKuliahId })
    .from(dosenPengajarKelas)
    .where(eq(dosenPengajarKelas.dosenId, dosenId));
  return rows.map((r) => r.kelasKuliahId);
}

export async function isDosenTeachesKelas(dosenId: number, kelasKuliahId: number): Promise<boolean> {
  const allowed = await getDosenAllowedKelasIds(dosenId);
  return allowed.includes(kelasKuliahId);
}

export async function isDosenTeachesMk(dosenId: number, mataKuliahId: number): Promise<boolean> {
  const allowed = await getDosenAllowedKelasIds(dosenId);
  if (allowed.length === 0) return false;
  const rows = await db
    .select({ id: kelasKuliah.id })
    .from(kelasKuliah)
    .where(and(eq(kelasKuliah.mataKuliahId, mataKuliahId), inArray(kelasKuliah.id, allowed)))
    .limit(1);
  return rows.length > 0;
}

export async function isDosenTeachesMkInPeriode(
  dosenId: number,
  mataKuliahId: number,
  periodeId: string,
): Promise<boolean> {
  const allowed = await getDosenAllowedKelasIds(dosenId);
  if (allowed.length === 0) return false;
  const rows = await db
    .select({ id: kelasKuliah.id })
    .from(kelasKuliah)
    .where(
      and(
        eq(kelasKuliah.mataKuliahId, mataKuliahId),
        eq(kelasKuliah.periodeId, periodeId),
        inArray(kelasKuliah.id, allowed),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** Returns true when the user is NOT dosen/instruktur (admin/prodi have full access). */
export function isPrivilegedScope(user: UserPayload | null | undefined): boolean {
  return !hasRole(user, ['dosen', 'instruktur']);
}

/**
 * Guards a Mata Kuliah-based resource for dosen/instruktur users.
 * Admin/prodi always pass. Returns an error message when access is denied, otherwise null.
 */
export async function guardMkScope(
  user: UserPayload | null | undefined,
  mataKuliahId: number,
  periodeId?: string,
): Promise<string | null> {
  if (!user || isPrivilegedScope(user)) return null;
  const dosenId = await getDosenIdByEmail(user.email);
  if (!dosenId) return 'Profil dosen tidak ditemukan. Hubungi admin untuk menautkan akun dengan data dosen.';
  const allowed = periodeId
    ? await isDosenTeachesMkInPeriode(dosenId, mataKuliahId, periodeId)
    : await isDosenTeachesMk(dosenId, mataKuliahId);
  if (!allowed) return 'Akses ditolak. Anda hanya dapat mengelola data mata kuliah yang Anda ampu.';
  return null;
}

export async function getRpsMataKuliah(rpsId: number): Promise<{ mataKuliahId: number; periodeId: string } | null> {
  const row = await db.query.rps.findFirst({ where: eq(rps.id, rpsId) });
  return row ? { mataKuliahId: row.mataKuliahId, periodeId: row.periodeId } : null;
}

export async function getTopikRpsMataKuliah(
  topikId: number,
): Promise<{ mataKuliahId: number; periodeId: string } | null> {
  const row = await db.query.rpsTopik.findFirst({ where: eq(rpsTopik.id, topikId) });
  if (!row) return null;
  return getRpsMataKuliah(row.rpsId);
}

export async function getRencanaEvaluasiMataKuliahId(evaluasiId: number): Promise<number | null> {
  const row = await db.query.rencanaEvaluasi.findFirst({ where: eq(rencanaEvaluasi.id, evaluasiId) });
  return row?.mataKuliahId ?? null;
}

export async function getBapKelasId(bapId: number): Promise<number | null> {
  const row = await db.query.bap.findFirst({ where: eq(bap.id, bapId) });
  return row?.kelasKuliahId ?? null;
}

/**
 * Guards a Kelas Kuliah-based resource for dosen/instruktur users.
 * Admin/prodi always pass. Returns an error message when access is denied, otherwise null.
 */
export async function guardKelasScope(
  user: UserPayload | null | undefined,
  kelasKuliahId: number,
): Promise<string | null> {
  if (!user || isPrivilegedScope(user)) return null;
  const dosenId = await getDosenIdByEmail(user.email);
  if (!dosenId) return 'Profil dosen tidak ditemukan. Hubungi admin untuk menautkan akun dengan data dosen.';
  const allowed = await isDosenTeachesKelas(dosenId, kelasKuliahId);
  if (!allowed) return 'Akses ditolak. Anda hanya dapat mengelola kelas yang Anda ampu.';
  return null;
}

export async function getRombelInfo(
  rombelPraktikumId: number,
): Promise<{ kelasKuliahId: number; instrukturId: number | null } | null> {
  const row = await db.query.rombelPraktikum.findFirst({ where: eq(rombelPraktikum.id, rombelPraktikumId) });
  return row ? { kelasKuliahId: row.kelasKuliahId, instrukturId: row.instrukturId } : null;
}

/**
 * Guards a Rombel Praktikum-based resource for dosen/instruktur users.
 * Admin/prodi always pass. Returns an error message when access is denied, otherwise null.
 */
export async function guardRombelScope(
  user: UserPayload | null | undefined,
  rombelPraktikumId: number,
): Promise<string | null> {
  if (!user || isPrivilegedScope(user)) return null;
  const dosenId = await getDosenIdByEmail(user.email);
  if (!dosenId) return 'Profil dosen tidak ditemukan. Hubungi admin untuk menautkan akun dengan data dosen.';
  const info = await getRombelInfo(rombelPraktikumId);
  if (!info) return 'Rombel praktikum tidak ditemukan.';
  if (info.instrukturId === dosenId) return null;
  const allowed = await isDosenTeachesKelas(dosenId, info.kelasKuliahId);
  if (!allowed) return 'Akses ditolak. Anda hanya dapat mengelola rombel yang Anda ampu.';
  return null;
}
