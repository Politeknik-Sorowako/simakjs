import { and, asc, eq, inArray } from 'drizzle-orm';
import {
  bap,
  bapTopik,
  cpmk,
  dosen,
  dosenPengajarKelas,
  kelasKuliah,
  periodeAkademik,
  presensi,
  rps,
  rpsTopik,
} from '../models/schema';
import { db } from '../utils/db';

export class BapService {
  static async getByKelas(kelasKuliahId: number) {
    const list = await db.select().from(bap).where(eq(bap.kelasKuliahId, kelasKuliahId));
    if (list.length === 0) return [];

    const bapIds = list.map((b) => b.id);
    const topiks = await db.select().from(bapTopik).where(inArray(bapTopik.bapId, bapIds));

    return list.map((b) => ({
      ...b,
      topikIds: topiks
        .filter((t) => t.bapId === b.id)
        .map((t) => t.topikId || t.cpmkId)
        .filter(Boolean),
      topikList: topiks.filter((t) => t.bapId === b.id),
    }));
  }

  static async getRpsTopikByKelas(kelasKuliahId: number) {
    // Find class to get mataKuliahId and periodeId
    const kelas = await db.query.kelasKuliah.findFirst({
      where: eq(kelasKuliah.id, kelasKuliahId),
    });
    if (!kelas) return [];

    // Find RPS associated with mataKuliahId and periodeId
    const matchedRps = await db.query.rps.findFirst({
      where: (rpsTable, { and }) =>
        and(eq(rpsTable.mataKuliahId, kelas.mataKuliahId), eq(rpsTable.periodeId, kelas.periodeId)),
    });
    if (!matchedRps) return [];

    // Return all topics under that RPS
    return await db.select().from(rpsTopik).where(eq(rpsTopik.rpsId, matchedRps.id)).orderBy(asc(rpsTopik.pertemuanKe));
  }

  static async getDosenByEmail(email: string) {
    const profile = await db.query.dosen.findFirst({ where: eq(dosen.email, email) });
    return profile || null;
  }

  static async getDosenById(id: number) {
    const profile = await db.query.dosen.findFirst({ where: eq(dosen.id, id) });
    return profile || null;
  }

  static async getFirstTeachingDosen(kelasKuliahId: number) {
    const pengajar = await db.query.dosenPengajarKelas.findFirst({
      where: eq(dosenPengajarKelas.kelasKuliahId, kelasKuliahId),
    });
    return pengajar || null;
  }

  static async getAnyDosen() {
    const anyDosen = await db.query.dosen.findFirst();
    return anyDosen || null;
  }

  static async create(data: {
    kelasKuliahId: number;
    tanggal: string;
    pertemuanKe: number;
    tema?: string | null;
    materi: string;
    catatan?: string | null;
    durasiMenit: number;
    cpmkId?: number | null;
    topikIds?: number[];
    dosenId: number;
  }) {
    const { topikIds, ...rawPayload } = data;

    const kelasId = Number(rawPayload.kelasKuliahId);
    const existingKelas = await db.query.kelasKuliah.findFirst({ where: eq(kelasKuliah.id, kelasId) });
    if (!existingKelas) {
      throw new Error(`Kelas Kuliah dengan ID ${kelasId} tidak ditemukan di sistem.`);
    }

    // Sanitize cpmkId
    let validCpmkId: number | null = null;
    if (rawPayload.cpmkId) {
      const cId = Number(rawPayload.cpmkId);
      if (!isNaN(cId) && cId > 0) {
        const existingCpmk = await db.query.cpmk.findFirst({ where: eq(cpmk.id, cId) });
        if (existingCpmk) {
          validCpmkId = existingCpmk.id;
        }
      }
    }

    // Auto-resolve fallback CPMK if validCpmkId is not provided
    if (!validCpmkId && existingKelas.mataKuliahId) {
      const defaultCpmk = await db.query.cpmk.findFirst({
        where: eq(cpmk.mataKuliahId, existingKelas.mataKuliahId),
      });
      if (defaultCpmk) {
        validCpmkId = defaultCpmk.id;
      } else if (!rawPayload.cpmkId) {
        throw new Error(
          `CPMK untuk mata kuliah "${existingKelas.mataKuliahId}" belum tersedia. Silakan buat CPMK terlebih dahulu.`,
        );
      }
    }

    // Sanitize dosenId
    let validDosenId: number | null = null;
    if (rawPayload.dosenId) {
      const dId = Number(rawPayload.dosenId);
      if (!isNaN(dId) && dId > 0) {
        const existingDosen = await db.query.dosen.findFirst({ where: eq(dosen.id, dId) });
        if (existingDosen) {
          validDosenId = existingDosen.id;
        }
      }
    }

    if (!validDosenId) {
      const teachingDosen = await this.getFirstTeachingDosen(kelasId);
      if (teachingDosen) {
        validDosenId = teachingDosen.dosenId;
      } else {
        const anyD = await this.getAnyDosen();
        if (anyD) {
          validDosenId = anyD.id;
        }
      }
    }

    if (!validDosenId) {
      throw new Error('Dosen pengajar atau profil dosen tidak ditemukan di sistem.');
    }

    // Auto-resolve pertemuanKe collision
    const existingBaps = await db.select({ p: bap.pertemuanKe }).from(bap).where(eq(bap.kelasKuliahId, kelasId));
    const existingPertemuanSet = new Set(existingBaps.map((b) => b.p));
    let targetPertemuan = Number(rawPayload.pertemuanKe) || 1;
    if (existingPertemuanSet.has(targetPertemuan)) {
      const maxP = Math.max(0, ...Array.from(existingPertemuanSet));
      targetPertemuan = maxP + 1;
    }

    const bapPayload: {
      kelasKuliahId: number;
      tanggal: string;
      pertemuanKe: number;
      tema?: string;
      materi: string;
      durasiMenit: number;
      dosenId: number;
      catatan?: string;
      cpmkId?: number;
    } = {
      kelasKuliahId: kelasId,
      tanggal: String(rawPayload.tanggal || new Date().toISOString().split('T')[0]),
      pertemuanKe: targetPertemuan,
      materi: String(rawPayload.materi || '').trim() || 'Materi Perkuliahan RPS',
      durasiMenit: Number(rawPayload.durasiMenit) || 100,
      dosenId: validDosenId,
    };

    if (rawPayload.tema && String(rawPayload.tema).trim() !== '') {
      bapPayload.tema = String(rawPayload.tema).trim();
    }

    if (rawPayload.catatan && String(rawPayload.catatan).trim() !== '') {
      bapPayload.catatan = String(rawPayload.catatan).trim();
    }

    if (validCpmkId) {
      bapPayload.cpmkId = validCpmkId;
    }

    const [newBap] = await db.insert(bap).values(bapPayload).returning();

    let savedTopikIds: number[] = [];
    if (topikIds && Array.isArray(topikIds) && topikIds.length > 0) {
      const numericTopikIds = topikIds.map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0);
      if (numericTopikIds.length > 0) {
        const validRpsTopiks = await db.select().from(rpsTopik).where(inArray(rpsTopik.id, numericTopikIds));
        savedTopikIds = validRpsTopiks.map((t) => t.id);

        if (savedTopikIds.length > 0) {
          await db.insert(bapTopik).values(
            savedTopikIds.map((topikId) => ({
              bapId: newBap.id,
              topikId,
              cpmkId: validCpmkId,
            })),
          );
        }
      }
    }
    return { ...newBap, topikIds: savedTopikIds };
  }

  static async update(
    id: number,
    data: Partial<{
      tanggal: string;
      pertemuanKe: number;
      materi: string;
      catatan?: string | null;
      durasiMenit: number;
      cpmkId?: number | null;
      topikIds?: number[];
      dosenId: number;
    }>,
  ) {
    const { topikIds, ...bapPayload } = data;

    // Validate cpmkId existence if provided
    if (bapPayload.cpmkId) {
      const existingCpmk = await db.query.cpmk.findFirst({ where: eq(cpmk.id, bapPayload.cpmkId) });
      if (!existingCpmk) {
        bapPayload.cpmkId = null;
      }
    }

    // Validate dosenId existence if provided
    if (bapPayload.dosenId) {
      const existingDosen = await db.query.dosen.findFirst({ where: eq(dosen.id, bapPayload.dosenId) });
      if (!existingDosen) {
        delete bapPayload.dosenId;
      }
    }

    const [updatedBap] = await db.update(bap).set(bapPayload).where(eq(bap.id, id)).returning();

    let savedTopikIds: number[] = [];
    if (topikIds !== undefined && updatedBap) {
      await db.delete(bapTopik).where(eq(bapTopik.bapId, id));
      if (topikIds.length > 0) {
        const validRpsTopiks = await db.select().from(rpsTopik).where(inArray(rpsTopik.id, topikIds));
        savedTopikIds = validRpsTopiks.map((t) => t.id);

        if (savedTopikIds.length > 0) {
          await db.insert(bapTopik).values(
            savedTopikIds.map((topikId) => ({
              bapId: id,
              topikId,
              cpmkId: updatedBap.cpmkId || null,
            })),
          );
        }
      }
    } else if (updatedBap) {
      const currentTopiks = await db.select().from(bapTopik).where(eq(bapTopik.bapId, id));
      savedTopikIds = currentTopiks.map((bt) => bt.topikId).filter(Boolean) as number[];
    }

    return updatedBap ? { ...updatedBap, topikIds: savedTopikIds } : null;
  }

  static async updateBapBulk(data: {
    bapId: number;
    tanggal: string;
    pertemuanIds: number[];
    tema?: string | null;
    materi: string;
    catatan?: string | null;
    durasiMenit: number;
    cpmkId?: number | null;
    topikIds?: number[];
    dosenId?: number;
  }) {
    const { bapId, pertemuanIds, topikIds, ...updates } = data;
    const primary = await db.query.bap.findFirst({ where: eq(bap.id, bapId) });
    if (!primary) {
      throw new Error('BAP tidak ditemukan.');
    }
    const targetDate = updates.tanggal;
    const pertemuanSet = new Set(pertemuanIds.filter((p) => !isNaN(Number(p)) && Number(p) > 0).map((p) => Number(p)));

    // Validate cpmkId if provided
    let validCpmkId: number | null | undefined = updates.cpmkId;
    if (updates.cpmkId) {
      const existingCpmk = await db.query.cpmk.findFirst({ where: eq(cpmk.id, updates.cpmkId) });
      if (!existingCpmk) {
        validCpmkId = null;
      }
    }
    const commonPayload: {
      tanggal: string;
      tema?: string;
      materi: string;
      durasiMenit: number;
      dosenId: number;
      catatan?: string;
      cpmkId?: number;
    } = {
      tanggal: targetDate,
      tema: updates.tema ?? undefined,
      materi: updates.materi,
      catatan: updates.catatan ?? undefined,
      durasiMenit: updates.durasiMenit,
      cpmkId: validCpmkId ?? undefined,
      dosenId: Number(updates.dosenId) || primary.dosenId,
    };

    const sameDateRows = await db
      .select({ id: bap.id, pertemuanKe: bap.pertemuanKe })
      .from(bap)
      .where(and(eq(bap.kelasKuliahId, primary.kelasKuliahId), eq(bap.tanggal, targetDate)));

    const primaryKept = sameDateRows.some((r) => r.id === bapId);
    if (primaryKept) {
      await db.update(bap).set(commonPayload).where(eq(bap.id, bapId));
      for (const row of sameDateRows) {
        if (row.id !== bapId && !pertemuanSet.has(Number(row.pertemuanKe))) {
          await db.delete(bap).where(eq(bap.id, row.id));
        }
      }
    } else {
      await db.delete(bap).where(eq(bap.id, bapId));
    }

    const afterDelete = await db
      .select({ pertemuanKe: bap.pertemuanKe })
      .from(bap)
      .where(and(eq(bap.kelasKuliahId, primary.kelasKuliahId), eq(bap.tanggal, targetDate)));
    const existingPertemuanSet = new Set(afterDelete.map((r) => Number(r.pertemuanKe)));

    if (existingPertemuanSet.size === 0 && pertemuanSet.size > 0) {
      const firstP = Number(Math.min(...Array.from(pertemuanSet)));
      const [created] = await db
        .insert(bap)
        .values({ ...commonPayload, pertemuanKe: firstP, kelasKuliahId: primary.kelasKuliahId })
        .returning();
      existingPertemuanSet.add(firstP);
    }

    for (const p of Array.from(pertemuanSet)) {
      if (!existingPertemuanSet.has(p)) {
        await db.insert(bap).values({
          ...commonPayload,
          pertemuanKe: p,
          kelasKuliahId: primary.kelasKuliahId,
        });
      }
    }

    // Sync topikIds across all same-date BAP records.
    if (topikIds !== undefined) {
      const updatedRows = await db
        .select({ id: bap.id })
        .from(bap)
        .where(and(eq(bap.kelasKuliahId, primary.kelasKuliahId), eq(bap.tanggal, targetDate)));
      for (const row of updatedRows) {
        await db.delete(bapTopik).where(eq(bapTopik.bapId, row.id));
      }
      const validRpsTopiks =
        topikIds.length > 0 ? await db.select().from(rpsTopik).where(inArray(rpsTopik.id, topikIds)) : [];
      const savedTopiks = validRpsTopiks.map((t) => t.id);
      if (savedTopiks.length > 0) {
        const values: { bapId: number; topikId: number; cpmkId: number | null }[] = [];
        for (const row of updatedRows) {
          for (const topikId of savedTopiks) {
            values.push({ bapId: row.id, topikId, cpmkId: validCpmkId ?? null });
          }
        }
        await db.insert(bapTopik).values(values);
      }
    }

    return await db
      .select()
      .from(bap)
      .where(and(eq(bap.kelasKuliahId, primary.kelasKuliahId), eq(bap.tanggal, targetDate)));
  }

  static async delete(id: number) {
    await db.delete(presensi).where(eq(presensi.bapId, id));
    await db.delete(bapTopik).where(eq(bapTopik.bapId, id));
    const [deleted] = await db.delete(bap).where(eq(bap.id, id)).returning();
    return deleted || null;
  }

  static async duplicateBap(sourceBapId: number, newPertemuanKe: number, newTanggal?: string) {
    const [sourceBap] = await db.select().from(bap).where(eq(bap.id, sourceBapId));
    if (!sourceBap) {
      throw new Error('BAP tidak ditemukan.');
    }

    const targetPertemuan = Number(newPertemuanKe);
    if (!targetPertemuan || targetPertemuan <= 0) {
      throw new Error('Nomor pertemuan tidak valid.');
    }

    const duplicateCheck = await db
      .select({ p: bap.pertemuanKe })
      .from(bap)
      .where(and(eq(bap.kelasKuliahId, sourceBap.kelasKuliahId), eq(bap.pertemuanKe, targetPertemuan)));
    if (duplicateCheck.length > 0) {
      throw new Error(`Pertemuan ${targetPertemuan} sudah ada untuk kelas ini. Masukkan nomor pertemuan yang lain.`);
    }

    const sourceTopiks = await db.select().from(bapTopik).where(eq(bapTopik.bapId, sourceBapId));
    const sourcePresensi = await db.select().from(presensi).where(eq(presensi.bapId, sourceBapId));

    const [newBap] = await db
      .insert(bap)
      .values({
        kelasKuliahId: sourceBap.kelasKuliahId,
        tanggal: newTanggal || sourceBap.tanggal,
        pertemuanKe: targetPertemuan,
        tema: sourceBap.tema,
        materi: sourceBap.materi,
        catatan: sourceBap.catatan,
        durasiMenit: sourceBap.durasiMenit,
        cpmkId: sourceBap.cpmkId,
        dosenId: sourceBap.dosenId,
      })
      .returning();

    if (sourceTopiks.length > 0) {
      await db.insert(bapTopik).values(
        sourceTopiks.map((t) => ({
          bapId: newBap.id,
          topikId: t.topikId,
          cpmkId: t.cpmkId,
        })),
      );
    }

    if (sourcePresensi.length > 0) {
      await db.insert(presensi).values(
        sourcePresensi.map((p) => ({
          bapId: newBap.id,
          mahasiswaId: p.mahasiswaId,
          status: p.status,
          durasiMangkir: p.durasiMangkir,
          keterangan: p.keterangan,
        })),
      );
    }

    return {
      ...newBap,
      topikIds: sourceTopiks.map((t) => t.topikId).filter(Boolean),
      presensiCount: sourcePresensi.length,
    };
  }

  static async getMonitoringRps(periodeId?: string | number, prodiId?: number) {
    try {
      let targetPeriodeId = periodeId ? String(periodeId) : undefined;

      if (!targetPeriodeId) {
        const [activePeriode] = await db.select().from(periodeAkademik).where(eq(periodeAkademik.aktif, true));
        targetPeriodeId = activePeriode?.id;
      }

      const kelasList = await db.query.kelasKuliah.findMany({
        where: targetPeriodeId ? eq(kelasKuliah.periodeId, targetPeriodeId) : undefined,
        with: {
          mataKuliah: {
            with: {
              programStudi: true,
            },
          },
          dosenPengajarKelas: {
            with: {
              dosen: true,
            },
          },
        },
      });

      const filteredKelas = prodiId ? kelasList.filter((k) => k.mataKuliah?.programStudiId === prodiId) : kelasList;

      if (filteredKelas.length === 0) {
        return [];
      }

      const kelasIds = filteredKelas.map((k) => k.id);
      const mataKuliahIds = Array.from(new Set(filteredKelas.map((k) => k.mataKuliahId)));

      // 1. Prefetch all RPS for target mataKuliahIds & periodeId
      let allRps: (typeof rps.$inferSelect)[] = [];
      try {
        if (mataKuliahIds.length > 0) {
          allRps = await db
            .select()
            .from(rps)
            .where(
              targetPeriodeId
                ? and(inArray(rps.mataKuliahId, mataKuliahIds), eq(rps.periodeId, targetPeriodeId))
                : inArray(rps.mataKuliahId, mataKuliahIds),
            );
        }
      } catch (err) {
        console.warn('[BapService] Failed bulk query rps:', err);
      }

      const rpsMap = new Map<number, typeof rps.$inferSelect>();
      for (const r of allRps) {
        rpsMap.set(r.mataKuliahId, r);
      }

      const rpsIds = allRps.map((r) => r.id);

      // 2. Prefetch all rpsTopik for target rpsIds
      let allRpsTopiks: (typeof rpsTopik.$inferSelect)[] = [];
      try {
        if (rpsIds.length > 0) {
          allRpsTopiks = await db.select().from(rpsTopik).where(inArray(rpsTopik.rpsId, rpsIds));
        }
      } catch (err) {
        console.warn('[BapService] Failed bulk query rpsTopik:', err);
      }

      const rpsTopiksMap = new Map<number, (typeof rpsTopik.$inferSelect)[]>();
      for (const t of allRpsTopiks) {
        const current = rpsTopiksMap.get(t.rpsId) || [];
        current.push(t);
        rpsTopiksMap.set(t.rpsId, current);
      }

      // 3. Prefetch all BAP for target kelasIds
      let allBap: (typeof bap.$inferSelect)[] = [];
      try {
        if (kelasIds.length > 0) {
          allBap = await db.select().from(bap).where(inArray(bap.kelasKuliahId, kelasIds));
        }
      } catch (err) {
        console.warn('[BapService] Failed bulk query bap:', err);
      }

      const bapMap = new Map<number, (typeof bap.$inferSelect)[]>();
      for (const b of allBap) {
        const current = bapMap.get(b.kelasKuliahId) || [];
        current.push(b);
        bapMap.set(b.kelasKuliahId, current);
      }

      const bapIds = allBap.map((b) => b.id);

      // 4. Prefetch all bapTopik for target bapIds
      let allBapTopiks: (typeof bapTopik.$inferSelect)[] = [];
      try {
        if (bapIds.length > 0) {
          allBapTopiks = await db.select().from(bapTopik).where(inArray(bapTopik.bapId, bapIds));
        }
      } catch (err) {
        console.warn('[BapService] Failed bulk query bapTopik:', err);
      }

      const bapToKelasMap = new Map<number, number>();
      for (const b of allBap) {
        bapToKelasMap.set(b.id, b.kelasKuliahId);
      }

      const coveredTopiksMap = new Map<number, Set<number>>();
      for (const bt of allBapTopiks) {
        if (!bt.topikId) continue;
        const targetKelasId = bapToKelasMap.get(bt.bapId);
        if (targetKelasId) {
          const currentSet = coveredTopiksMap.get(targetKelasId) || new Set<number>();
          currentSet.add(bt.topikId);
          coveredTopiksMap.set(targetKelasId, currentSet);
        }
      }

      // 5. Build output list cleanly with O(1) map lookups
      return filteredKelas.map((k) => {
        const matchedRps = rpsMap.get(k.mataKuliahId);
        const rpsTopiks = matchedRps ? rpsTopiksMap.get(matchedRps.id) || [] : [];
        const bapList = bapMap.get(k.id) || [];
        const coveredTopikIds = coveredTopiksMap.get(k.id) || new Set<number>();

        const totalTopikRps = rpsTopiks.length || 16;
        const topikDiajarkanCount = coveredTopikIds.size;
        const persentaseCapaian = Math.min(100, Math.round((topikDiajarkanCount / totalTopikRps) * 100));

        let status = 'BELUM_ADA_BAP';
        if (bapList.length > 0) {
          status = persentaseCapaian >= 80 ? 'SESUAI_TARGET' : 'BERJALAN';
        }

        return {
          kelasKuliahId: k.id,
          namaKelas: k.namaKelas,
          mataKuliahKode: k.mataKuliah?.kode || '-',
          mataKuliahNama: k.mataKuliah?.nama || '-',
          prodiNama: k.mataKuliah?.programStudi?.nama || '-',
          dosenPengajar: k.dosenPengajarKelas?.[0]?.dosen?.nama || 'Belum di-plot',
          totalTopikRps,
          topikDiajarkanCount,
          persentaseCapaian,
          totalBapRecorded: bapList.length,
          status,
        };
      });
    } catch (err: unknown) {
      console.error('[BapService] Error in getMonitoringRps:', {
        periodeId,
        prodiId,
        error: err instanceof Error ? err.message : err,
      });
      return [];
    }
  }

  static async getMonitoringRpsDetail(kelasKuliahId: number) {
    try {
      const k = await db.query.kelasKuliah.findFirst({
        where: eq(kelasKuliah.id, kelasKuliahId),
        with: {
          mataKuliah: {
            with: {
              programStudi: true,
            },
          },
          dosenPengajarKelas: {
            with: {
              dosen: true,
            },
          },
        },
      });

      if (!k) return null;

      let matchedRps: typeof rps.$inferSelect | undefined;
      try {
        matchedRps = await db.query.rps.findFirst({
          where: (rpsTable, { and }) =>
            and(eq(rpsTable.mataKuliahId, k.mataKuliahId), eq(rpsTable.periodeId, k.periodeId)),
        });
      } catch (err) {
        console.warn('[BapService] Failed to query rps in detail:', err);
      }

      let rpsTopiks: (typeof rpsTopik.$inferSelect)[] = [];
      if (matchedRps) {
        try {
          rpsTopiks = await db.select().from(rpsTopik).where(eq(rpsTopik.rpsId, matchedRps.id));
        } catch (err) {
          console.warn('[BapService] Failed to query rpsTopiks in detail:', err);
        }
      }

      let bapList: (typeof bap.$inferSelect)[] = [];
      try {
        bapList = await db.select().from(bap).where(eq(bap.kelasKuliahId, k.id));
      } catch (err) {
        console.warn('[BapService] Failed to query bap list in detail:', err);
      }

      const bapIds = bapList.map((b) => b.id);
      let bapTopikList: (typeof bapTopik.$inferSelect)[] = [];
      if (bapIds.length > 0) {
        try {
          bapTopikList = await db.select().from(bapTopik).where(inArray(bapTopik.bapId, bapIds));
        } catch (err) {
          console.warn('[BapService] Failed to query bapTopikList in detail:', err);
        }
      }

      const dosenList = await db.select().from(dosen);
      const dosenMap = new Map(dosenList.map((d) => [d.id, d.nama]));

      const matrix = rpsTopiks.map((t) => {
        const matchBapTopik = bapTopikList.find((bt) => bt.topikId === t.id);
        const parentBap = matchBapTopik ? bapList.find((b) => b.id === matchBapTopik.bapId) : null;

        return {
          topikId: t.id,
          pertemuanRps: t.pertemuanKe,
          topik: t.topik,
          subTopik: t.subTopik || null,
          diajarkan: !!matchBapTopik,
          bapInfo: parentBap
            ? {
                bapId: parentBap.id,
                tanggal: parentBap.tanggal,
                pertemuanKe: parentBap.pertemuanKe,
                dosenNama: dosenMap.get(parentBap.dosenId) || 'Dosen Pengampu',
              }
            : null,
        };
      });

      return {
        kelasKuliahId: k.id,
        namaKelas: k.namaKelas,
        mataKuliahKode: k.mataKuliah?.kode || '-',
        mataKuliahNama: k.mataKuliah?.nama || '-',
        prodiNama: k.mataKuliah?.programStudi?.nama || '-',
        dosenPengajar: k.dosenPengajarKelas?.[0]?.dosen?.nama || 'Belum di-plot',
        matrix,
      };
    } catch (err: unknown) {
      console.error('[BapService] Error in getMonitoringRpsDetail:', {
        kelasKuliahId,
        error: err instanceof Error ? err.message : err,
      });
      return null;
    }
  }
}
