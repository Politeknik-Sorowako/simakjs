import { and, count, desc, eq, or, sql } from 'drizzle-orm';
import { kompensasiManual, mahasiswa, users } from '../models/schema';
import { db } from '../utils/db';

export const JENIS_KOMPEN = ['sakit', 'izin', 'alpa', 'terlambat', 'rusak'] as const;
export type JenisKompen = (typeof JENIS_KOMPEN)[number];

export const JENIS_FULL_DAY: JenisKompen[] = ['sakit', 'izin', 'alpa'];
export const JENIS_DURASI_MANUAL: JenisKompen[] = ['terlambat', 'rusak'];

export const MAKS_DURASI_HARIAN = 480;

type KompensasiExecutor = { select: typeof db.select };

export class KompensasiManualService {
  static resolveDurasiMenit(jenisKompen: JenisKompen, durasiMenit?: number): number {
    if (JENIS_FULL_DAY.includes(jenisKompen)) {
      return MAKS_DURASI_HARIAN;
    }
    const durasi = durasiMenit || 0;
    if (durasi <= 0) {
      throw new Error('Durasi menit wajib diisi untuk jenis kompensasi terlambat/rusak');
    }
    return Math.min(durasi, MAKS_DURASI_HARIAN);
  }

  static async hitungTotalHariIni(
    mahasiswaId: number,
    tanggal: string,
    excludeId?: number,
    executor: KompensasiExecutor = db,
  ): Promise<number> {
    const conditions = [eq(kompensasiManual.mahasiswaId, mahasiswaId), eq(kompensasiManual.tanggal, tanggal)];
    if (excludeId !== undefined) {
      conditions.push(sql`${kompensasiManual.id} != ${excludeId}`);
    }
    const [row] = await executor
      .select({ total: sql<number>`COALESCE(SUM(${kompensasiManual.durasiMenit}), 0)` })
      .from(kompensasiManual)
      .where(and(...conditions));
    return Number(row?.total || 0);
  }

  static async checkDuplicateRisk(
    mahasiswaId: number,
    tanggal: string,
    excludeId?: number,
    executor: KompensasiExecutor = db,
  ): Promise<boolean> {
    const conditions = [eq(kompensasiManual.mahasiswaId, mahasiswaId), eq(kompensasiManual.tanggal, tanggal)];
    if (excludeId !== undefined) {
      conditions.push(sql`${kompensasiManual.id} != ${excludeId}`);
    }
    const [row] = await executor
      .select({ total: sql<number>`COUNT(*)` })
      .from(kompensasiManual)
      .where(and(...conditions));
    return Number(row?.total || 0) > 0;
  }

  static async createKompensasi(data: {
    mahasiswaId: number;
    tanggal: string;
    jenisKompen: JenisKompen;
    durasiMenit?: number;
    keterangan?: string | null;
    createdBy: number;
  }) {
    return await db.transaction(async (tx) => {
      const lockKey = `kompen_${data.mahasiswaId}_${data.tanggal}`;
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);

      const [mhs] = await tx.select({ id: mahasiswa.id }).from(mahasiswa).where(eq(mahasiswa.id, data.mahasiswaId));
      if (!mhs) {
        throw new Error('Mahasiswa tidak ditemukan');
      }
      if (!JENIS_KOMPEN.includes(data.jenisKompen)) {
        throw new Error('Jenis kompensasi tidak valid');
      }

      const durasiMenit = this.resolveDurasiMenit(data.jenisKompen, data.durasiMenit);
      const totalHariIni = await this.hitungTotalHariIni(data.mahasiswaId, data.tanggal, undefined, tx);

      if (totalHariIni + durasiMenit > MAKS_DURASI_HARIAN) {
        throw new Error(
          `Total durasi kompensasi pada tanggal ${data.tanggal} sudah mencapai ${totalHariIni} menit. ` +
            `Tidak dapat menambah ${durasiMenit} menit (maks ${MAKS_DURASI_HARIAN} menit/hari).`,
        );
      }

      const isDuplicateRisk = await this.checkDuplicateRisk(data.mahasiswaId, data.tanggal, undefined, tx);

      let creatorId: number | null = data.createdBy;
      if (creatorId) {
        const [u] = await tx.select({ id: users.id }).from(users).where(eq(users.id, creatorId));
        if (!u) creatorId = null;
      }

      const [record] = await tx
        .insert(kompensasiManual)
        .values({
          mahasiswaId: data.mahasiswaId,
          tanggal: data.tanggal,
          jenisKompen: data.jenisKompen,
          durasiMenit,
          keterangan: data.keterangan || null,
          createdBy: creatorId,
        })
        .returning();

      return { ...record, isDuplicateRisk };
    });
  }

  static async updateKompensasi(
    id: number,
    data: Partial<{
      mahasiswaId: number;
      tanggal: string;
      jenisKompen: JenisKompen;
      durasiMenit?: number;
      keterangan?: string | null;
    }>,
  ) {
    return await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(kompensasiManual).where(eq(kompensasiManual.id, id));
      if (!existing) {
        return null;
      }

      const mahasiswaId = data.mahasiswaId ?? existing.mahasiswaId;
      const tanggal = data.tanggal ?? existing.tanggal;

      const lockKeys = new Set([
        `kompen_${existing.mahasiswaId}_${existing.tanggal}`,
        `kompen_${mahasiswaId}_${tanggal}`,
      ]);
      for (const lockKey of lockKeys) {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);
      }

      const jenisKompen = (data.jenisKompen ?? existing.jenisKompen) as JenisKompen;

      if (!JENIS_KOMPEN.includes(jenisKompen)) {
        throw new Error('Jenis kompensasi tidak valid');
      }

      const durasiMenit = this.resolveDurasiMenit(jenisKompen, data.durasiMenit ?? existing.durasiMenit);
      const totalHariIni = await this.hitungTotalHariIni(mahasiswaId, tanggal, id, tx);

      if (totalHariIni + durasiMenit > MAKS_DURASI_HARIAN) {
        throw new Error(
          `Total durasi kompensasi pada tanggal ${tanggal} akan melebihi batas ${MAKS_DURASI_HARIAN} menit/hari.`,
        );
      }

      const [updated] = await tx
        .update(kompensasiManual)
        .set({
          mahasiswaId,
          tanggal,
          jenisKompen,
          durasiMenit,
          keterangan: data.keterangan ?? existing.keterangan,
        })
        .where(eq(kompensasiManual.id, id))
        .returning();

      return updated || null;
    });
  }

  static async deleteKompensasi(id: number) {
    const [deleted] = await db.delete(kompensasiManual).where(eq(kompensasiManual.id, id)).returning();
    return deleted || null;
  }

  static async getRiwayatMahasiswa(mahasiswaId: number) {
    return await db
      .select()
      .from(kompensasiManual)
      .where(eq(kompensasiManual.mahasiswaId, mahasiswaId))
      .orderBy(desc(kompensasiManual.tanggal), desc(kompensasiManual.id));
  }

  static async getDuplicateRisk(mahasiswaId?: number, tanggal?: string) {
    const conditions = [];
    if (mahasiswaId !== undefined) {
      conditions.push(eq(kompensasiManual.mahasiswaId, mahasiswaId));
    }
    if (tanggal) {
      conditions.push(eq(kompensasiManual.tanggal, tanggal));
    }

    const grouped = await db
      .select({
        mahasiswaId: kompensasiManual.mahasiswaId,
        tanggal: kompensasiManual.tanggal,
        total: sql<number>`COUNT(*)`,
        totalMenit: sql<number>`COALESCE(SUM(${kompensasiManual.durasiMenit}), 0)`,
      })
      .from(kompensasiManual)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(kompensasiManual.mahasiswaId, kompensasiManual.tanggal)
      .having(sql`COUNT(*) > 1`);

    if (grouped.length === 0) {
      return [];
    }

    const mhsIds = grouped.map((g) => g.mahasiswaId);
    const mhsList = await db
      .select({ id: mahasiswa.id, nim: mahasiswa.nim, nama: mahasiswa.nama })
      .from(mahasiswa)
      .where(sql`${mahasiswa.id} IN (${sql.join(mhsIds, sql`, `)})`);

    const mhsMap = new Map(mhsList.map((m) => [m.id, m]));

    const rows = await db
      .select()
      .from(kompensasiManual)
      .where(
        or(
          ...grouped.map((g) =>
            and(eq(kompensasiManual.mahasiswaId, g.mahasiswaId), eq(kompensasiManual.tanggal, g.tanggal)),
          ),
        ),
      )
      .orderBy(kompensasiManual.tanggal);

    const rowsByKey = new Map<string, Array<(typeof rows)[number]>>();
    for (const r of rows) {
      const key = `${r.mahasiswaId}:${r.tanggal}`;
      const bucket = rowsByKey.get(key) || [];
      bucket.push(r);
      rowsByKey.set(key, bucket);
    }

    return grouped.map((g) => ({
      mahasiswaId: g.mahasiswaId,
      nim: mhsMap.get(g.mahasiswaId)?.nim || '',
      nama: mhsMap.get(g.mahasiswaId)?.nama || '',
      tanggal: g.tanggal,
      count: Number(g.total),
      totalMenit: Number(g.totalMenit),
      records: (rowsByKey.get(`${g.mahasiswaId}:${g.tanggal}`) || []).map((r) => ({
        id: r.id,
        jenisKompen: r.jenisKompen,
        durasiMenit: r.durasiMenit,
        keterangan: r.keterangan,
        createdAt: r.createdAt,
      })),
    }));
  }

  static async getStats() {
    const [totalRow] = await db.select({ count: count() }).from(kompensasiManual);
    const [sumRow] = await db
      .select({ totalMenit: sql<number>`COALESCE(SUM(${kompensasiManual.durasiMenit}), 0)` })
      .from(kompensasiManual);

    const duplicateRisks = await this.getDuplicateRisk();

    const perJenisRaw = await db
      .select({
        jenisKompen: kompensasiManual.jenisKompen,
        cnt: count(),
        totMenit: sql<number>`COALESCE(SUM(${kompensasiManual.durasiMenit}), 0)`,
      })
      .from(kompensasiManual)
      .groupBy(kompensasiManual.jenisKompen);

    const perJenis: Record<JenisKompen, { count: number; totalMenit: number }> = {
      sakit: { count: 0, totalMenit: 0 },
      izin: { count: 0, totalMenit: 0 },
      alpa: { count: 0, totalMenit: 0 },
      terlambat: { count: 0, totalMenit: 0 },
      rusak: { count: 0, totalMenit: 0 },
    };

    for (const r of perJenisRaw) {
      if (r.jenisKompen && perJenis[r.jenisKompen as JenisKompen]) {
        perJenis[r.jenisKompen as JenisKompen] = {
          count: Number(r.cnt),
          totalMenit: Number(r.totMenit),
        };
      }
    }

    const duplicateRiskCount = duplicateRisks.length;
    if (duplicateRiskCount > 0) {
      console.warn(
        `[MONITORING-ALERT] Detected ${duplicateRiskCount} potential duplicate kompensasi entries (multiple records per student on same date).`,
      );
    }

    return {
      totalRecords: Number(totalRow?.count || 0),
      totalMenit: Number(sumRow?.totalMenit || 0),
      duplicateRiskCount,
      perJenis,
    };
  }

  static async getAll(options?: {
    search?: string;
    tanggal?: string;
    jenisKompen?: string;
    page?: number;
    limit?: number;
  }) {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (options?.search) {
      const q = `%${options.search.toLowerCase()}%`;
      conditions.push(sql`(LOWER(${mahasiswa.nim}) LIKE ${q} OR LOWER(${mahasiswa.nama}) LIKE ${q})`);
    }
    if (options?.tanggal) {
      conditions.push(eq(kompensasiManual.tanggal, options.tanggal));
    }
    if (options?.jenisKompen) {
      // biome-ignore lint/suspicious/noExplicitAny: Drizzle enum type requirement
      conditions.push(eq(kompensasiManual.jenisKompen, options.jenisKompen as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRow] = await db
      .select({ count: count() })
      .from(kompensasiManual)
      .innerJoin(mahasiswa, eq(kompensasiManual.mahasiswaId, mahasiswa.id))
      .where(whereClause);

    const total = Number(totalRow?.count || 0);

    const rows = await db
      .select({
        id: kompensasiManual.id,
        mahasiswaId: kompensasiManual.mahasiswaId,
        mahasiswaNim: mahasiswa.nim,
        mahasiswaNama: mahasiswa.nama,
        tanggal: kompensasiManual.tanggal,
        jenisKompen: kompensasiManual.jenisKompen,
        durasiMenit: kompensasiManual.durasiMenit,
        keterangan: kompensasiManual.keterangan,
        createdBy: kompensasiManual.createdBy,
        createdAt: kompensasiManual.createdAt,
        updatedAt: kompensasiManual.updatedAt,
      })
      .from(kompensasiManual)
      .innerJoin(mahasiswa, eq(kompensasiManual.mahasiswaId, mahasiswa.id))
      .where(whereClause)
      .orderBy(desc(kompensasiManual.tanggal), desc(kompensasiManual.id))
      .limit(limit)
      .offset(offset);

    return {
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
