import { and, eq, ilike, inArray, or, type SQL, sql } from 'drizzle-orm';
import {
  cpmk,
  kurikulumMataKuliah,
  mataKuliah,
  mataKuliahBahanKajian,
  periodeAkademik,
  programStudi,
  rencanaEvaluasi,
  rencanaEvaluasiSubCpmk,
  rps,
  rpsTopik,
  subCpmk,
} from '../models/schema';
import { db } from '../utils/db';

export interface CreateRpsDto {
  mataKuliahId: number;
  periodeId: string;
  deskripsi?: string;
  cplProdi?: string;
  evaluasiDosen?: string;
}

export interface CreateRpsTopikDto {
  pertemuanKe: number;
  topik: string;
  subTopik?: string;
  metode?: string;
  cpmkId?: number;
  subCpmkId?: number;
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
            subCpmk: true,
          },
        },
        mataKuliah: true,
      },
    });

    if (!data) return null;

    // Fetch BK mappings for this mata kuliah
    const bkMappings = await db.query.mataKuliahBahanKajian.findMany({
      where: eq(mataKuliahBahanKajian.mataKuliahId, mataKuliahId),
      with: {
        bahanKajian: true,
      },
    });

    return { ...data, bahanKajian: bkMappings };
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

    const updateData: Record<string, unknown> = { ...data };
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

  static async copyRps(
    sourceRpsId: number,
    targetPeriodeId: string,
    targetMataKuliahId: number,
    options?: { copyCpmk?: boolean; copyRencanaEvaluasi?: boolean },
  ) {
    const copyCpmk = options?.copyCpmk ?? true;
    const copyRencanaEvaluasi = options?.copyRencanaEvaluasi ?? true;

    return await db.transaction(async (tx) => {
      const source = await tx.query.rps.findFirst({
        where: eq(rps.id, sourceRpsId),
        with: { topik: { with: { cpmk: true, subCpmk: true } } },
      });
      if (!source) throw new Error('RPS sumber tidak ditemukan');

      const existing = await tx.query.rps.findFirst({
        where: and(eq(rps.mataKuliahId, targetMataKuliahId), eq(rps.periodeId, targetPeriodeId)),
      });
      if (existing) throw new Error('RPS sudah ada untuk mata kuliah dan periode target');

      const [newRps] = await tx
        .insert(rps)
        .values({
          mataKuliahId: targetMataKuliahId,
          periodeId: targetPeriodeId,
          deskripsi: source.deskripsi,
          cplProdi: source.cplProdi,
        })
        .returning();

      // Penanganan relasi CPMK / Sub-CPMK untuk penyalinan lintas prodi (kode MK berbeda).
      const isCrossMk = source.mataKuliahId !== targetMataKuliahId;
      const cpmkMap = new Map<number, number>();
      const subCpmkMap = new Map<number, number>();

      if (isCrossMk && copyCpmk) {
        const targetCpmks = await tx.select().from(cpmk).where(eq(cpmk.mataKuliahId, targetMataKuliahId));
        if (targetCpmks.length === 0) {
          const sourceCpmks = await tx
            .select()
            .from(cpmk)
            .where(eq(cpmk.mataKuliahId, source.mataKuliahId))
            .orderBy(cpmk.id);
          for (const srcCpmk of sourceCpmks) {
            const [newCpmk] = await tx
              .insert(cpmk)
              .values({
                mataKuliahId: targetMataKuliahId,
                kode: srcCpmk.kode,
                deskripsi: srcCpmk.deskripsi,
                bobotMk: srcCpmk.bobotMk,
              })
              .returning();
            cpmkMap.set(srcCpmk.id, newCpmk.id);

            const sourceSubCpmks = await tx
              .select()
              .from(subCpmk)
              .where(eq(subCpmk.cpmkId, srcCpmk.id))
              .orderBy(subCpmk.urutan, subCpmk.id);
            for (const srcSub of sourceSubCpmks) {
              const [newSub] = await tx
                .insert(subCpmk)
                .values({
                  cpmkId: newCpmk.id,
                  kode: srcSub.kode,
                  deskripsi: srcSub.deskripsi,
                  urutan: srcSub.urutan,
                })
                .returning();
              subCpmkMap.set(srcSub.id, newSub.id);
            }
          }
        }
      }

      if (source.topik.length > 0) {
        await tx.insert(rpsTopik).values(
          source.topik.map((t) => {
            let cpmkId: number | null = t.cpmkId;
            let subCpmkId: number | null = t.subCpmkId;
            if (isCrossMk) {
              cpmkId = (t.cpmkId && cpmkMap.get(t.cpmkId)) || null;
              subCpmkId = (t.subCpmkId && subCpmkMap.get(t.subCpmkId)) || null;
            }
            return {
              rpsId: newRps.id,
              pertemuanKe: t.pertemuanKe,
              topik: t.topik,
              subTopik: t.subTopik,
              metode: t.metode,
              cpmkId,
              subCpmkId,
            };
          }),
        );
      }

      if (copyRencanaEvaluasi) {
        const sourceEvals = await tx.query.rencanaEvaluasi.findMany({
          where: eq(rencanaEvaluasi.mataKuliahId, source.mataKuliahId),
        });
        const targetEvals = await tx.query.rencanaEvaluasi.findMany({
          where: eq(rencanaEvaluasi.mataKuliahId, targetMataKuliahId),
        });
        const targetEvalNames = new Set(targetEvals.map((e) => e.namaEvaluasi));
        const newEvals = sourceEvals.filter((e) => !targetEvalNames.has(e.namaEvaluasi));

        for (const e of newEvals) {
          const [newEval] = await tx
            .insert(rencanaEvaluasi)
            .values({
              mataKuliahId: targetMataKuliahId,
              namaEvaluasi: e.namaEvaluasi,
              bobotEvaluasi: e.bobotEvaluasi,
              deskripsi: e.deskripsi,
            })
            .returning();

          // Petakan link Sub-CPMK evaluasi hanya bila CPMK/Sub-CPMK baru berhasil dibuat.
          if (isCrossMk && copyCpmk && subCpmkMap.size > 0) {
            const links = await tx
              .select()
              .from(rencanaEvaluasiSubCpmk)
              .where(eq(rencanaEvaluasiSubCpmk.rencanaEvaluasiId, e.id));
            const newLinks = links
              .map((l) => ({
                rencanaEvaluasiId: newEval.id,
                subCpmkId: subCpmkMap.get(l.subCpmkId),
                bobot: l.bobot,
              }))
              .filter(
                (l): l is { rencanaEvaluasiId: number; subCpmkId: number; bobot: string | null } => l.subCpmkId != null,
              );
            if (newLinks.length > 0) {
              await tx.insert(rencanaEvaluasiSubCpmk).values(newLinks);
            }
          }
        }
      }

      return newRps;
    });
  }

  static async getAvailableSources(filters: { search?: string; prodiId?: number; periodeId?: string }) {
    const conditions: SQL<unknown>[] = [sql`EXISTS (SELECT 1 FROM rps_topik rt WHERE rt.rps_id = rps.id)`];
    if (filters.search) {
      const orCondition = or(
        ilike(mataKuliah.kode, `%${filters.search}%`),
        ilike(mataKuliah.nama, `%${filters.search}%`),
      );
      if (orCondition) conditions.push(orCondition);
    }
    if (filters.prodiId) conditions.push(eq(mataKuliah.programStudiId, filters.prodiId));
    if (filters.periodeId) conditions.push(eq(rps.periodeId, filters.periodeId));

    const whereClause = and(...conditions);
    const rows = await db
      .select({
        id: rps.id,
        mataKuliahId: rps.mataKuliahId,
        kodeMataKuliah: mataKuliah.kode,
        namaMataKuliah: mataKuliah.nama,
        prodiNama: programStudi.nama,
        prodiId: mataKuliah.programStudiId,
        periodeId: rps.periodeId,
        periodeNama: periodeAkademik.nama,
        jumlahTopik: sql<number>`COUNT(${rpsTopik.id})`,
        deskripsi: rps.deskripsi,
      })
      .from(rps)
      .innerJoin(mataKuliah, eq(rps.mataKuliahId, mataKuliah.id))
      .leftJoin(programStudi, eq(mataKuliah.programStudiId, programStudi.id))
      .innerJoin(periodeAkademik, eq(rps.periodeId, periodeAkademik.id))
      .leftJoin(rpsTopik, eq(rpsTopik.rpsId, rps.id))
      .where(whereClause)
      .groupBy(
        rps.id,
        rps.mataKuliahId,
        rps.periodeId,
        rps.deskripsi,
        mataKuliah.kode,
        mataKuliah.nama,
        mataKuliah.programStudiId,
        programStudi.nama,
        periodeAkademik.nama,
      )
      .orderBy(mataKuliah.nama, rps.periodeId);

    return rows.map((r) => ({ ...r, jumlahTopik: Number(r.jumlahTopik) }));
  }

  static async getEvaluasiSubCpmk(evaluasiId: number) {
    return db.query.rencanaEvaluasiSubCpmk.findMany({
      where: eq(rencanaEvaluasiSubCpmk.rencanaEvaluasiId, evaluasiId),
      with: {
        subCpmk: {
          with: {
            cpmk: {
              with: { mataKuliah: true },
            },
          },
        },
      },
    });
  }

  static async attachEvaluasiSubCpmk(evaluasiId: number, data: { subCpmkId: number; bobot?: number | null }) {
    const [newData] = await db
      .insert(rencanaEvaluasiSubCpmk)
      .values({
        rencanaEvaluasiId: evaluasiId,
        ...data,
        bobot: data.bobot ? data.bobot.toString() : null,
      })
      .returning();
    return newData;
  }

  static async detachEvaluasiSubCpmk(evaluasiId: number, subCpmkId: number) {
    const [deleted] = await db
      .delete(rencanaEvaluasiSubCpmk)
      .where(
        and(eq(rencanaEvaluasiSubCpmk.rencanaEvaluasiId, evaluasiId), eq(rencanaEvaluasiSubCpmk.subCpmkId, subCpmkId)),
      )
      .returning();
    return deleted || null;
  }
}
