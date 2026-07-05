import { and, count, eq, ilike, or, sum } from 'drizzle-orm';
import { mahasiswa, skemaTarif, tagihan, transaksiPembayaran, users } from '../models/schema';
import { db } from '../utils/db';

export class TagihanService {
  static async generateTagihanPeriode(periodeId: string, nominalAmount?: number) {
    const students = await db.select().from(mahasiswa);
    let createdCount = 0;
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
        if (student.programStudiId) {
          const [tarif] = await db
            .select()
            .from(skemaTarif)
            .where(and(eq(skemaTarif.angkatan, angkatan), eq(skemaTarif.programStudiId, student.programStudiId)))
            .limit(1);
          if (tarif) {
            nominalTagihan = tarif.nominal;
          }
        }

        await db.insert(tagihan).values({
          mahasiswaId: student.id,
          periodeId: periodeId,
          nominal: nominalTagihan,
          nominalTerbayar: 0,
          status: 'belum_bayar',
        });

        // Set status to non_aktif until they pay
        await db.update(mahasiswa).set({ status: 'non_aktif' }).where(eq(mahasiswa.id, student.id));

        createdCount++;
      }
    }

    return createdCount;
  }

  static async updateNominal(tagihanId: number, nominalBaru: number) {
    if (isNaN(nominalBaru) || nominalBaru <= 0) {
      throw new Error('Nominal tagihan baru tidak valid');
    }

    const [tag] = await db.select().from(tagihan).where(eq(tagihan.id, tagihanId)).limit(1);
    if (!tag) {
      throw new Error('Tagihan tidak ditemukan');
    }

    const currentTerbayar = Number(tag.nominalTerbayar) || 0;
    const isFullyPaid = currentTerbayar >= nominalBaru;
    const determinedStatus = isFullyPaid ? 'lunas' : currentTerbayar > 0 ? 'cicilan' : 'belum_bayar';

    const [updated] = await db
      .update(tagihan)
      .set({
        nominal: nominalBaru,
        status: determinedStatus,
        tanggalBayar: isFullyPaid ? tag.tanggalBayar || new Date() : null,
      })
      .where(eq(tagihan.id, tagihanId))
      .returning();

    // Sinkronkan status aktif mahasiswa
    await db
      .update(mahasiswa)
      .set({ status: isFullyPaid ? 'aktif' : 'non_aktif' })
      .where(eq(mahasiswa.id, tag.mahasiswaId));

    return updated;
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

  static async getAll(page = 1, limit = 10, search = '', statusFilter?: string, mahasiswaId?: number) {
    const offset = (page - 1) * limit;

    const searchConditions: any[] = [];
    if (search) {
      searchConditions.push(or(ilike(mahasiswa.nama, `%${search}%`), ilike(mahasiswa.nim, `%${search}%`)));
    }
    if (statusFilter) {
      searchConditions.push(eq(tagihan.status, statusFilter as any));
    }
    if (mahasiswaId !== undefined) {
      searchConditions.push(eq(tagihan.mahasiswaId, mahasiswaId));
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

    return row || null;
  }
}
