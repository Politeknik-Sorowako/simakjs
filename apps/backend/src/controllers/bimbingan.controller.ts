import { eq } from 'drizzle-orm';
import { dosen, mahasiswa, periodeAkademik } from '../models/schema';
import { BimbinganService } from '../services/bimbingan.service';
import { KhsService } from '../services/khs.service';
import { PelanggaranService } from '../services/pelanggaran.service';
import { PresensiService } from '../services/presensi.service';
import { db } from '../utils/db';
import { AuthContext } from '../utils/types';

export class BimbinganController {
  // Helper to map email to student profile ID
  private static async getMahasiswaIdByEmail(email: string): Promise<number | null> {
    const [mhs] = await db.select({ id: mahasiswa.id }).from(mahasiswa).where(eq(mahasiswa.email, email));
    return mhs ? mhs.id : null;
  }

  // Helper to map email to dosen profile ID
  private static async getDosenIdByEmail(email: string): Promise<number | null> {
    const [dsn] = await db.select({ id: dosen.id }).from(dosen).where(eq(dosen.email, email));
    return dsn ? dsn.id : null;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getByMhsId(ctx: AuthContext<any, any>): Promise<any> {
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
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal memproses bimbingan.' };
    }
  }

  static async createThreadMessage(ctx: AuthContext) {
    // biome-ignore lint/suspicious/noExplicitAny: Elysia context type inference
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
        server.publish(
          `bimbingan-${bimbData.id}`,
          JSON.stringify({
            type: 'new_message',
            message: newMsg,
          }),
        );
      }

      set.status = 201;
      return newMsg;
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal mengirim pesan.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async updateBimbingan({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
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
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal memperbarui bimbingan.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getMonitoring({ set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'dosen' && user.role !== 'prodi')) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin, Prodi, atau Dosen yang dapat mengakses monitoring.' };
    }

    let dosenId: number | undefined = undefined;
    if (user.role === 'dosen') {
      const dId = await BimbinganController.getDosenIdByEmail(user.email);
      dosenId = dId || undefined;
    }

    return await BimbinganService.getMonitoringBimbingan(dosenId);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getRekapBkd({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user || user.role === 'guest') {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    let dosenId: number | null = null;
    if (user.role === 'dosen') {
      dosenId = await BimbinganController.getDosenIdByEmail(user.email);
      if (!dosenId) {
        set.status = 400;
        return { error: 'Profil Dosen Anda tidak ditemukan.' };
      }
    } else {
      dosenId = query?.dosenId ? parseInt(query.dosenId) : null;
    }

    try {
      const periodeId = query?.periodeId || undefined;
      const data = await BimbinganService.getRekapBimbinganDosen(dosenId || undefined, periodeId);
      return { data };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mengambil rekap BKD.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAkademikSummary(ctx: AuthContext<any, any>) {
    const { params, set, getCurrentUser } = ctx;
    const user = await getCurrentUser();
    if (!user || user.role === 'guest') {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    const mhsId = parseInt(params.mhsId);
    if (isNaN(mhsId)) {
      set.status = 400;
      return { error: 'ID Mahasiswa tidak valid.' };
    }

    try {
      let sisaKompensasi = 0;
      try {
        const komDetail = await PresensiService.getKompensasiDetail(mhsId);
        sisaKompensasi = komDetail.summary.sisaKompensasi;
      } catch (e) {}

      let poinPelanggaran = 0;
      try {
        const pelDetail = await PelanggaranService.getPelanggaranByMahasiswa(mhsId);
        poinPelanggaran = pelDetail.totalPoin;
      } catch (e) {}

      const activePeriode = await BimbinganService.getActivePeriode();
      let ipsSemesterLalu = 0;
      let ipk = 0;

      if (activePeriode) {
        const periodes = await db.select().from(periodeAkademik).orderBy(periodeAkademik.id);

        const activeIdx = periodes.findIndex((p) => p.id === activePeriode.id);
        if (activeIdx > 0) {
          const prevPeriode = periodes[activeIdx - 1];
          try {
            const prevKhs = await KhsService.getKhs(mhsId, prevPeriode.id);
            ipsSemesterLalu = prevKhs.summary.ipSemester;
          } catch (e) {}
        }
      }

      try {
        const activePId = activePeriode?.id || '20251';
        const currentKhs = await KhsService.getKhs(mhsId, activePId);
        ipk = currentKhs.summary.ipk;
      } catch (e) {}

      return {
        sisaKompensasi,
        poinPelanggaran,
        ipk,
        ipsSemesterLalu,
      };
    } catch (err: unknown) {
      set.status = 400;
      return { error: err instanceof Error ? err.message : 'Gagal memproses data akademik.' };
    }
  }

  static async addSesi(ctx: AuthContext) {
    // biome-ignore lint/suspicious/noExplicitAny: Elysia context type inference
    const { params, body, set, getCurrentUser } = ctx as any;
    const user = await getCurrentUser();
    if (!user || user.role === 'guest') {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    const mhsId = parseInt(params.mhsId);
    if (isNaN(mhsId)) {
      set.status = 400;
      return { error: 'ID Mahasiswa tidak valid.' };
    }

    try {
      const bimb = await BimbinganService.getOrCreateBimbingan(mhsId);
      const newSesi = await BimbinganService.addSesiBimbingan(bimb.id, {
        pertemuanKe: body.pertemuanKe,
        tanggalBimbingan: new Date(body.tanggalBimbingan),
        permasalahan: body.permasalahan,
        solusi: body.solusi,
        statusBkd: body.statusBkd ?? true,
        kategoriId: body.kategoriId ? Number(body.kategoriId) : null,
      });
      set.status = 201;
      return newSesi;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal membuat sesi bimbingan.' };
    }
  }

  static async updateSesi(ctx: AuthContext) {
    // biome-ignore lint/suspicious/noExplicitAny: Elysia context type inference
    const { params, body, set, getCurrentUser } = ctx as any;
    const user = await getCurrentUser();
    if (!user || user.role === 'guest') {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    const sesiId = parseInt(params.sesiId);
    if (isNaN(sesiId)) {
      set.status = 400;
      return { error: 'ID Sesi tidak valid.' };
    }

    try {
      const data: Record<string, unknown> = {};
      if (body.pertemuanKe !== undefined) data.pertemuanKe = body.pertemuanKe;
      if (body.tanggalBimbingan !== undefined) data.tanggalBimbingan = new Date(body.tanggalBimbingan);
      if (body.permasalahan !== undefined) data.permasalahan = body.permasalahan;
      if (body.solusi !== undefined) data.solusi = body.solusi;
      if (body.statusBkd !== undefined) data.statusBkd = body.statusBkd;
      if (body.kategoriId !== undefined) data.kategoriId = body.kategoriId ? Number(body.kategoriId) : null;

      const updated = await BimbinganService.updateSesiBimbingan(sesiId, data);
      return updated;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal meng-update sesi bimbingan.' };
    }
  }

  static async deleteSesi(ctx: AuthContext) {
    const { params, set, getCurrentUser } = ctx;
    const user = await getCurrentUser();
    if (!user || user.role === 'guest') {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    const sesiId = parseInt(params.sesiId);
    if (isNaN(sesiId)) {
      set.status = 400;
      return { error: 'ID Sesi tidak valid.' };
    }

    try {
      const deleted = await BimbinganService.deleteSesiBimbingan(sesiId);
      return deleted;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal menghapus sesi bimbingan.' };
    }
  }

  static async clearChat(ctx: AuthContext) {
    const { params, set, getCurrentUser } = ctx;
    const user = await getCurrentUser();
    if (!user || user.role === 'guest') {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    const mhsId = parseInt(params.mhsId);
    if (isNaN(mhsId)) {
      set.status = 400;
      return { error: 'ID Mahasiswa tidak valid.' };
    }

    try {
      const bimb = await BimbinganService.getOrCreateBimbingan(mhsId);
      const res = await BimbinganService.clearChatThread(bimb.id);
      return res;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mengosongkan chat thread.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getMonitoringLengkap(ctx: AuthContext<any, any>): Promise<any> {
    const { query, set, getCurrentUser } = ctx;
    const user = await getCurrentUser();
    if (
      !user ||
      (user.role !== 'admin' && user.role !== 'prodi' && user.role !== 'dosen' && user.role !== 'super_admin')
    ) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }

    try {
      const filter = {
        periodeId: query?.periodeId ? String(query.periodeId) : undefined,
        prodiId: query?.prodiId ? parseInt(query.prodiId) : undefined,
        dosenPaId: query?.dosenPaId ? parseInt(query.dosenPaId) : undefined,
        search: query?.search ? String(query.search) : undefined,
        page: query?.page ? parseInt(query.page) : 1,
        limit: query?.limit ? parseInt(query.limit) : 10,
      };
      const result = await BimbinganService.getMonitoringBimbinganLengkap(filter);
      return result;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mengambil data monitoring bimbingan.' };
    }
  }
}
