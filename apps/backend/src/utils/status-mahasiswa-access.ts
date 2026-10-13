import { eq } from 'drizzle-orm';
import { dosen, mahasiswa, users } from '../models/schema';
import { ProdiScopeService } from '../services/prodi-scope.service';
import { db } from './db';
import { hasRole } from './role';
import type { UserPayload } from './types';

/** Siapa yang boleh melihat daftar (metadata) lampiran cuti/penonaktifan. */
export async function canViewLampiranMahasiswa(user: UserPayload, mahasiswaId: number): Promise<boolean> {
  if (hasRole(user, ['super_admin', 'admin', 'prodi', 'kaprodi', 'keuangan'])) return true;

  const [mhs] = await db
    .select({ id: mahasiswa.id, email: mahasiswa.email, dosenPaId: mahasiswa.dosenPaId })
    .from(mahasiswa)
    .where(eq(mahasiswa.id, mahasiswaId));
  if (!mhs) return false;

  if (hasRole(user, ['mahasiswa'])) return mhs.email === user.email;

  if (hasRole(user, ['dosen'])) {
    const [dsn] = await db.select({ id: dosen.id }).from(dosen).where(eq(dosen.email, user.email));
    return !!dsn && mhs.dosenPaId === dsn.id;
  }
  return false;
}

/**
 * Siapa yang boleh MENGUNDUH isi lampiran (berkas). Lebih ketat dari
 * `canViewLampiranMahasiswa`: untuk prodi/kaprodi akses dibatasi ke prodi
 * mahasiswa bersangkutan. super_admin/admin/keuangan tetap global.
 */
export async function canDownloadLampiranMahasiswa(user: UserPayload, mahasiswaId: number): Promise<boolean> {
  if (hasRole(user, ['super_admin', 'admin', 'keuangan'])) return true;

  const [mhs] = await db
    .select({
      id: mahasiswa.id,
      email: mahasiswa.email,
      dosenPaId: mahasiswa.dosenPaId,
      programStudiId: mahasiswa.programStudiId,
    })
    .from(mahasiswa)
    .where(eq(mahasiswa.id, mahasiswaId));
  if (!mhs) return false;

  if (hasRole(user, ['mahasiswa'])) return mhs.email === user.email;

  if (hasRole(user, ['prodi', 'kaprodi'])) {
    if (await ProdiScopeService.canAccessProdi(user, mhs.programStudiId)) return true;
    // Anti-lockout: union dengan kolom legacy `users.prodiIds` (dipakai pelanggaran
    // & document-signature) agar staf yang hanya terisi di satu mekanisme scope
    // tidak kehilangan akses unduhan.
    if (mhs.programStudiId == null) return false;
    const [u] = await db.select({ prodiIds: users.prodiIds }).from(users).where(eq(users.id, user.id));
    return !!u && Array.isArray(u.prodiIds) && u.prodiIds.includes(mhs.programStudiId);
  }

  if (hasRole(user, ['dosen'])) {
    const [dsn] = await db.select({ id: dosen.id }).from(dosen).where(eq(dosen.email, user.email));
    return !!dsn && mhs.dosenPaId === dsn.id;
  }
  return false;
}
