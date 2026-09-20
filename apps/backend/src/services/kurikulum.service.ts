import { and, count, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { kurikulum, kurikulumMataKuliah, mataKuliah } from '../models/schema';
import { db } from '../utils/db';
import { SystemParameterService } from './system-parameter.service';

export interface CreateKurikulumDto {
  kode: string;
  nama: string;
  programStudiId: number;
  semesterMulai: string;
  jumlahSksLulus: number;
  jumlahSksWajib: number;
  jumlahSksPilihan: number;
  sistemBlok?: boolean;
  noSkDirektur?: string;
  tanggalSkDirektur?: string;
  isAktif?: boolean;
  idPddikti?: string;
}

export interface AddMataKuliahDto {
  mataKuliahId: number;
  semester: number;
  sksMataKuliah: number;
  sksTatapMuka?: number;
  sksPraktek?: number;
  sksPraktekLapangan?: number;
  sksSimulasi?: number;
  isWajib?: boolean;
}

export class KurikulumService {
  /**
   * Menghitung kepatuhan kurikulum terhadap aturan BPA sistem blok (Epic 1).
   * Bersifat warning saja (tidak memblokir operasi). Ambang SKS diambil dari
   * system_settings (SKS_MIN_D3/SKS_MIN_D4) agar dapat dikonfigurasi admin.
   */
  static async getCompliance(id: number) {
    const kur = await db.query.kurikulum.findFirst({
      where: eq(kurikulum.id, id),
      with: {
        programStudi: true,
        kurikulumMataKuliah: true,
      },
    });
    if (!kur) return null;

    const jenjang = kur.programStudi?.jenjang?.toUpperCase() ?? '';
    const totalSksRiil = kur.kurikulumMataKuliah.reduce((sum, kmk) => sum + (kmk.sksMataKuliah || 0), 0);
    const sksLulusTerdaftar = kur.jumlahSksLulus || 0;

    const isJenjangDipetakan = jenjang === 'D3' || jenjang === 'D4';
    let ambang = 0;
    if (isJenjangDipetakan) {
      const key = jenjang === 'D3' ? 'SKS_MIN_D3' : 'SKS_MIN_D4';
      ambang = await SystemParameterService.getNumber(key);
    }

    const kurang = isJenjangDipetakan ? Math.max(0, ambang - totalSksRiil) : 0;
    const lolos = isJenjangDipetakan ? totalSksRiil >= ambang : false;
    const adaSk = Boolean(kur.noSkDirektur?.trim());

    const warnings: string[] = [];
    if (!adaSk) warnings.push('Belum ada SK Direktur');
    if (isJenjangDipetakan && !lolos) {
      warnings.push(`Total SKS ${totalSksRiil} belum mencapai ambang BPA ${jenjang} (${ambang} SKS)`);
    }
    if (!isJenjangDipetakan)
      warnings.push(`Jenjang "${kur.programStudi?.jenjang ?? '-'}" tidak dipetakan ke ambang BPA`);

    return {
      jenjang,
      ambang: isJenjangDipetakan ? ambang : null,
      totalSksRiil,
      sksLulusTerdaftar,
      kurang,
      lolos,
      adaSk,
      sistemBlok: kur.sistemBlok,
      warnings,
    };
  }

  static async getAll(page = 1, limit = 10, search = '', prodiId?: number) {
    const offset = (page - 1) * limit;
    let whereClause = undefined;

    if (search) {
      whereClause = or(ilike(kurikulum.nama, `%${search}%`), ilike(kurikulum.kode, `%${search}%`));
    }

    if (prodiId) {
      if (whereClause) {
        whereClause = and(whereClause, eq(kurikulum.programStudiId, prodiId));
      } else {
        whereClause = eq(kurikulum.programStudiId, prodiId);
      }
    }

    const [totalResult] = await db.select({ total: count() }).from(kurikulum).where(whereClause);

    const total = totalResult?.total || 0;

    const data = await db.query.kurikulum.findMany({
      where: whereClause,
      limit,
      offset,
      with: {
        programStudi: true,
        semesterMulaiPeriode: true,
      },
    });

    const dataWithCompliance = await this.attachComplianceBatch(data);

    const totalPages = Math.ceil(total / limit);

    return {
      data: dataWithCompliance,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Melampirkan field compliance ke daftar kurikulum secara batch agar tidak
   * memicu N+1 query (satu kueri agregat untuk seluruh id).
   */
  private static async attachComplianceBatch<
    T extends {
      id: number;
      programStudi: { jenjang: string | null } | null;
      jumlahSksLulus: number | null;
      sistemBlok: boolean;
    },
  >(items: T[]) {
    if (items.length === 0) return items;
    const ids = items.map((k) => k.id);
    const sums = await db
      .select({
        kurikulumId: kurikulumMataKuliah.kurikulumId,
        total: sql<number>`COALESCE(SUM(${kurikulumMataKuliah.sksMataKuliah}), 0)`,
      })
      .from(kurikulumMataKuliah)
      .where(inArray(kurikulumMataKuliah.kurikulumId, ids))
      .groupBy(kurikulumMataKuliah.kurikulumId);
    const sumMap = new Map(sums.map((s) => [s.kurikulumId, Number(s.total)]));

    const ambangD3 = await SystemParameterService.getNumber('SKS_MIN_D3');
    const ambangD4 = await SystemParameterService.getNumber('SKS_MIN_D4');

    return items.map((k) => {
      const jenjang = k.programStudi?.jenjang?.toUpperCase() ?? '';
      const ambang = jenjang === 'D3' ? ambangD3 : jenjang === 'D4' ? ambangD4 : null;
      const totalSksRiil = sumMap.get(k.id) ?? 0;
      const adaSk = Boolean((k as { noSkDirektur?: string | null }).noSkDirektur?.trim());
      const lolos = ambang !== null ? totalSksRiil >= ambang : false;
      const kurang = ambang !== null ? Math.max(0, ambang - totalSksRiil) : 0;

      const warnings: string[] = [];
      if (!adaSk) warnings.push('Belum ada SK Direktur');
      if (ambang !== null && !lolos)
        warnings.push(`Total SKS ${totalSksRiil} belum mencapai ambang BPA ${jenjang} (${ambang} SKS)`);
      if (ambang === null) warnings.push(`Jenjang "${k.programStudi?.jenjang ?? '-'}" tidak dipetakan ke ambang BPA`);

      return {
        ...k,
        compliance: {
          jenjang,
          ambang,
          totalSksRiil,
          kurang,
          lolos,
          adaSk,
          sistemBlok: k.sistemBlok,
          warnings,
        },
      };
    });
  }

  static async getById(id: number) {
    const data = await db.query.kurikulum.findFirst({
      where: eq(kurikulum.id, id),
      with: {
        programStudi: true,
        semesterMulaiPeriode: true,
        kurikulumMataKuliah: {
          with: {
            mataKuliah: true,
          },
        },
      },
    });
    if (!data) return null;

    const [withCompliance] = await this.attachComplianceBatch([data]);
    return withCompliance || data;
  }

  static async create(data: CreateKurikulumDto) {
    return await db.transaction(async (tx) => {
      if (data.isAktif) {
        await tx.update(kurikulum).set({ isAktif: false }).where(eq(kurikulum.programStudiId, data.programStudiId));
      }
      const [newKur] = await tx.insert(kurikulum).values(data).returning();
      return newKur;
    });
  }

  static async update(id: number, data: Partial<CreateKurikulumDto>) {
    return await db.transaction(async (tx) => {
      if (data.isAktif) {
        const existing = await this.getById(id);
        if (existing) {
          await tx
            .update(kurikulum)
            .set({ isAktif: false })
            .where(eq(kurikulum.programStudiId, existing.programStudiId));
        }
      }
      const [updatedKur] = await tx.update(kurikulum).set(data).where(eq(kurikulum.id, id)).returning();
      return updatedKur || null;
    });
  }

  static async delete(id: number) {
    const [deletedKur] = await db.delete(kurikulum).where(eq(kurikulum.id, id)).returning();
    return deletedKur || null;
  }

  static async addMataKuliah(kurikulumId: number, data: AddMataKuliahDto) {
    const existing = await db.query.kurikulumMataKuliah.findFirst({
      where: and(
        eq(kurikulumMataKuliah.kurikulumId, kurikulumId),
        eq(kurikulumMataKuliah.mataKuliahId, data.mataKuliahId),
      ),
    });

    if (existing) {
      throw new Error('Mata kuliah sudah ada dalam kurikulum ini');
    }

    const mk = await db.query.mataKuliah.findFirst({
      where: eq(mataKuliah.id, data.mataKuliahId),
    });
    if (!mk) {
      throw new Error('Mata kuliah tidak ditemukan');
    }

    const kur = await db.query.kurikulum.findFirst({
      where: eq(kurikulum.id, kurikulumId),
    });
    if (!kur) {
      throw new Error('Kurikulum tidak ditemukan');
    }

    if (mk.programStudiId !== kur.programStudiId) {
      throw new Error('Mata kuliah harus dari program studi yang sama dengan kurikulum');
    }

    const [newKmk] = await db
      .insert(kurikulumMataKuliah)
      .values({
        kurikulumId,
        ...data,
      })
      .returning();
    return newKmk;
  }

  static async removeMataKuliah(kurikulumId: number, mataKuliahId: number) {
    const [deletedKmk] = await db
      .delete(kurikulumMataKuliah)
      .where(and(eq(kurikulumMataKuliah.kurikulumId, kurikulumId), eq(kurikulumMataKuliah.mataKuliahId, mataKuliahId)))
      .returning();
    return deletedKmk || null;
  }

  static async removeBatchMataKuliah(kurikulumId: number, mataKuliahIds: number[]) {
    if (!mataKuliahIds || mataKuliahIds.length === 0) {
      return { count: 0 };
    }
    const deletedRows = await db
      .delete(kurikulumMataKuliah)
      .where(
        and(eq(kurikulumMataKuliah.kurikulumId, kurikulumId), inArray(kurikulumMataKuliah.mataKuliahId, mataKuliahIds)),
      )
      .returning();
    return { count: deletedRows.length };
  }

  static async copyFromKurikulum(targetKurikulumId: number, sourceKurikulumId: number) {
    const source = await this.getById(sourceKurikulumId);
    if (!source) throw new Error('Kurikulum sumber tidak ditemukan');

    const target = await this.getById(targetKurikulumId);
    if (!target) throw new Error('Kurikulum target tidak ditemukan');

    if (source.programStudiId !== target.programStudiId) {
      throw new Error('Kurikulum sumber dan target harus dari program studi yang sama');
    }

    const existingSet = new Set(target.kurikulumMataKuliah.map((kmk) => kmk.mataKuliahId));
    const toInsert = source.kurikulumMataKuliah.filter((kmk) => !existingSet.has(kmk.mataKuliahId));

    if (toInsert.length === 0) {
      return {
        copied: 0,
        skipped: source.kurikulumMataKuliah.length,
        sourceKode: source.kode,
        sourceNama: source.nama,
      };
    }

    return await db.transaction(async (tx) => {
      await tx.insert(kurikulumMataKuliah).values(
        toInsert.map((kmk) => ({
          kurikulumId: targetKurikulumId,
          mataKuliahId: kmk.mataKuliahId,
          semester: kmk.semester,
          sksMataKuliah: kmk.sksMataKuliah,
          sksTatapMuka: kmk.sksTatapMuka,
          sksPraktek: kmk.sksPraktek,
          sksPraktekLapangan: kmk.sksPraktekLapangan,
          sksSimulasi: kmk.sksSimulasi,
          isWajib: kmk.isWajib,
        })),
      );
      return {
        copied: toInsert.length,
        skipped: source.kurikulumMataKuliah.length - toInsert.length,
        sourceKode: source.kode,
        sourceNama: source.nama,
      };
    });
  }

  static async importMkCsv(kurikulumId: number, csvText: string) {
    // Robust CSV parsing: handle BOM, CRLF
    const cleanText = csvText
      .replace(/^\uFEFF/, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
    const lines = cleanText.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV harus memiliki header dan minimal 1 baris data');

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const kodeIdx = headers.indexOf('kode_mata_kuliah');
    const semIdx = headers.indexOf('semester');
    const sksIdx = headers.indexOf('sks');
    const wajibIdx = headers.indexOf('is_wajib');

    if (kodeIdx === -1 || semIdx === -1) throw new Error('CSV harus memiliki kolom kode_mata_kuliah dan semester');

    const target = await this.getById(kurikulumId);
    if (!target) throw new Error('Kurikulum tidak ditemukan');

    const existingSet = new Set(target.kurikulumMataKuliah.map((kmk) => kmk.mataKuliahId));

    // Pre-fetch all MK codes in one query, scoped to kurikulum's prodi
    const allKodes = lines
      .slice(1)
      .map((l) => l.split(',')[kodeIdx]?.trim())
      .filter(Boolean);
    const uniqueKodes = [...new Set(allKodes)];
    const allMk = await db.query.mataKuliah.findMany({
      where: and(inArray(mataKuliah.kode, uniqueKodes), eq(mataKuliah.programStudiId, target.programStudiId)),
    });
    const mkMap = new Map(allMk.map((mk) => [mk.kode, mk]));

    const toInsert: (typeof kurikulumMataKuliah.$inferInsert)[] = [];
    const errors: { baris: number; pesan: string }[] = [];
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      const mkKode = cols[kodeIdx]?.trim();
      if (!mkKode) continue;

      const semester = parseInt(cols[semIdx]);
      if (isNaN(semester) || semester < 1) {
        errors.push({ baris: i + 1, pesan: `Semester tidak valid: "${cols[semIdx]}"` });
        continue;
      }

      const mk = mkMap.get(mkKode);
      if (!mk) {
        errors.push({ baris: i + 1, pesan: `Mata kuliah dengan kode "${mkKode}" tidak ditemukan` });
        continue;
      }

      if (existingSet.has(mk.id)) {
        skipped++;
        continue;
      }

      const sks = sksIdx !== -1 && cols[sksIdx] ? parseInt(cols[sksIdx]) : undefined;
      const isWajib = wajibIdx !== -1 ? cols[wajibIdx]?.toLowerCase() === 'true' || cols[wajibIdx] === '1' : true;

      toInsert.push({
        kurikulumId,
        mataKuliahId: mk.id,
        semester,
        sksMataKuliah: sks || mk.sksTotal,
        sksTatapMuka: mk.sksTatapMuka,
        sksPraktek: mk.sksPraktek,
        sksPraktekLapangan: mk.sksPraktekLapangan,
        sksSimulasi: mk.sksSimulasi,
        isWajib,
      });
      existingSet.add(mk.id);
    }

    let imported = 0;
    if (toInsert.length > 0) {
      await db.transaction(async (tx) => {
        await tx.insert(kurikulumMataKuliah).values(toInsert);
        imported = toInsert.length;
      });
    }

    return { imported, skipped, errors };
  }

  static async duplicate(id: number, kodeBaru: string, namaBaru: string) {
    const source = await this.getById(id);
    if (!source || !source.kurikulumMataKuliah) throw new Error('Kurikulum sumber tidak ditemukan');

    return await db.transaction(async (tx) => {
      const [newKur] = await tx
        .insert(kurikulum)
        .values({
          kode: kodeBaru,
          nama: namaBaru,
          programStudiId: source.programStudiId,
          semesterMulai: source.semesterMulai,
          jumlahSksLulus: source.jumlahSksLulus,
          jumlahSksWajib: source.jumlahSksWajib,
          jumlahSksPilihan: source.jumlahSksPilihan,
          sistemBlok: source.sistemBlok,
          noSkDirektur: source.noSkDirektur,
          tanggalSkDirektur: source.tanggalSkDirektur,
        })
        .returning();

      if (source.kurikulumMataKuliah.length > 0) {
        await tx.insert(kurikulumMataKuliah).values(
          source.kurikulumMataKuliah.map((kmk) => ({
            kurikulumId: newKur.id,
            mataKuliahId: kmk.mataKuliahId,
            semester: kmk.semester,
            sksMataKuliah: kmk.sksMataKuliah,
            sksTatapMuka: kmk.sksTatapMuka,
            sksPraktek: kmk.sksPraktek,
            sksPraktekLapangan: kmk.sksPraktekLapangan,
            sksSimulasi: kmk.sksSimulasi,
            isWajib: kmk.isWajib,
          })),
        );
      }

      return newKur;
    });
  }
}
