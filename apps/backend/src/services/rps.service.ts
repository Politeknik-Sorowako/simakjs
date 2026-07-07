import { and, eq, inArray } from 'drizzle-orm';
import { kurikulumMataKuliah, mataKuliah, rencanaEvaluasi, rps, rpsTopik } from '../models/schema';
import { db } from '../utils/db';

export interface CreateRpsDto {
  mataKuliahId: number;
  periodeId: string;
  deskripsi?: string;
  cplProdi?: string;
}

export interface CreateRpsTopikDto {
  pertemuanKe: number;
  topik: string;
  subTopik?: string;
  metode?: string;
  cpmkId?: number;
}

export interface CreateRencanaEvaluasiDto {
  mataKuliahId: number;
  namaEvaluasi: string;
  bobotEvaluasi: number;
  deskripsi?: string;
  idPddikti?: string;
}

export class RpsService {
  static async getRps(mataKuliahId: number, periodeId: string) {
    const data = await db.query.rps.findFirst({
      where: and(eq(rps.mataKuliahId, mataKuliahId), eq(rps.periodeId, periodeId)),
      with: {
        topik: {
          with: {
            cpmk: true,
          },
        },
      },
    });
    return data || null;
  }

  static async createRps(data: CreateRpsDto) {
    const [newRps] = await db.insert(rps).values(data).returning();
    return newRps;
  }

  static async updateRps(id: number, data: Partial<CreateRpsDto>) {
    const [updatedRps] = await db.update(rps).set(data).where(eq(rps.id, id)).returning();
    return updatedRps || null;
  }

  static async addTopik(rpsId: number, data: CreateRpsTopikDto) {
    const [newTopik] = await db
      .insert(rpsTopik)
      .values({
        rpsId,
        ...data,
      })
      .returning();
    return newTopik;
  }

  static async updateTopik(topikId: number, data: Partial<CreateRpsTopikDto>) {
    const [updatedTopik] = await db.update(rpsTopik).set(data).where(eq(rpsTopik.id, topikId)).returning();
    return updatedTopik || null;
  }

  static async deleteTopik(topikId: number) {
    const [deletedTopik] = await db.delete(rpsTopik).where(eq(rpsTopik.id, topikId)).returning();
    return deletedTopik || null;
  }

  static async getRencanaEvaluasi(mataKuliahId: number) {
    return db.query.rencanaEvaluasi.findMany({
      where: eq(rencanaEvaluasi.mataKuliahId, mataKuliahId),
    });
  }

  static async createRencanaEvaluasi(data: CreateRencanaEvaluasiDto) {
    const existing = await db.query.rencanaEvaluasi.findMany({
      where: eq(rencanaEvaluasi.mataKuliahId, data.mataKuliahId),
    });
    const currentTotal = existing.reduce((sum, item) => sum + parseFloat(item.bobotEvaluasi), 0);
    if (currentTotal + data.bobotEvaluasi > 100) {
      throw new Error('Total bobot rencana evaluasi tidak boleh melebihi 100%');
    }

    const [newEval] = await db
      .insert(rencanaEvaluasi)
      .values({
        ...data,
        bobotEvaluasi: data.bobotEvaluasi.toString(),
      })
      .returning();
    return newEval;
  }

  static async updateRencanaEvaluasi(id: number, data: Partial<CreateRencanaEvaluasiDto>) {
    const currentEval = await db.query.rencanaEvaluasi.findFirst({
      where: eq(rencanaEvaluasi.id, id),
    });
    if (!currentEval) return null;

    const mkId = data.mataKuliahId ?? currentEval.mataKuliahId;
    const newBobot = data.bobotEvaluasi !== undefined ? data.bobotEvaluasi : parseFloat(currentEval.bobotEvaluasi);

    const existing = await db.query.rencanaEvaluasi.findMany({
      where: eq(rencanaEvaluasi.mataKuliahId, mkId),
    });
    const currentTotal = existing
      .filter((item) => item.id !== id)
      .reduce((sum, item) => sum + parseFloat(item.bobotEvaluasi), 0);

    if (currentTotal + newBobot > 100) {
      throw new Error('Total bobot rencana evaluasi tidak boleh melebihi 100%');
    }

    const updateData: any = { ...data };
    if (data.bobotEvaluasi !== undefined) {
      updateData.bobotEvaluasi = data.bobotEvaluasi.toString();
    }
    const [updatedEval] = await db
      .update(rencanaEvaluasi)
      .set(updateData)
      .where(eq(rencanaEvaluasi.id, id))
      .returning();
    return updatedEval || null;
  }

  static async deleteRencanaEvaluasi(id: number) {
    const [deletedEval] = await db.delete(rencanaEvaluasi).where(eq(rencanaEvaluasi.id, id)).returning();
    return deletedEval || null;
  }

  static async bulkGenerateRps(kurikulumId: number, semester: number, periodeId: string) {
    // Ambil semua MK dalam kurikulum di semester tersebut
    const mkList = await db
      .select({
        id: kurikulumMataKuliah.id,
        mataKuliahId: kurikulumMataKuliah.mataKuliahId,
        kode: mataKuliah.kode,
        nama: mataKuliah.nama,
        sksTotal: mataKuliah.sksTotal,
      })
      .from(kurikulumMataKuliah)
      .innerJoin(mataKuliah, eq(kurikulumMataKuliah.mataKuliahId, mataKuliah.id))
      .where(and(eq(kurikulumMataKuliah.kurikulumId, kurikulumId), eq(kurikulumMataKuliah.semester, semester)));

    const created: { id: number; mataKuliahId: number; nama: string }[] = [];
    const skipped: { mataKuliahId: number; nama: string; reason: string }[] = [];

    for (const mk of mkList) {
      // Cek apakah RPS sudah ada
      const existingRps = await db.query.rps.findFirst({
        where: and(eq(rps.mataKuliahId, mk.mataKuliahId), eq(rps.periodeId, periodeId)),
      });

      if (existingRps) {
        skipped.push({ mataKuliahId: mk.mataKuliahId, nama: mk.nama, reason: 'RPS sudah ada' });
        continue;
      }

      const [newRps] = await db
        .insert(rps)
        .values({
          mataKuliahId: mk.mataKuliahId,
          periodeId,
        })
        .returning();

      created.push({ id: newRps.id, mataKuliahId: newRps.mataKuliahId, nama: mk.nama });
    }

    return {
      created,
      skipped,
    };
  }

  static async copyRps(sourceRpsId: number, targetPeriodeId: string, targetMataKuliahId: number) {
    return await db.transaction(async (tx) => {
      const source = await tx.query.rps.findFirst({
        where: eq(rps.id, sourceRpsId),
        with: { topik: true },
      });
      if (!source) throw new Error('RPS sumber tidak ditemukan');

      const existing = await tx.query.rps.findFirst({
        where: and(eq(rps.mataKuliahId, targetMataKuliahId), eq(rps.periodeId, targetPeriodeId)),
      });
      if (existing) throw new Error('RPS sudah ada untuk mata kuliah dan periode target');

      const [newRps] = await tx
        .insert(rps)
        .values({ mataKuliahId: targetMataKuliahId, periodeId: targetPeriodeId, deskripsi: source.deskripsi, cplProdi: source.cplProdi })
        .returning();

      if (source.topik.length > 0) {
        await tx.insert(rpsTopik).values(
          source.topik.map((t) => ({
            rpsId: newRps.id,
            pertemuanKe: t.pertemuanKe,
            topik: t.topik,
            subTopik: t.subTopik,
            metode: t.metode,
            cpmkId: t.cpmkId,
          })),
        );
      }

      const sourceEvals = await tx.query.rencanaEvaluasi.findMany({
        where: eq(rencanaEvaluasi.mataKuliahId, source.mataKuliahId),
      });
      const targetEvals = await tx.query.rencanaEvaluasi.findMany({
        where: eq(rencanaEvaluasi.mataKuliahId, targetMataKuliahId),
      });
      const targetEvalNames = new Set(targetEvals.map((e) => e.namaEvaluasi));
      const newEvals = sourceEvals.filter((e) => !targetEvalNames.has(e.namaEvaluasi));
      if (newEvals.length > 0) {
        await tx.insert(rencanaEvaluasi).values(
          newEvals.map((e) => ({
            mataKuliahId: targetMataKuliahId,
            namaEvaluasi: e.namaEvaluasi,
            bobotEvaluasi: e.bobotEvaluasi,
            deskripsi: e.deskripsi,
          })),
        );
      }

      return newRps;
    });
  }
}
