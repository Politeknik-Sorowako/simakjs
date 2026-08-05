import { and, count, desc, eq, sql } from 'drizzle-orm';
import { kompensasiManual, mahasiswa, users } from '../models/schema';
import { db } from '../utils/db';

export const JENIS_KOMPEN = ['sakit', 'izin', 'alpa', 'terlambat', 'rusak'] as const;
export type JenisKompen = (typeof JENIS_KOMPEN)[number];

export const JENIS_FULL_DAY: JenisKompen[] = ['sakit', 'izin', 'alpa'];
export const JENIS_DURASI_MANUAL: JenisKompen[] = ['terlambat', 'rusak'];

export const MAKS_DURASI_HARIAN = 480;

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

  static async hitungTotalHariIni(mahasiswaId: number, tanggal: string, excludeId?: number): Promise<number> {
    const conditions = [eq(kompensasiManual.mahasiswaId, mahasiswaId), eq(kompensasiManual.tanggal, tanggal)];
    if (excludeId !== undefined) {
      conditions.push(sql`${kompensasiManual.id} != ${excludeId}`);
    }
    const [row] = await db
      .select({ total: sql<number>`COALESCE(SUM(${kompensasiManual.durasiMenit}), 0)` })
      .from(kompensasiManual)
      .where(and(...conditions));
    return Number(row?.total || 0);
  }

  static async checkDuplicateRisk(mahasiswaId: number, tanggal: string, excludeId?: number): Promise<boolean> {
    const conditions = [eq(kompensasiManual.mahasiswaId, mahasiswaId), eq(kompensasiManual.tanggal, tanggal)];
    if (excludeId !== undefined) {
      conditions.push(sql`${kompensasiManual.id} != ${excludeId}`);
    }
    const [row] = await db
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
    const [mhs] = await db.select({ id: mahasiswa.id }).from(mahasiswa).where(eq(mahasiswa.id, data.mahasiswaId));
    if (!mhs) {
      throw new Error('Mahasiswa tidak ditemukan');
    }
    if (!JENIS_KOMPEN.includes(data.jenisKompen)) {
      throw new Error('Jenis kompensasi tidak valid');
    }

    const durasiMenit = this.resolveDurasiMenit(data.jenisKompen, data.durasiMenit);
    const totalHariIni = await this.hitungTotalHariIni(data.mahasiswaId, data.tanggal);

    if (totalHariIni + durasiMenit > MAKS_DURASI_HARIAN) {
      throw new Error(
        `Total durasi kompensasi pada tanggal ${data.tanggal} sudah mencapai ${totalHariIni} menit. ` +
          `Tidak dapat menambah ${durasiMenit} menit (maks ${MAKS_DURASI_HARIAN} menit/hari).`,
      );
    }

    const isDuplicateRisk = await this.checkDuplicateRisk(data.mahasiswaId, data.tanggal);

    let creatorId: number | null = data.createdBy;
    if (creatorId) {
      const [u] = await db.select({ id: users.id }).from(users).where(eq(users.id, creatorId));
      if (!u) creatorId = null;
    }

    const [record] = await db
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
    const [existing] = await db.select().from(kompensasiManual).where(eq(kompensasiManual.id, id));
    if (!existing) {
      return null;
    }

    const mahasiswaId = data.mahasiswaId ?? existing.mahasiswaId;
    const tanggal = data.tanggal ?? existing.tanggal;
    const jenisKompen = (data.jenisKompen ?? existing.jenisKompen) as JenisKompen;

    if (!JENIS_KOMPEN.includes(jenisKompen)) {
      throw new Error('Jenis kompensasi tidak valid');
    }

    const durasiMenit = this.resolveDurasiMenit(jenisKompen, data.durasiMenit ?? existing.durasiMenit);
    const totalHariIni = await this.hitungTotalHariIni(mahasiswaId, tanggal, id);

    if (totalHariIni + durasiMenit > MAKS_DURASI_HARIAN) {
      throw new Error(
        `Total durasi kompensasi pada tanggal ${tanggal} akan melebihi batas ${MAKS_DURASI_HARIAN} menit/hari.`,
      );
    }

    const [updated] = await db
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
        sql`(${kompensasiManual.mahasiswaId}, ${kompensasiManual.tanggal}) IN (${sql.join(
          grouped.map((g) => sql`(${g.mahasiswaId}, ${g.tanggal})`),
          sql`, `,
        )})`,
      )
      .orderBy(kompensasiManual.tanggal);

    return grouped.map((g) => ({
      mahasiswaId: g.mahasiswaId,
      nim: mhsMap.get(g.mahasiswaId)?.nim || '',
      nama: mhsMap.get(g.mahasiswaId)?.nama || '',
      tanggal: g.tanggal,
      count: Number(g.total),
      totalMenit: Number(g.totalMenit),
      records: rows
        .filter((r) => r.mahasiswaId === g.mahasiswaId && r.tanggal === g.tanggal)
        .map((r) => ({
          id: r.id,
          jenisKompen: r.jenisKompen,
          durasiMenit: r.durasiMenit,
          keterangan: r.keterangan,
          createdAt: r.createdAt,
        })),
    }));
  }

  static async getStats() {
    const [totalRow] = await db
      .select({
        totalRecords: count(),
        totalMenit: sql<number>`COALESCE(SUM(${kompensasiManual.durasiMenit}), 0)`,
      })
      .from(kompensasiManual);

    const duplicateCount = await db
      .select({
        total: sql<number>`COUNT(*)`,
      })
      .from(
        sql`(
          SELECT mahasiswa_id, tanggal
          FROM kompensasi_manual
          GROUP BY mahasiswa_id, tanggal
          HAVING COUNT(*) > 1
        ) AS dup`,
      );

    const perJenisRows = await db
      .select({
        jenis: kompensasiManual.jenisKompen,
        count: count(),
        totalMenit: sql<number>`COALESCE(SUM(${kompensasiManual.durasiMenit}), 0)`,
      })
      .from(kompensasiManual)
      .groupBy(kompensasiManual.jenisKompen);

    const perJenis = {
      sakit: { count: 0, totalMenit: 0 },
      izin: { count: 0, totalMenit: 0 },
      alpa: { count: 0, totalMenit: 0 },
      terlambat: { count: 0, totalMenit: 0 },
      rusak: { count: 0, totalMenit: 0 },
    };
    for (const row of perJenisRows) {
      const key = row.jenis as keyof typeof perJenis;
      if (perJenis[key]) {
        perJenis[key] = { count: Number(row.count), totalMenit: Number(row.totalMenit) };
      }
    }

    return {
      totalRecords: Number(totalRow?.totalRecords || 0),
      totalMenit: Number(totalRow?.totalMenit || 0),
      duplicateRiskCount: Number(duplicateCount[0]?.total || 0),
      perJenis,
    };
  }
}
