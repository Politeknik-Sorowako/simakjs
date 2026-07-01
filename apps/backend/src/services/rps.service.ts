import { db } from '../utils/db';
import { rps, rpsTopik, rencanaEvaluasi } from '../models/schema';
import { eq, and } from 'drizzle-orm';

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
      where: and(
        eq(rps.mataKuliahId, mataKuliahId),
        eq(rps.periodeId, periodeId)
      ),
      with: {
        topik: {
          with: {
            cpmk: true
          }
        }
      }
    });
    return data || null;
  }

  static async createRps(data: CreateRpsDto) {
    const [newRps] = await db.insert(rps).values(data).returning();
    return newRps;
  }

  static async updateRps(id: number, data: Partial<CreateRpsDto>) {
    const [updatedRps] = await db
      .update(rps)
      .set(data)
      .where(eq(rps.id, id))
      .returning();
    return updatedRps || null;
  }

  static async addTopik(rpsId: number, data: CreateRpsTopikDto) {
    const [newTopik] = await db
      .insert(rpsTopik)
      .values({
        rpsId,
        ...data
      })
      .returning();
    return newTopik;
  }

  static async updateTopik(topikId: number, data: Partial<CreateRpsTopikDto>) {
    const [updatedTopik] = await db
      .update(rpsTopik)
      .set(data)
      .where(eq(rpsTopik.id, topikId))
      .returning();
    return updatedTopik || null;
  }

  static async deleteTopik(topikId: number) {
    const [deletedTopik] = await db
      .delete(rpsTopik)
      .where(eq(rpsTopik.id, topikId))
      .returning();
    return deletedTopik || null;
  }

  static async getRencanaEvaluasi(mataKuliahId: number) {
    return db.query.rencanaEvaluasi.findMany({
      where: eq(rencanaEvaluasi.mataKuliahId, mataKuliahId)
    });
  }

  static async createRencanaEvaluasi(data: CreateRencanaEvaluasiDto) {
    const existing = await db.query.rencanaEvaluasi.findMany({
      where: eq(rencanaEvaluasi.mataKuliahId, data.mataKuliahId)
    });
    const currentTotal = existing.reduce((sum, item) => sum + parseFloat(item.bobotEvaluasi), 0);
    if (currentTotal + data.bobotEvaluasi > 100) {
      throw new Error('Total bobot rencana evaluasi tidak boleh melebihi 100%');
    }

    const [newEval] = await db.insert(rencanaEvaluasi).values({
      ...data,
      bobotEvaluasi: data.bobotEvaluasi.toString()
    }).returning();
    return newEval;
  }

  static async updateRencanaEvaluasi(id: number, data: Partial<CreateRencanaEvaluasiDto>) {
    const currentEval = await db.query.rencanaEvaluasi.findFirst({
      where: eq(rencanaEvaluasi.id, id)
    });
    if (!currentEval) return null;

    const mkId = data.mataKuliahId ?? currentEval.mataKuliahId;
    const newBobot = data.bobotEvaluasi !== undefined ? data.bobotEvaluasi : parseFloat(currentEval.bobotEvaluasi);

    const existing = await db.query.rencanaEvaluasi.findMany({
      where: eq(rencanaEvaluasi.mataKuliahId, mkId)
    });
    const currentTotal = existing
      .filter(item => item.id !== id)
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
    const [deletedEval] = await db
      .delete(rencanaEvaluasi)
      .where(eq(rencanaEvaluasi.id, id))
      .returning();
    return deletedEval || null;
  }
}
