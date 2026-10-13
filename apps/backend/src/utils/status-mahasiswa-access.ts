import { eq } from 'drizzle-orm';
import { dosen, mahasiswa } from '../models/schema';
import { db } from './db';
import { hasRole } from './role';
import type { UserPayload } from './types';

/** Siapa yang boleh melihat/mengunduh lampiran cuti/penonaktifan milik mahasiswa tertentu. */
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
