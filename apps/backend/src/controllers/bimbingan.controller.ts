import { BimbinganService } from '../services/bimbingan.service';
import { AuthContext } from '../utils/types';
import { db } from '../utils/db';
import { mahasiswa, dosen } from '../models/schema';
import { eq } from 'drizzle-orm';

export class BimbinganController {
  // Helper to map email to student profile ID
  private static async getMahasiswaIdByEmail(email: string): Promise<number | null> {
    const [mhs] = await db
      .select({ id: mahasiswa.id })
      .from(mahasiswa)
      .where(eq(mahasiswa.email, email));
    return mhs ? mhs.id : null;
  }

  // Helper to map email to dosen profile ID
  private static async getDosenIdByEmail(email: string): Promise<number | null> {
    const [dsn] = await db
      .select({ id: dosen.id })
      .from(dosen)
      .where(eq(dosen.email, email));
    return dsn ? dsn.id : null;
  }

  static async getByMhsId(ctx: AuthContext<any, any>) {
    const { params, query, set, getCurrentUser } = ctx;
    const user = await getCurrentUser();
    if (!user || user.role === 'guest') {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    const targetMhsId = parseInt(params.mhsId);
    if (isNaN(targetMhsId)) {
      set.status = 400;
      return { error: 'ID Mahasiswa tidak valid.' };
    }

    // RBAC check
    if (user.role === 'mahasiswa') {
      const myMhsId = await BimbinganController.getMahasiswaIdByEmail(user.email);
      if (!myMhsId || myMhsId !== targetMhsId) {
        set.status = 403;
        return { error: 'Akses ditolak. Anda hanya dapat mengakses bimbingan Anda sendiri.' };
      }
    } else if (user.role === 'dosen') {
      const myDosenId = await BimbinganController.getDosenIdByEmail(user.email);
      const [mhs] = await db
        .select({ dosenPaId: mahasiswa.dosenPaId })
        .from(mahasiswa)
        .where(eq(mahasiswa.id, targetMhsId));

      if (!myDosenId || !mhs || mhs.dosenPaId !== myDosenId) {
        set.status = 403;
        return { error: 'Akses ditolak. Dosen PA tidak cocok.' };
      }
    }

    try {
      const targetPeriodeId = query?.periodeId || undefined;
      return await BimbinganService.getOrCreateBimbingan(targetMhsId, targetPeriodeId);
    } catch (err: any) {
      set.status = 400;
      return { error: err.message || 'Gagal memproses bimbingan.' };
    }
  }

  static async createThreadMessage(ctx: AuthContext) {
    const { params, body, set, getCurrentUser, server } = ctx as any;
    const user = await getCurrentUser();
    if (!user || user.role === 'guest') {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    const targetMhsId = parseInt(params.mhsId);
    if (isNaN(targetMhsId)) {
      set.status = 400;
      return { error: 'ID Mahasiswa tidak valid.' };
    }
    let senderRole: 'mahasiswa' | 'dosen' | 'admin' | 'prodi' = 'mahasiswa';

    // RBAC check
    if (user.role === 'mahasiswa') {
      const myMhsId = await BimbinganController.getMahasiswaIdByEmail(user.email);
      if (!myMhsId || myMhsId !== targetMhsId) {
        set.status = 403;
        return { error: 'Akses ditolak. Anda hanya dapat mengirim pesan ke bimbingan Anda sendiri.' };
      }
      senderRole = 'mahasiswa';
    } else if (user.role === 'dosen') {
      const myDosenId = await BimbinganController.getDosenIdByEmail(user.email);
      const [mhs] = await db
        .select({ dosenPaId: mahasiswa.dosenPaId })
        .from(mahasiswa)
        .where(eq(mahasiswa.id, targetMhsId));

      if (!myDosenId || !mhs || mhs.dosenPaId !== myDosenId) {
        set.status = 403;
        return { error: 'Akses ditolak. Dosen PA tidak cocok.' };
      }
      senderRole = 'dosen';
    } else if (user.role === 'admin') {
      senderRole = 'admin';
    } else if (user.role === 'prodi') {
      senderRole = 'prodi';
    }

    try {
      const bimbData = await BimbinganService.getOrCreateBimbingan(targetMhsId);
      const newMsg = await BimbinganService.addThreadMessage(bimbData.id, senderRole, body.pesan, body.tipe);
      
      // Publish live update to WebSocket subscribers
      if (server) {
        server.publish(`bimbingan-${bimbData.id}`, JSON.stringify({
          type: 'new_message',
          message: newMsg
        }));
      }

      set.status = 201;
      return newMsg;
    } catch (err: any) {
      set.status = 400;
      return { error: err.message || 'Gagal mengirim pesan.' };
    }
  }

  static async updateBimbingan({ params, body, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role === 'guest') {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    if (user.role === 'mahasiswa') {
      set.status = 403;
      return { error: 'Akses ditolak. Mahasiswa tidak diizinkan mengubah status bimbingan.' };
    }

    const targetMhsId = parseInt(params.mhsId);
    if (isNaN(targetMhsId)) {
      set.status = 400;
      return { error: 'ID Mahasiswa tidak valid.' };
    }

    // If Dosen, check if they are the PA
    if (user.role === 'dosen') {
      const myDosenId = await BimbinganController.getDosenIdByEmail(user.email);
      const [mhs] = await db
        .select({ dosenPaId: mahasiswa.dosenPaId })
        .from(mahasiswa)
        .where(eq(mahasiswa.id, targetMhsId));

      if (!myDosenId || !mhs || mhs.dosenPaId !== myDosenId) {
        set.status = 403;
        return { error: 'Akses ditolak. Anda bukan Dosen PA mahasiswa ini.' };
      }
    }

    try {
      const bimbData = await BimbinganService.getOrCreateBimbingan(targetMhsId);
      const updated = await BimbinganService.updateBimbingan(bimbData.id, body);
      return updated;
    } catch (err: any) {
      set.status = 400;
      return { error: err.message || 'Gagal memperbarui bimbingan.' };
    }
  }

  static async getMonitoring({ set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen' && user.role !== 'prodi')) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin, Prodi, atau Dosen yang dapat mengakses monitoring.' };
    }

    return await BimbinganService.getMonitoringBimbingan();
  }

  static async getRekapBkd({ query, set, getCurrentUser }: AuthContext) {
    const user = await getCurrentUser();
    if (!user || user.role === 'guest') {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    let dosenId: number | null = null;
    if (user.role === 'dosen') {
      dosenId = await BimbinganController.getDosenIdByEmail(user.email);
    } else {
      dosenId = query?.dosenId ? parseInt(query.dosenId) : null;
    }

    if (!dosenId) {
      set.status = 400;
      return { error: 'ID Dosen harus ditentukan atau Anda harus bertindak sebagai Dosen.' };
    }

    try {
      const periodeId = query?.periodeId || undefined;
      const data = await BimbinganService.getRekapBimbinganDosen(dosenId, periodeId);
      return { data };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message || 'Gagal mengambil rekap BKD.' };
    }
  }
}
