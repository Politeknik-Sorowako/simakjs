import { and, eq, inArray, isNull } from 'drizzle-orm';
import {
  angkatanKurikulum,
  capaianCpl,
  cpl,
  cplMataKuliah,
  kelasKuliah,
  krs,
  kurikulum,
  kurikulumMataKuliah,
  mahasiswa,
  periodeAkademik,
} from '../models/schema';
import { db } from '../utils/db';

export class CapaianCplService {
  static async getByMahasiswa(mahasiswaId: number) {
    return db.query.capaianCpl.findMany({
      where: eq(capaianCpl.mahasiswaId, mahasiswaId),
      with: {
        cpl: { columns: { id: true, kode: true, deskripsi: true } },
        kurikulum: { columns: { id: true, kode: true, nama: true } },
        periode: { columns: { id: true, nama: true } },
      },
      orderBy: capaianCpl.createdAt,
    });
  }

  static async getRekap(kurikulumId?: number, periodeId?: string) {
    const conditions = [];
    if (kurikulumId) conditions.push(eq(capaianCpl.kurikulumId, kurikulumId));
    if (periodeId) conditions.push(eq(capaianCpl.periodeId, periodeId));

    const capaian = await db.query.capaianCpl.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        cpl: { columns: { id: true, kode: true, deskripsi: true } },
        mahasiswa: { columns: { id: true, nim: true, nama: true } },
      },
    });

    const cplMap = new Map<number, { cpl: any; scores: number[] }>();
    for (const c of capaian) {
      const key = c.cplId;
      if (!cplMap.has(key)) {
        cplMap.set(key, { cpl: c.cpl, scores: [] });
      }
      cplMap.get(key)!.scores.push(parseFloat(c.nilai));
    }

    const rekap = [];
    for (const [cplId, data] of cplMap) {
      const avg = data.scores.reduce((s, v) => s + v, 0) / data.scores.length;
      const predikat = CapaianCplService.getPredikat(avg);
      rekap.push({
        cplId,
        kode: data.cpl.kode,
        deskripsi: data.cpl.deskripsi,
        rataRata: parseFloat(avg.toFixed(2)),
        predikat,
        jumlahMahasiswa: data.scores.length,
      });
    }

    return rekap;
  }

  static async hitungBatch(kurikulumId: number, periodeId?: string) {
    const kur = await db.query.kurikulum.findFirst({
      where: eq(kurikulum.id, kurikulumId),
    });
    if (!kur) throw new Error('Kurikulum tidak ditemukan');

    // Get all MK in this kurikulum
    const kmkList = await db.query.kurikulumMataKuliah.findMany({
      where: eq(kurikulumMataKuliah.kurikulumId, kurikulumId),
    });
    const mkIds = kmkList.map((k) => k.mataKuliahId);

    // Get all CPL for this prodi
    const cplList = await db.query.cpl.findMany({
      where: eq(cpl.programStudiId, kur.programStudiId),
    });
    const cplIds = cplList.map((c) => c.id);

    // Get CPL-MK mappings
    const cplMkMappings = await db.query.cplMataKuliah.findMany({
      where: and(inArray(cplMataKuliah.cplId, cplIds), inArray(cplMataKuliah.mataKuliahId, mkIds)),
    });

    // Get mahasiswa in this kurikulum (via angkatan)
    const angkatanKur = await db.query.angkatanKurikulum.findMany({
      where: and(
        eq(angkatanKurikulum.kurikulumId, kurikulumId),
        eq(angkatanKurikulum.programStudiId, kur.programStudiId),
      ),
    });
    const angkatanList = angkatanKur.map((a) => a.angkatan);

    if (angkatanList.length === 0) {
      throw new Error('Tidak ada angkatan yang terikat dengan kurikulum ini');
    }

    const mhsList = await db.query.mahasiswa.findMany({
      where: and(eq(mahasiswa.programStudiId, kur.programStudiId), inArray(mahasiswa.angkatan, angkatanList)),
    });

    return await db.transaction(async (tx) => {
      const results = [];

      for (const mhs of mhsList) {
        // Get all KRS for this mahasiswa in the given periode
        const krsConditions = [eq(krs.mahasiswaId, mhs.id)];
        if (periodeId) {
          // Join with kelas_kuliah to filter by periode
          const kelasList = await tx.query.kelasKuliah.findMany({
            where: eq(kelasKuliah.periodeId, periodeId),
            columns: { id: true },
          });
          const kelasIds = kelasList.map((k) => k.id);
          if (kelasIds.length > 0) {
            krsConditions.push(inArray(krs.kelasKuliahId, kelasIds));
          }
        }

        const krsRecords = await tx.query.krs.findMany({
          where: krsConditions.length > 0 ? and(...krsConditions) : undefined,
          with: {
            kelasKuliah: {
              columns: { id: true, periodeId: true },
              with: { mataKuliah: { columns: { id: true, kode: true, nama: true } } },
            },
          },
        });

        // Calculate NA_CPL for each CPL
        for (const cplItem of cplList) {
          // Get MK that contribute to this CPL
          const mkForCpl = cplMkMappings
            .filter((m) => m.cplId === cplItem.id)
            .map((m) => ({
              mataKuliahId: m.mataKuliahId,
              bobot: parseFloat(m.bobot || '0'),
            }));

          if (mkForCpl.length === 0) continue;

          // Get NA_MK for each MK from KRS
          let totalWeightedScore = 0;
          let totalWeight = 0;

          for (const mkBobot of mkForCpl) {
            const krsForMk = krsRecords.find(
              (k) => k.kelasKuliah?.mataKuliah?.id === mkBobot.mataKuliahId && k.nilaiAngka !== null,
            );
            if (krsForMk && krsForMk.nilaiAngka) {
              const naMk = parseFloat(krsForMk.nilaiAngka);
              totalWeightedScore += naMk * mkBobot.bobot;
              totalWeight += mkBobot.bobot;
            }
          }

          if (totalWeight === 0) continue;

          const naCpl = parseFloat((totalWeightedScore / totalWeight).toFixed(2));
          const predikat = CapaianCplService.getPredikat(naCpl);

          // Upsert capaian_cpl
          const conditions = [
            eq(capaianCpl.mahasiswaId, mhs.id),
            eq(capaianCpl.cplId, cplItem.id),
            eq(capaianCpl.kurikulumId, kurikulumId),
          ];
          if (periodeId) {
            conditions.push(eq(capaianCpl.periodeId, periodeId));
          } else {
            conditions.push(isNull(capaianCpl.periodeId));
          }

          const existing = await tx.query.capaianCpl.findFirst({
            where: and(...conditions),
          });

          if (existing) {
            const [updated] = await tx
              .update(capaianCpl)
              .set({
                nilai: naCpl.toString(),
                predikat,
                updatedAt: new Date(),
              })
              .where(eq(capaianCpl.id, existing.id))
              .returning();
            results.push(updated);
          } else {
            const [created] = await tx
              .insert(capaianCpl)
              .values({
                mahasiswaId: mhs.id,
                cplId: cplItem.id,
                kurikulumId,
                periodeId: periodeId || null,
                nilai: naCpl.toString(),
                predikat,
              })
              .returning();
            results.push(created);
          }
        }
      }

      return results;
    });
  }

  static getPredikat(nilai: number): string {
    if (nilai >= 85) return 'SB';
    if (nilai >= 70) return 'B';
    if (nilai >= 55) return 'C';
    if (nilai >= 40) return 'K';
    return 'SK';
  }
}
