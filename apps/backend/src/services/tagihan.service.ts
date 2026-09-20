import { and, asc, count, desc, eq, ilike, lte, or, type SQL, sql, sum } from 'drizzle-orm';
import {
  angsuranTagihan,
  mahasiswa,
  programStudi as ps,
  skemaTarif,
  tagihan,
  transaksiPembayaran,
  users,
} from '../models/schema';
import { db } from '../utils/db';
import { getNowDateString } from '../utils/timezone';
import { SystemParameterService } from './system-parameter.service';

const DEFAULT_TZ = 'Asia/Makassar';

interface TerminPlan {
  terminKe: number;
  nominal: number;
  jatuhTempo: string;
}

export class TagihanService {
  /**
   * Validasi konfigurasi skema tarif (dipakai create & update):
   * - nominal > 0
   * - kedua tanggal jatuh tempo wajib, format YYYY-MM-DD, termin2 >= termin1
   * - jika kedua nominal termin diisi → jumlah harus == nominal SPP
   * - jika satu nominal diisi → 0 < nilai < nominal
   */
  static validateTarif(data: {
    nominal: number;
    termin1Nominal?: number | null;
    termin2Nominal?: number | null;
    termin1JatuhTempo?: string | null;
    termin2JatuhTempo?: string | null;
  }): void {
    if (isNaN(data.nominal) || data.nominal <= 0) {
      throw new Error('Nominal SPP harus lebih besar dari 0');
    }
    const tanggalRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!data.termin1JatuhTempo || !tanggalRe.test(data.termin1JatuhTempo)) {
      throw new Error('Tanggal jatuh tempo Termin I wajib diisi (format YYYY-MM-DD)');
    }
    if (!data.termin2JatuhTempo || !tanggalRe.test(data.termin2JatuhTempo)) {
      throw new Error('Tanggal jatuh tempo Termin II wajib diisi (format YYYY-MM-DD)');
    }
    if (data.termin2JatuhTempo < data.termin1JatuhTempo) {
      throw new Error('Tanggal jatuh tempo Termin II harus sama atau setelah Termin I');
    }

    const t1Isi = data.termin1Nominal !== null && data.termin1Nominal !== undefined;
    const t2Isi = data.termin2Nominal !== null && data.termin2Nominal !== undefined;
    if (t1Isi && t2Isi) {
      const t1 = data.termin1Nominal as number;
      const t2 = data.termin2Nominal as number;
      if (t1 <= 0 || t2 <= 0) {
        throw new Error('Nominal angsuran termin harus lebih besar dari 0');
      }
      const total = t1 + t2;
      if (total !== data.nominal) {
        throw new Error(`Total nominal angsuran (${total}) harus sama dengan nominal SPP (${data.nominal})`);
      }
    } else if (t1Isi) {
      const t1 = data.termin1Nominal as number;
      if (t1 <= 0 || t1 >= data.nominal) {
        throw new Error('Nominal Termin I harus lebih besar dari 0 dan kurang dari nominal SPP');
      }
    } else if (t2Isi) {
      const t2 = data.termin2Nominal as number;
      if (t2 <= 0 || t2 >= data.nominal) {
        throw new Error('Nominal Termin II harus lebih besar dari 0 dan kurang dari nominal SPP');
      }
    }
  }

  /**
   * Menyusun rencana angsuran UKT 2 termin berdasarkan skema tarif.
   * - Nominal: keduanya diisi → pakai apa adanya; hanya satu diisi → pasangannya
   *   `nominal - terisi`; kosong semua → 50/50 (ceil pada Termin I).
   * - Jatuh tempo: WAJIB dari tarif (tanggal absolut). Tanpa kedua tanggal → throw
   *   agar generate tidak membuat tagihan dengan tempo yang tidak valid.
   * Kolom termin1/2_tempo_hari dianggap DEPRECATED dan tidak dibaca lagi.
   */
  static buildTerminPlan(
    nominal: number,
    tarif?: typeof skemaTarif.$inferSelect | null,
    _nowDate: string = getNowDateString(DEFAULT_TZ),
  ): TerminPlan[] {
    const t1Nominal = tarif?.termin1Nominal;
    const t2Nominal = tarif?.termin2Nominal;
    const t1Tanggal = tarif?.termin1JatuhTempo;
    const t2Tanggal = tarif?.termin2JatuhTempo;

    if (!t1Tanggal || !t2Tanggal) {
      throw new Error('Skema tarif harus memiliki tanggal jatuh tempo Termin I dan Termin II');
    }

    const t1Isi = t1Nominal !== null && t1Nominal !== undefined;
    const t2Isi = t2Nominal !== null && t2Nominal !== undefined;

    let termin1: number;
    let termin2: number;
    if (t1Isi && t2Isi) {
      termin1 = t1Nominal as number;
      termin2 = t2Nominal as number;
    } else if (t1Isi) {
      termin1 = t1Nominal as number;
      termin2 = nominal - termin1;
    } else if (t2Isi) {
      termin2 = t2Nominal as number;
      termin1 = nominal - termin2;
    } else {
      termin1 = Math.ceil(nominal / 2);
      termin2 = nominal - termin1;
    }

    if (termin1 <= 0 || termin2 <= 0) {
      throw new Error('Nominal angsuran termin harus lebih besar dari 0');
    }
    if (termin1 + termin2 !== nominal) {
      throw new Error(`Total nominal angsuran (${termin1 + termin2}) harus sama dengan nominal SPP (${nominal})`);
    }

    return [
      { terminKe: 1, nominal: termin1, jatuhTempo: t1Tanggal },
      { terminKe: 2, nominal: termin2, jatuhTempo: t2Tanggal },
    ];
  }

  static async generateTagihanPeriode(periodeId: string, nominalAmount?: number) {
    const students = await db.select().from(mahasiswa).where(eq(mahasiswa.status, 'aktif'));
    let createdCount = 0;
    const skippedTanpaTanggal: { nim: string; nama: string }[] = [];
    const defaultNominal = nominalAmount !== undefined ? nominalAmount : 5000000;

    for (const student of students) {
      // Check if tagihan already exists for this student in this period
      const [existing] = await db
        .select()
        .from(tagihan)
        .where(and(eq(tagihan.mahasiswaId, student.id), eq(tagihan.periodeId, periodeId)))
        .limit(1);

      if (!existing) {
        // Tentukan angkatan masuk mahasiswa (prioritas kolom angkatan)
        let angkatan = student.angkatan;
        if (!angkatan || !/^\d{4}$/.test(angkatan)) {
          angkatan = student.nim.substring(0, 4);
          if (!/^\d{4}$/.test(angkatan)) {
            angkatan = '2024';
          }
        }

        // Mahasiswa pasca-cuti mengikuti kelompok angkatan periode berjalan saat ini
        // jika kolom angkatan tidak di-override secara manual/eksplisit
        if (student.status === 'cuti' && (!student.angkatan || !/^\d{4}$/.test(student.angkatan))) {
          if (periodeId.length >= 4) {
            angkatan = periodeId.substring(0, 4);
          }
        }

        // Ambil nominal tarif dari tabel skema_tarif
        let nominalTagihan = defaultNominal;
        let tarif: typeof skemaTarif.$inferSelect | null = null;
        if (student.programStudiId) {
          const [tarifRow] = await db
            .select()
            .from(skemaTarif)
            .where(and(eq(skemaTarif.angkatan, angkatan), eq(skemaTarif.programStudiId, student.programStudiId)))
            .limit(1);
          if (tarifRow) {
            nominalTagihan = tarifRow.nominal;
            tarif = tarifRow;
          }
        }

        // Tanpa skema tarif (atau tarif tanpa tanggal termin), mahasiswa di-skip
        // dan dilaporkan — tidak menggagalkan seluruh batch generate.
        let terminPlans: TerminPlan[];
        try {
          terminPlans = this.buildTerminPlan(nominalTagihan, tarif);
        } catch {
          skippedTanpaTanggal.push({ nim: student.nim, nama: student.nama });
          continue;
        }

        await db.transaction(async (tx) => {
          const [newTagihan] = await tx
            .insert(tagihan)
            .values({
              mahasiswaId: student.id,
              periodeId: periodeId,
              nominal: nominalTagihan,
              nominalTerbayar: 0,
              status: 'belum_bayar',
            })
            .returning();

          await tx.insert(angsuranTagihan).values(
            terminPlans.map((tp) => ({
              tagihanId: newTagihan.id,
              terminKe: tp.terminKe,
              nominal: tp.nominal,
              nominalTerbayar: 0,
              jatuhTempo: tp.jatuhTempo,
              status: 'belum_bayar' as const,
            })),
          );
        });

        // Set status to non_aktif until they pay
        await db.update(mahasiswa).set({ status: 'non_aktif' }).where(eq(mahasiswa.id, student.id));

        createdCount++;
      }
    }

    return { createdCount, skippedTanpaTanggal };
  }

  static async updateNominal(tagihanId: number, nominalBaru: number) {
    if (isNaN(nominalBaru) || nominalBaru <= 0) {
      throw new Error('Nominal tagihan baru tidak valid');
    }

    const [tag] = await db.select().from(tagihan).where(eq(tagihan.id, tagihanId)).limit(1);
    if (!tag) {
      throw new Error('Tagihan tidak ditemukan');
    }

    // Sinkronkan ulang angsuran secara proporsional terhadap rasio nominal lama.
    const angsuran = await db
      .select()
      .from(angsuranTagihan)
      .where(eq(angsuranTagihan.tagihanId, tagihanId))
      .orderBy(asc(angsuranTagihan.terminKe));

    const oldTotalNominal = angsuran.reduce((acc, ang) => acc + Number(ang.nominal), 0);
    const oldTotalTerbayar = angsuran.reduce((acc, ang) => acc + Number(ang.nominalTerbayar), 0);
    const ratio = oldTotalNominal > 0 ? nominalBaru / oldTotalNominal : 1;

    // Rebalance nominal + nominalTerbayar proporsional, tapi tidak melebihi newAngNominal.
    let sisaNominal = nominalBaru;
    let sisaTerbayar = Math.min(oldTotalTerbayar, nominalBaru);
    for (let i = 0; i < angsuran.length; i++) {
      const ang = angsuran[i];
      const isLast = i === angsuran.length - 1;
      const newAngNominal = isLast ? sisaNominal : Math.round(Number(ang.nominal) * ratio);
      const newAngTerbayar = isLast
        ? Math.min(sisaTerbayar, newAngNominal)
        : Math.min(Math.round(Number(ang.nominalTerbayar) * ratio), newAngNominal);
      const angStatus: 'belum_bayar' | 'cicilan' | 'lunas' =
        newAngTerbayar >= newAngNominal ? 'lunas' : newAngTerbayar > 0 ? 'cicilan' : 'belum_bayar';
      await db
        .update(angsuranTagihan)
        .set({ nominal: newAngNominal, nominalTerbayar: newAngTerbayar, status: angStatus })
        .where(eq(angsuranTagihan.id, ang.id));
      sisaNominal -= newAngNominal;
      sisaTerbayar -= newAngTerbayar;
    }

    // Hitung ulang status tagihan berdasarkan total terbayar aktual setelah rebalance.
    const angsuranAfter = await db.select().from(angsuranTagihan).where(eq(angsuranTagihan.tagihanId, tagihanId));
    const finalTerbayar = angsuranAfter.reduce((acc, a) => acc + Number(a.nominalTerbayar), 0);
    const finalStatus: 'belum_bayar' | 'cicilan' | 'lunas' =
      finalTerbayar >= nominalBaru ? 'lunas' : finalTerbayar > 0 ? 'cicilan' : 'belum_bayar';
    const [finalTag] = await db
      .update(tagihan)
      .set({
        nominal: nominalBaru,
        nominalTerbayar: finalTerbayar,
        status: finalStatus,
        tanggalBayar: finalStatus === 'lunas' ? tag.tanggalBayar || new Date() : null,
      })
      .where(eq(tagihan.id, tagihanId))
      .returning();

    // Sinkronkan status aktif mahasiswa
    await db
      .update(mahasiswa)
      .set({ status: finalStatus === 'lunas' ? 'aktif' : 'non_aktif' })
      .where(eq(mahasiswa.id, tag.mahasiswaId));

    return finalTag;
  }

  static async bayarTagihan(tagihanId: number, nominalBayar?: number, petugasId?: number, catatanKoreksi?: string) {
    return await db.transaction(async (tx) => {
      const [tag] = await tx.select().from(tagihan).where(eq(tagihan.id, tagihanId)).limit(1);
      if (!tag) {
        throw new Error('Tagihan tidak ditemukan');
      }

      if (tag.status === 'lunas') {
        throw new Error('Tagihan sudah lunas');
      }

      const currentTerbayar = Number(tag.nominalTerbayar) || 0;
      const totalBill = Number(tag.nominal) || 0;
      const finalNominalBayar = nominalBayar !== undefined ? nominalBayar : totalBill - currentTerbayar;

      if (finalNominalBayar <= 0) {
        throw new Error('Nominal pembayaran harus lebih besar dari 0');
      }
      if (finalNominalBayar > totalBill - currentTerbayar) {
        throw new Error('Nominal pembayaran melebihi sisa tagihan');
      }

      // Catat log transaksi masuk
      await tx.insert(transaksiPembayaran).values({
        tagihanId,
        nominalBayar: finalNominalBayar,
        petugasId: petugasId || null,
        isVoid: false,
        catatanKoreksi: catatanKoreksi || null,
      });

      const newTerbayar = currentTerbayar + finalNominalBayar;
      const isFullyPaid = newTerbayar >= totalBill;
      const determinedStatus = isFullyPaid ? 'lunas' : 'cicilan';

      const [updatedTagihan] = await tx
        .update(tagihan)
        .set({
          nominalTerbayar: newTerbayar,
          status: determinedStatus,
          tanggalBayar: isFullyPaid ? new Date() : null,
        })
        .where(eq(tagihan.id, tagihanId))
        .returning();

      // Alokasikan pembayaran FIFO ke angsuran: Termin I dilunasi dahulu.
      const angsuran = await tx
        .select()
        .from(angsuranTagihan)
        .where(eq(angsuranTagihan.tagihanId, tagihanId))
        .orderBy(asc(angsuranTagihan.terminKe));

      let sisa = finalNominalBayar;
      for (const ang of angsuran) {
        if (sisa <= 0) break;
        const sisaAng = Number(ang.nominal) - Number(ang.nominalTerbayar);
        if (sisaAng <= 0) continue;
        const alokasi = Math.min(sisa, sisaAng);
        const angTerbayarBaru = Number(ang.nominalTerbayar) + alokasi;
        const angStatus: 'belum_bayar' | 'cicilan' | 'lunas' =
          angTerbayarBaru >= Number(ang.nominal) ? 'lunas' : 'cicilan';
        await tx
          .update(angsuranTagihan)
          .set({ nominalTerbayar: angTerbayarBaru, status: angStatus })
          .where(eq(angsuranTagihan.id, ang.id));
        sisa -= alokasi;
      }

      if (isFullyPaid) {
        await tx.update(mahasiswa).set({ status: 'aktif' }).where(eq(mahasiswa.id, tag.mahasiswaId));
      }

      return updatedTagihan;
    });
  }

  static async voidTransaksi(transaksiId: number, petugasId?: number, catatan?: string) {
    return await db.transaction(async (tx) => {
      const [transaksi] = await tx
        .select()
        .from(transaksiPembayaran)
        .where(eq(transaksiPembayaran.id, transaksiId))
        .limit(1);

      if (!transaksi) {
        throw new Error('Transaksi pembayaran tidak ditemukan');
      }

      if (transaksi.isVoid) {
        throw new Error('Transaksi pembayaran sudah dibatalkan (void)');
      }

      // Void transaksi
      await tx
        .update(transaksiPembayaran)
        .set({
          isVoid: true,
          petugasId: petugasId || null,
          catatanKoreksi: catatan || 'Pembatalan transaksi pembayaran',
        })
        .where(eq(transaksiPembayaran.id, transaksiId));

      // Hitung total bayar aktif
      const [sumResult] = await tx
        .select({ total: sum(transaksiPembayaran.nominalBayar) })
        .from(transaksiPembayaran)
        .where(and(eq(transaksiPembayaran.tagihanId, transaksi.tagihanId), eq(transaksiPembayaran.isVoid, false)));

      const newTerbayar = Number(sumResult?.total) || 0;

      const [tag] = await tx.select().from(tagihan).where(eq(tagihan.id, transaksi.tagihanId)).limit(1);

      if (!tag) {
        throw new Error('Tagihan terkait tidak ditemukan');
      }

      const totalBill = Number(tag.nominal) || 0;
      const isFullyPaid = newTerbayar >= totalBill;
      let determinedStatus: 'belum_bayar' | 'cicilan' | 'lunas' = 'belum_bayar';
      if (isFullyPaid) {
        determinedStatus = 'lunas';
      } else if (newTerbayar > 0) {
        determinedStatus = 'cicilan';
      }

      const [updatedTagihan] = await tx
        .update(tagihan)
        .set({
          nominalTerbayar: newTerbayar,
          status: determinedStatus,
          tanggalBayar: isFullyPaid ? new Date() : null,
        })
        .where(eq(tagihan.id, transaksi.tagihanId))
        .returning();

      // Sinkronkan status aktif mahasiswa
      if (!isFullyPaid) {
        await tx.update(mahasiswa).set({ status: 'non_aktif' }).where(eq(mahasiswa.id, tag.mahasiswaId));
      } else {
        await tx.update(mahasiswa).set({ status: 'aktif' }).where(eq(mahasiswa.id, tag.mahasiswaId));
      }

      return updatedTagihan;
    });
  }

  static async getRiwayatTransaksi(tagihanId: number) {
    return await db
      .select({
        id: transaksiPembayaran.id,
        tagihanId: transaksiPembayaran.tagihanId,
        nominalBayar: transaksiPembayaran.nominalBayar,
        tanggalTransaksi: transaksiPembayaran.tanggalTransaksi,
        petugasId: transaksiPembayaran.petugasId,
        isVoid: transaksiPembayaran.isVoid,
        catatanKoreksi: transaksiPembayaran.catatanKoreksi,
        petugas: {
          id: users.id,
          nama: users.nama,
          email: users.email,
        },
      })
      .from(transaksiPembayaran)
      .leftJoin(users, eq(transaksiPembayaran.petugasId, users.id))
      .where(eq(transaksiPembayaran.tagihanId, tagihanId))
      .orderBy(transaksiPembayaran.tanggalTransaksi);
  }

  static async getAll(
    page = 1,
    limit = 10,
    search = '',
    statusFilter?: string,
    mahasiswaId?: number,
    options?: { periodeId?: string; programStudiId?: number },
  ) {
    const offset = (page - 1) * limit;

    const searchConditions: SQL<unknown>[] = [];
    if (search) {
      const orCondition = or(ilike(mahasiswa.nama, `%${search}%`), ilike(mahasiswa.nim, `%${search}%`));
      if (orCondition) searchConditions.push(orCondition);
    }
    if (statusFilter) {
      // biome-ignore lint/suspicious/noExplicitAny: Drizzle enum type mismatch
      searchConditions.push(eq(tagihan.status, statusFilter as any));
    }
    if (mahasiswaId !== undefined) {
      searchConditions.push(eq(tagihan.mahasiswaId, mahasiswaId));
    }
    if (options?.periodeId) {
      searchConditions.push(eq(tagihan.periodeId, options.periodeId));
    }
    if (options?.programStudiId !== undefined) {
      searchConditions.push(eq(mahasiswa.programStudiId, options.programStudiId));
    }

    const whereClause = searchConditions.length > 0 ? and(...searchConditions) : undefined;

    const [totalResult] = await db
      .select({ total: count() })
      .from(tagihan)
      .leftJoin(mahasiswa, eq(tagihan.mahasiswaId, mahasiswa.id))
      .where(whereClause);

    const total = totalResult?.total || 0;

    const rows = await db
      .select({
        id: tagihan.id,
        mahasiswaId: tagihan.mahasiswaId,
        periodeId: tagihan.periodeId,
        nominal: tagihan.nominal,
        nominalTerbayar: tagihan.nominalTerbayar,
        status: tagihan.status,
        tanggalBayar: tagihan.tanggalBayar,
        createdAt: tagihan.createdAt,
        updatedAt: tagihan.updatedAt,
        mahasiswa: {
          id: mahasiswa.id,
          nim: mahasiswa.nim,
          nama: mahasiswa.nama,
          email: mahasiswa.email,
          status: mahasiswa.status,
        },
      })
      .from(tagihan)
      .leftJoin(mahasiswa, eq(tagihan.mahasiswaId, mahasiswa.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(total / limit);

    return {
      data: rows,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  static async getById(id: number) {
    const [row] = await db
      .select({
        id: tagihan.id,
        mahasiswaId: tagihan.mahasiswaId,
        periodeId: tagihan.periodeId,
        nominal: tagihan.nominal,
        nominalTerbayar: tagihan.nominalTerbayar,
        status: tagihan.status,
        tanggalBayar: tagihan.tanggalBayar,
        createdAt: tagihan.createdAt,
        updatedAt: tagihan.updatedAt,
        mahasiswa: {
          id: mahasiswa.id,
          nim: mahasiswa.nim,
          nama: mahasiswa.nama,
          email: mahasiswa.email,
          status: mahasiswa.status,
        },
      })
      .from(tagihan)
      .leftJoin(mahasiswa, eq(tagihan.mahasiswaId, mahasiswa.id))
      .where(eq(tagihan.id, id))
      .limit(1);

    if (!row) return null;

    const angsuran = await db
      .select()
      .from(angsuranTagihan)
      .where(eq(angsuranTagihan.tagihanId, id))
      .orderBy(asc(angsuranTagihan.terminKe));

    return { ...row, angsuran };
  }

  static async getAngsuran(tagihanId: number) {
    return await db
      .select()
      .from(angsuranTagihan)
      .where(eq(angsuranTagihan.tagihanId, tagihanId))
      .orderBy(asc(angsuranTagihan.terminKe));
  }

  /**
   * Angsuran yang jatuh temponya telah lewat namun belum lunas.
   * Read-only (tanpa auto-Alpa): kehadiran perkuliahan tetap dikonfirmasi
   * manual pada BAP/presensi (keputusan Milestone A).
   */
  static async getOverdue(periodeId?: string, limit = 100) {
    const todayStr = getNowDateString(DEFAULT_TZ);
    const conditions: SQL<unknown>[] = [
      lte(angsuranTagihan.jatuhTempo, todayStr),
      sql`${angsuranTagihan.status} != 'lunas'`,
    ];
    if (periodeId) conditions.push(eq(tagihan.periodeId, periodeId));

    const rows = await db
      .select({
        id: angsuranTagihan.id,
        tagihanId: angsuranTagihan.tagihanId,
        terminKe: angsuranTagihan.terminKe,
        nominal: angsuranTagihan.nominal,
        nominalTerbayar: angsuranTagihan.nominalTerbayar,
        jatuhTempo: angsuranTagihan.jatuhTempo,
        status: angsuranTagihan.status,
        mahasiswa: {
          id: mahasiswa.id,
          nim: mahasiswa.nim,
          nama: mahasiswa.nama,
          status: mahasiswa.status,
        },
      })
      .from(angsuranTagihan)
      .leftJoin(tagihan, eq(angsuranTagihan.tagihanId, tagihan.id))
      .leftJoin(mahasiswa, eq(tagihan.mahasiswaId, mahasiswa.id))
      .where(and(...conditions))
      .orderBy(asc(angsuranTagihan.jatuhTempo))
      .limit(limit);

    return rows;
  }

  static async getStats(periodeId?: string, programStudiId?: number) {
    const conditions: SQL<unknown>[] = [];
    if (periodeId) conditions.push(eq(tagihan.periodeId, periodeId));
    if (programStudiId) conditions.push(eq(mahasiswa.programStudiId, programStudiId));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totals] = await db
      .select({
        totalMahasiswa: count(),
        totalTagihan: sum(tagihan.nominal),
        totalTerbayar: sum(tagihan.nominalTerbayar),
      })
      .from(tagihan)
      .innerJoin(mahasiswa, eq(tagihan.mahasiswaId, mahasiswa.id))
      .where(whereClause);

    const statusBreakdown = await db
      .select({ status: tagihan.status, count: count() })
      .from(tagihan)
      .innerJoin(mahasiswa, eq(tagihan.mahasiswaId, mahasiswa.id))
      .where(whereClause)
      .groupBy(tagihan.status);

    const rekapPerProdi = await db
      .select({
        prodiId: mahasiswa.programStudiId,
        prodiNama: ps.nama,
        total: count(),
        terbayar: sum(tagihan.nominalTerbayar),
        tunggakan: sql<number>`COALESCE(SUM(${tagihan.nominal} - ${tagihan.nominalTerbayar}), 0)`,
      })
      .from(tagihan)
      .innerJoin(mahasiswa, eq(tagihan.mahasiswaId, mahasiswa.id))
      .leftJoin(ps, eq(mahasiswa.programStudiId, ps.id))
      .where(whereClause)
      .groupBy(mahasiswa.programStudiId, ps.nama);

    const statusMap: Record<string, number> = {};
    for (const s of statusBreakdown) statusMap[s.status] = s.count;

    return {
      totalMahasiswa: Number(totals?.totalMahasiswa || 0),
      totalTagihan: Number(totals?.totalTagihan || 0),
      totalTerbayar: Number(totals?.totalTerbayar || 0),
      totalTunggakan: Number(Number(totals?.totalTagihan || 0) - Number(totals?.totalTerbayar || 0)),
      statusBreakdown: statusMap,
      rekapPerProdi: rekapPerProdi.map((p) => ({
        prodiId: p.prodiId,
        prodiNama: p.prodiNama || '-',
        total: Number(p.total),
        terbayar: Number(p.terbayar || 0),
        tunggakan: Number(p.tunggakan || 0),
      })),
    };
  }
}
