import { eq, inArray } from 'drizzle-orm';
import {
  bap,
  bapTopik,
  cpmk,
  dosen,
  dosenPengajarKelas,
  kelasKuliah,
  periodeAkademik,
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
    return await db.select().from(rpsTopik).where(eq(rpsTopik.rpsId, matchedRps.id));
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
      } else {
        const [newCpmk] = await db
          .insert(cpmk)
          .values({
            mataKuliahId: existingKelas.mataKuliahId,
            kode: 'CPMK-1',
            deskripsi: 'CPMK Umum Mata Kuliah',
          })
          .returning();
        validCpmkId = newCpmk.id;
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

      const result = [];
      for (const k of kelasList) {
        if (prodiId && k.mataKuliah?.programStudiId !== prodiId) continue;

        let matchedRps: typeof rps.$inferSelect | undefined;
        try {
          matchedRps = await db.query.rps.findFirst({
            where: (rpsTable, { and }) =>
              and(eq(rpsTable.mataKuliahId, k.mataKuliahId), eq(rpsTable.periodeId, k.periodeId)),
          });
        } catch (err) {
          console.warn('[BapService] Failed to query rps for class:', k.id, err);
        }

        let rpsTopiks: (typeof rpsTopik.$inferSelect)[] = [];
        if (matchedRps) {
          try {
            rpsTopiks = await db.select().from(rpsTopik).where(eq(rpsTopik.rpsId, matchedRps.id));
          } catch (err) {
            console.warn('[BapService] Failed to query rpsTopik:', err);
          }
        }

        let bapList: (typeof bap.$inferSelect)[] = [];
        try {
          bapList = await db.select().from(bap).where(eq(bap.kelasKuliahId, k.id));
        } catch (err) {
          console.warn('[BapService] Failed to query bap list:', err);
        }

        const bapIds = bapList.map((b) => b.id);
        let coveredTopikIds = new Set<number>();
        if (bapIds.length > 0) {
          try {
            const bapTopikList = await db.select().from(bapTopik).where(inArray(bapTopik.bapId, bapIds));
            coveredTopikIds = new Set(bapTopikList.map((bt) => bt.topikId).filter(Boolean) as number[]);
          } catch (err) {
            console.warn('[BapService] Failed to query bapTopik list:', err);
          }
        }

        const totalTopikRps = rpsTopiks.length || 16;
        const topikDiajarkanCount = coveredTopikIds.size;
        const persentaseCapaian = Math.min(100, Math.round((topikDiajarkanCount / totalTopikRps) * 100));

        let status = 'BELUM_ADA_BAP';
        if (bapList.length > 0) {
          status = persentaseCapaian >= 80 ? 'SESUAI_TARGET' : 'BERJALAN';
        }

        result.push({
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
        });
      }

      return result;
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
