import { and, eq, sql } from 'drizzle-orm';
import { mahasiswa, periodeAkademik, programStudi, skemaTarif } from '../models/schema';
import { TagihanService } from '../services/tagihan.service';
import { db } from '../utils/db';
import { hasRole } from '../utils/role';
import { AuthContext } from '../utils/types';

export class TagihanController {
  private static async getMahasiswaIdByEmail(email: string): Promise<number | null> {
    const [mhs] = await db.select({ id: mahasiswa.id }).from(mahasiswa).where(eq(mahasiswa.email, email));
    return mhs ? mhs.id : null;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAll({ query, set, getCurrentUser }: AuthContext<any, any>): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (hasRole(user, ['guest'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Guest tidak diizinkan mengakses data tagihan.' };
    }
    const page = query?.page ? parseInt(query.page) : 1;
    const limit = query?.limit ? parseInt(query.limit) : 10;
    const search = query?.search || '';
    const status = query?.status || undefined;
    const periodeId = query?.periodeId || undefined;
    const programStudiId = query?.programStudiId ? parseInt(query.programStudiId) : undefined;

    let filterMhsId: number | undefined = undefined;
    if (hasRole(user, ['mahasiswa'])) {
      const myMhsId = await TagihanController.getMahasiswaIdByEmail(user.email);
      if (!myMhsId) {
        return {
          data: [],
          meta: { total: 0, page, limit, totalPages: 0 },
        };
      }
      filterMhsId = myMhsId;
    }

    return await TagihanService.getAll(page, limit, search, status, filterMhsId, { periodeId, programStudiId });
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async generate({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['admin', 'keuangan'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const nominal = body.nominal !== undefined ? Number(body.nominal) : undefined;
      const result = await TagihanService.generateTagihanPeriode(body.periodeId, nominal);
      set.status = 201;
      return {
        message: 'Tagihan berhasil dibuat secara massal',
        count: result.createdCount,
        skipped: result.skipped,
      };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async updateNominal({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['admin', 'keuangan'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const tagihanId = parseInt(params.id);
      const nominal = Number(body.nominal);
      const updated = await TagihanService.updateNominal(tagihanId, nominal);
      return {
        message: 'Nominal tagihan berhasil diperbarui',
        tagihan: updated,
      };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async bayar({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['admin', 'keuangan'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const tagihanId = parseInt(params.id);
      const nominalBayar = body?.nominalBayar !== undefined ? Number(body.nominalBayar) : undefined;
      const updated = await TagihanService.bayarTagihan(tagihanId, nominalBayar, user.id);
      return {
        message: 'Pembayaran berhasil dan mahasiswa diaktifkan',
        tagihan: {
          id: updated.id,
          status: updated.status,
          tanggalBayar: updated.tanggalBayar,
        },
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal memproses permintaan';
      if (msg === 'Tagihan tidak ditemukan') {
        set.status = 404;
      } else {
        set.status = 400;
      }
      return { error: msg };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async voidTransaksi({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['admin', 'keuangan'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const transaksiId = parseInt(params.id);
      const catatan = body?.catatan || 'Void oleh petugas';
      const updated = await TagihanService.voidTransaksi(transaksiId, user.id, catatan);
      return {
        message: 'Transaksi berhasil dibatalkan (void)',
        tagihan: {
          id: updated.id,
          status: updated.status,
          nominalTerbayar: updated.nominalTerbayar,
        },
      };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getRiwayat({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (hasRole(user, ['guest'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const tagihanId = parseInt(params.id);
      const riwayat = await TagihanService.getRiwayatTransaksi(tagihanId);
      return { data: riwayat };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAngsuran({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (hasRole(user, ['guest'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const tagihanId = parseInt(params.id);
    const data = await TagihanService.getAngsuran(tagihanId);
    return { data };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getOverdue({ query, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['admin', 'keuangan', 'prodi', 'kaprodi'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const periodeId = query?.periodeId || undefined;
    const data = await TagihanService.getOverdue(periodeId);
    return { data };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAllTarif({ set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['admin', 'keuangan'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const list = await db
      .select({
        id: skemaTarif.id,
        angkatan: skemaTarif.angkatan,
        programStudiId: skemaTarif.programStudiId,
        periodeId: skemaTarif.periodeId,
        nominal: skemaTarif.nominal,
        termin1Nominal: skemaTarif.termin1Nominal,
        termin1JatuhTempo: skemaTarif.termin1JatuhTempo,
        termin2Nominal: skemaTarif.termin2Nominal,
        termin2JatuhTempo: skemaTarif.termin2JatuhTempo,
        programStudi: {
          id: programStudi.id,
          nama: programStudi.nama,
          kode: programStudi.kode,
        },
        periode: {
          id: periodeAkademik.id,
          nama: periodeAkademik.nama,
        },
      })
      .from(skemaTarif)
      .leftJoin(programStudi, eq(skemaTarif.programStudiId, programStudi.id))
      .leftJoin(periodeAkademik, eq(skemaTarif.periodeId, periodeAkademik.id));
    return { data: list };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async createTarif({ body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['admin', 'keuangan'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const nominal = Number(body.nominal);
      const programStudiId = Number(body.programStudiId);
      const angkatan = String(body.angkatan);
      const periodeId = String(body.periodeId);

      if (!periodeId || !/^\d{5}$/.test(periodeId)) {
        set.status = 400;
        return { error: 'Periode akademik wajib diisi' };
      }

      const termin1Nominal = body.termin1Nominal != null ? Number(body.termin1Nominal) : null;
      const termin1JatuhTempo = body.termin1JatuhTempo ?? null;
      const termin2Nominal = body.termin2Nominal != null ? Number(body.termin2Nominal) : null;
      const termin2JatuhTempo = body.termin2JatuhTempo ?? null;

      TagihanService.validateTarif({
        nominal,
        termin1Nominal,
        termin2Nominal,
        termin1JatuhTempo,
        termin2JatuhTempo,
      });

      // Validasi periode eksis
      const [periode] = await db
        .select({ id: periodeAkademik.id })
        .from(periodeAkademik)
        .where(eq(periodeAkademik.id, periodeId))
        .limit(1);
      if (!periode) {
        set.status = 400;
        return { error: 'Periode akademik tidak ditemukan' };
      }

      const [existing] = await db
        .select()
        .from(skemaTarif)
        .where(
          and(
            eq(skemaTarif.angkatan, angkatan),
            eq(skemaTarif.programStudiId, programStudiId),
            eq(skemaTarif.periodeId, periodeId),
          ),
        )
        .limit(1);

      const values = {
        nominal,
        termin1Nominal,
        termin1JatuhTempo,
        termin2Nominal,
        termin2JatuhTempo,
      };

      if (existing) {
        const [updated] = await db.update(skemaTarif).set(values).where(eq(skemaTarif.id, existing.id)).returning();
        return { message: 'Tarif angkatan berhasil diperbarui', data: updated };
      } else {
        const [created] = await db
          .insert(skemaTarif)
          .values({
            angkatan,
            programStudiId,
            periodeId,
            ...values,
          })
          .returning();
        return { message: 'Tarif angkatan berhasil ditambahkan', data: created };
      }
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async updateTarif({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['admin', 'keuangan'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const id = parseInt(params.id);
      const nominal = Number(body.nominal);
      const programStudiId = Number(body.programStudiId);
      const angkatan = String(body.angkatan);
      const periodeId = String(body.periodeId);

      if (!periodeId || !/^\d{5}$/.test(periodeId)) {
        set.status = 400;
        return { error: 'Periode akademik wajib diisi' };
      }

      const termin1Nominal = body.termin1Nominal != null ? Number(body.termin1Nominal) : null;
      const termin1JatuhTempo = body.termin1JatuhTempo ?? null;
      const termin2Nominal = body.termin2Nominal != null ? Number(body.termin2Nominal) : null;
      const termin2JatuhTempo = body.termin2JatuhTempo ?? null;

      TagihanService.validateTarif({
        nominal,
        termin1Nominal,
        termin2Nominal,
        termin1JatuhTempo,
        termin2JatuhTempo,
      });

      // Cek periode eksis
      const [periode] = await db
        .select({ id: periodeAkademik.id })
        .from(periodeAkademik)
        .where(eq(periodeAkademik.id, periodeId))
        .limit(1);
      if (!periode) {
        set.status = 400;
        return { error: 'Periode akademik tidak ditemukan' };
      }

      // Cek bentrok unik (angkatan, prodi, periode) dengan baris lain
      const [existing] = await db
        .select()
        .from(skemaTarif)
        .where(
          and(
            eq(skemaTarif.angkatan, angkatan),
            eq(skemaTarif.programStudiId, programStudiId),
            eq(skemaTarif.periodeId, periodeId),
            sql`${skemaTarif.id} != ${id}`,
          ),
        )
        .limit(1);
      if (existing) {
        set.status = 400;
        return { error: 'Sudah ada tarif untuk angkatan, prodi, dan periode yang sama' };
      }

      const [updated] = await db
        .update(skemaTarif)
        .set({
          nominal,
          programStudiId,
          angkatan,
          periodeId,
          termin1Nominal,
          termin1JatuhTempo,
          termin2Nominal,
          termin2JatuhTempo,
        })
        .where(eq(skemaTarif.id, id))
        .returning();

      if (!updated) {
        set.status = 404;
        return { error: 'Skema tarif tidak ditemukan' };
      }
      return { message: 'Tarif angkatan berhasil diperbarui', data: updated };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  static async getStats({
    query,
    set,
    getCurrentUser,
    // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  }: AuthContext<any, { periodeId?: string; programStudiId?: string }>): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['admin', 'keuangan'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    const periodeId = query?.periodeId;
    const prodiId = query?.programStudiId ? parseInt(query.programStudiId) : undefined;
    return await TagihanService.getStats(periodeId, prodiId);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async deleteTarif({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu' };
    }
    if (!hasRole(user, ['admin', 'keuangan'])) {
      set.status = 403;
      return { error: 'Akses ditolak.' };
    }
    try {
      const id = parseInt(params.id);
      await db.delete(skemaTarif).where(eq(skemaTarif.id, id));
      return { message: 'Tarif angkatan berhasil dihapus' };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }
}
