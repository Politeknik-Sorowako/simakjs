import { and, count, eq, ilike, inArray, or, type SQL, sql } from 'drizzle-orm';
import {
  angkatanKurikulum,
  dosen,
  kelasKuliah,
  krs,
  kurikulum,
  kurikulumMataKuliah,
  mahasiswa,
  mataKuliah,
} from '../models/schema';
import { db } from '../utils/db';

type BulkCreateResult = { createdCount: number; skippedCount: number; totalProcessed: number };

export interface CreateKrsDto {
  mahasiswaId: number;
  kelasKuliahId: number;
  nilaiAngka?: number | string;
  nilaiHuruf?: string;
  nilaiIndeks?: number | string;
  idPddikti?: string;
}

export class KrsService {
  static async bulkCreate(
    mahasiswaIds: number[],
    kelasKuliahIds: number[],
    isApproved = false,
  ): Promise<BulkCreateResult> {
    const totalProcessed = mahasiswaIds.length * kelasKuliahIds.length;

    if (totalProcessed === 0) {
      return { createdCount: 0, skippedCount: 0, totalProcessed: 0 };
    }

    return await db.transaction(async (tx) => {
      const existingPairs = await tx
        .select({ mahasiswaId: krs.mahasiswaId, kelasKuliahId: krs.kelasKuliahId })
        .from(krs)
        .where(and(inArray(krs.mahasiswaId, mahasiswaIds), inArray(krs.kelasKuliahId, kelasKuliahIds)));

      const existingSet = new Set(existingPairs.map((p) => `${p.mahasiswaId}-${p.kelasKuliahId}`));

      const newRows: { mahasiswaId: number; kelasKuliahId: number; isApproved: boolean }[] = [];
      let skippedCount = 0;

      for (const mId of mahasiswaIds) {
        for (const kId of kelasKuliahIds) {
          if (existingSet.has(`${mId}-${kId}`)) {
            skippedCount++;
          } else {
            newRows.push({ mahasiswaId: mId, kelasKuliahId: kId, isApproved });
            existingSet.add(`${mId}-${kId}`);
          }
        }
      }

      if (newRows.length > 0) {
        await tx.insert(krs).values(newRows).onConflictDoNothing();
      }

      return {
        createdCount: newRows.length,
        skippedCount,
        totalProcessed,
      };
    });
  }

  static async getAll(
    page = 1,
    limit = 10,
    search = '',
    mahasiswaId?: number,
    dosenPaId?: number,
    kelasKuliahId?: number,
  ) {
    const offset = (page - 1) * limit;

    const searchConditions: SQL<unknown>[] = [];
    if (search) {
      const orCondition = or(ilike(mahasiswa.nama, `%${search}%`), ilike(mahasiswa.nim, `%${search}%`));
      if (orCondition) searchConditions.push(orCondition);
    }
    if (mahasiswaId !== undefined) {
      searchConditions.push(eq(krs.mahasiswaId, mahasiswaId));
    }
    if (dosenPaId !== undefined) {
      searchConditions.push(eq(mahasiswa.dosenPaId, dosenPaId));
    }
    if (kelasKuliahId !== undefined) {
      searchConditions.push(eq(krs.kelasKuliahId, kelasKuliahId));
    }

    const whereClause = searchConditions.length > 0 ? and(...searchConditions) : undefined;

    const [totalResult] = await db
      .select({ total: count() })
      .from(krs)
      .leftJoin(mahasiswa, eq(krs.mahasiswaId, mahasiswa.id))
      .where(whereClause);

    const total = totalResult?.total || 0;

    const rows = await db
      .select({
        id: krs.id,
        mahasiswaId: krs.mahasiswaId,
        kelasKuliahId: krs.kelasKuliahId,
        nilaiAngka: krs.nilaiAngka,
        nilaiHuruf: krs.nilaiHuruf,
        nilaiIndeks: krs.nilaiIndeks,
        isApproved: krs.isApproved,
        approvedById: krs.approvedById,
        approvedAt: krs.approvedAt,
        idPddikti: krs.idPddikti,
        isSynced: krs.isSynced,
        lastSyncAt: krs.lastSyncAt,
        createdAt: krs.createdAt,
        updatedAt: krs.updatedAt,
        mahasiswa: {
          id: mahasiswa.id,
          nim: mahasiswa.nim,
          nama: mahasiswa.nama,
          email: mahasiswa.email,
          status: mahasiswa.status,
        },
        kelasKuliah: {
          id: kelasKuliah.id,
          namaKelas: kelasKuliah.namaKelas,
          periodeId: kelasKuliah.periodeId,
        },
        approvedBy: {
          id: dosen.id,
          nip: dosen.nip,
          nama: dosen.nama,
        },
      })
      .from(krs)
      .leftJoin(mahasiswa, eq(krs.mahasiswaId, mahasiswa.id))
      .leftJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
      .leftJoin(dosen, eq(krs.approvedById, dosen.id))
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
        id: krs.id,
        mahasiswaId: krs.mahasiswaId,
        kelasKuliahId: krs.kelasKuliahId,
        nilaiAngka: krs.nilaiAngka,
        nilaiHuruf: krs.nilaiHuruf,
        nilaiIndeks: krs.nilaiIndeks,
        isApproved: krs.isApproved,
        approvedById: krs.approvedById,
        approvedAt: krs.approvedAt,
        idPddikti: krs.idPddikti,
        isSynced: krs.isSynced,
        lastSyncAt: krs.lastSyncAt,
        createdAt: krs.createdAt,
        updatedAt: krs.updatedAt,
      })
      .from(krs)
      .where(eq(krs.id, id));

    return row || null;
  }

  static async create(data: CreateKrsDto) {
    const student = await db.query.mahasiswa.findFirst({
      where: eq(mahasiswa.id, data.mahasiswaId),
    });

    if (!student) {
      throw new Error('Mahasiswa tidak ditemukan.');
    }

    if (student.status !== 'aktif') {
      throw new Error('Mahasiswa tidak berstatus aktif. Silakan selesaikan pembayaran SPP/UKT terlebih dahulu.');
    }

    const existingKrs = await db.query.krs.findFirst({
      where: and(eq(krs.mahasiswaId, data.mahasiswaId), eq(krs.kelasKuliahId, data.kelasKuliahId)),
    });

    if (existingKrs) {
      throw new Error('Mahasiswa sudah terdaftar di kelas kuliah ini (duplikat KRS tidak diperbolehkan).');
    }

    // biome-ignore lint/suspicious/noExplicitAny: Drizzle dynamic insert type
    const insertData: any = {
      mahasiswaId: data.mahasiswaId,
      kelasKuliahId: data.kelasKuliahId,
      nilaiHuruf: data.nilaiHuruf,
      idPddikti: data.idPddikti,
      isApproved: false,
    };
    if (data.nilaiAngka !== undefined) insertData.nilaiAngka = String(data.nilaiAngka);
    if (data.nilaiIndeks !== undefined) insertData.nilaiIndeks = String(data.nilaiIndeks);

    const [newKrs] = await db.insert(krs).values(insertData).returning();
    return newKrs;
  }

  static async approveKrs(mahasiswaId: number | undefined | null, periodeId: string, approvedByEmail: string) {
    const dosenRecord = await db.query.dosen.findFirst({
      where: eq(dosen.email, approvedByEmail),
    });

    const classes = await db
      .select({ id: kelasKuliah.id })
      .from(kelasKuliah)
      .where(eq(kelasKuliah.periodeId, periodeId));

    if (classes.length === 0) {
      return [];
    }

    const classIds = classes.map((c) => c.id);

    const conditions = [inArray(krs.kelasKuliahId, classIds)];
    if (mahasiswaId) {
      conditions.push(eq(krs.mahasiswaId, mahasiswaId));
    }

    const updated = await db
      .update(krs)
      .set({
        isApproved: true,
        approvedById: dosenRecord ? dosenRecord.id : null,
        approvedAt: new Date(),
      })
      .where(and(...conditions))
      .returning();

    return updated;
  }

  static async update(id: number, data: Partial<CreateKrsDto>) {
    // biome-ignore lint/suspicious/noExplicitAny: Drizzle dynamic update type
    const updateData: any = { ...data };
    if (data.nilaiAngka !== undefined) updateData.nilaiAngka = String(data.nilaiAngka);
    if (data.nilaiIndeks !== undefined) updateData.nilaiIndeks = String(data.nilaiIndeks);

    const [updatedKrs] = await db.update(krs).set(updateData).where(eq(krs.id, id)).returning();
    return updatedKrs || null;
  }

  static async delete(id: number) {
    const [deletedKrs] = await db.delete(krs).where(eq(krs.id, id)).returning();
    return deletedKrs || null;
  }

  static async getPendingStudents(periodeId: string, dosenPaId?: number) {
    const conditions = [eq(kelasKuliah.periodeId, periodeId), eq(krs.isApproved, false)];
    if (dosenPaId !== undefined) {
      conditions.push(eq(mahasiswa.dosenPaId, dosenPaId));
    }

    return await db
      .selectDistinct({
        id: mahasiswa.id,
        nim: mahasiswa.nim,
        nama: mahasiswa.nama,
        email: mahasiswa.email,
        status: mahasiswa.status,
      })
      .from(mahasiswa)
      .innerJoin(krs, eq(mahasiswa.id, krs.mahasiswaId))
      .innerJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
      .where(and(...conditions));
  }

  static async approveBatchKrs(mahasiswaIds: number[], periodeId: string, approvedByEmail: string) {
    const dosenRecord = await db.query.dosen.findFirst({
      where: eq(dosen.email, approvedByEmail),
    });

    const classes = await db
      .select({ id: kelasKuliah.id })
      .from(kelasKuliah)
      .where(eq(kelasKuliah.periodeId, periodeId));

    if (classes.length === 0 || mahasiswaIds.length === 0) {
      return [];
    }

    const classIds = classes.map((c) => c.id);

    return await db
      .update(krs)
      .set({
        isApproved: true,
        approvedById: dosenRecord ? dosenRecord.id : null,
        approvedAt: new Date(),
      })
      .where(and(inArray(krs.mahasiswaId, mahasiswaIds), inArray(krs.kelasKuliahId, classIds)))
      .returning();
  }

  static async getRencanaStudi(mahasiswaId: number) {
    const mhs = await db.query.mahasiswa.findFirst({
      where: eq(mahasiswa.id, mahasiswaId),
    });
    if (!mhs) return null;

    const binding = await db.query.angkatanKurikulum.findFirst({
      where: and(
        eq(angkatanKurikulum.programStudiId, mhs.programStudiId as number),
        eq(angkatanKurikulum.angkatan, mhs.angkatan || ''),
        eq(angkatanKurikulum.isActive, true),
      ),
    });
    if (!binding) return null;

    const kurikulumData = await db.query.kurikulum.findFirst({
      where: eq(kurikulum.id, binding.kurikulumId),
      with: {
        kurikulumMataKuliah: {
          with: {
            mataKuliah: true,
          },
          orderBy: (kmk, { asc }) => [asc(kmk.semester)],
        },
      },
    });
    if (!kurikulumData) return null;

    // Ambil semua KRS mahasiswa yang sudah ada (sudah approve + nilai)
    const krsMahasiswa = await db
      .select({
        id: krs.id,
        kelasKuliahId: krs.kelasKuliahId,
        mataKuliahId: kelasKuliah.mataKuliahId,
        nilaiAngka: krs.nilaiAngka,
        nilaiHuruf: krs.nilaiHuruf,
        isApproved: krs.isApproved,
        periodeId: kelasKuliah.periodeId,
      })
      .from(krs)
      .innerJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
      .where(eq(krs.mahasiswaId, mahasiswaId));

    const mkMap = new Map<number, { nilaiHuruf: string | null; isApproved: boolean; periodeId: string }[]>();
    for (const k of krsMahasiswa) {
      const arr = mkMap.get(k.mataKuliahId) || [];
      arr.push({ nilaiHuruf: k.nilaiHuruf, isApproved: k.isApproved, periodeId: k.periodeId });
      mkMap.set(k.mataKuliahId, arr);
    }

    const rencanaPerSemester = kurikulumData.kurikulumMataKuliah.reduce(
      (acc, kmk) => {
        const semester = kmk.semester;
        if (!acc[semester]) acc[semester] = [];
        const krsData = mkMap.get(kmk.mataKuliahId) || [];
        const lulus = krsData.some((k) => k.nilaiHuruf && k.nilaiHuruf !== 'E' && k.nilaiHuruf !== '');
        const diambil = krsData.some((k) => k.isApproved);
        acc[semester].push({
          id: kmk.id,
          mataKuliahId: kmk.mataKuliahId,
          kode: kmk.mataKuliah?.kode || '',
          nama: kmk.mataKuliah?.nama || '',
          sks: kmk.sksMataKuliah,
          isWajib: kmk.isWajib,
          status: lulus ? 'lulus' : diambil ? 'diambil' : 'tersedia',
          nilaiHuruf: lulus ? krsData.find((k) => k.nilaiHuruf)?.nilaiHuruf || null : null,
        });
        return acc;
      },
      {} as Record<
        number,
        {
          id: number;
          mataKuliahId: number;
          kode: string;
          nama: string;
          sks: number;
          isWajib: boolean;
          status: string;
          nilaiHuruf: string | null;
        }[]
      >,
    );

    const totalSksLulus = Object.values(rencanaPerSemester)
      .flat()
      .filter((mk) => mk.status === 'lulus')
      .reduce((sum, mk) => sum + mk.sks, 0);

    // Tentukan current semester
    const sksPerSemester = 24; // asumsi maks SKS per semester
    const currentSemester = Math.min(
      Math.floor(totalSksLulus / sksPerSemester) + 1,
      Object.keys(rencanaPerSemester).length,
    );

    return {
      kurikulum: {
        id: kurikulumData.id,
        kode: kurikulumData.kode,
        nama: kurikulumData.nama,
      },
      currentSemester,
      totalSksLulus,
      rencanaPerSemester: Object.entries(rencanaPerSemester).map(([sem, mk]) => ({
        semester: parseInt(sem),
        mataKuliah: mk,
        totalSks: mk.reduce((sum, m) => sum + m.sks, 0),
        sksLulus: mk.filter((m) => m.status === 'lulus').reduce((sum, m) => sum + m.sks, 0),
      })),
    };
  }

  static async getStats(periodeId?: string) {
    const conditions: SQL<unknown>[] = [];
    if (periodeId) conditions.push(eq(kelasKuliah.periodeId, periodeId));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [total] = await db
      .select({ count: count() })
      .from(krs)
      .innerJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
      .where(whereClause);

    const [approved] = await db
      .select({ count: count() })
      .from(krs)
      .innerJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
      .where(and(eq(krs.isApproved, true), ...(periodeId ? [eq(kelasKuliah.periodeId, periodeId)] : [])));

    const [pending] = await db
      .select({ count: count() })
      .from(krs)
      .innerJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
      .where(and(eq(krs.isApproved, false), ...(periodeId ? [eq(kelasKuliah.periodeId, periodeId)] : [])));

    const { programStudi: ps } = await import('../models/schema');

    const perProdi = await db
      .select({
        prodiId: mahasiswa.programStudiId,
        prodiNama: ps.nama,
        total: count(),
        approved: sql<number>`count(DISTINCT CASE WHEN ${krs.isApproved} THEN ${krs.id} END)`,
      })
      .from(krs)
      .innerJoin(mahasiswa, eq(krs.mahasiswaId, mahasiswa.id))
      .leftJoin(ps, eq(mahasiswa.programStudiId, ps.id))
      .innerJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
      .where(whereClause)
      .groupBy(mahasiswa.programStudiId, ps.nama);

    return {
      total: Number(total?.count || 0),
      approved: Number(approved?.count || 0),
      pending: Number(pending?.count || 0),
      perProdi: perProdi.map((p) => ({
        prodiId: p.prodiId,
        prodiNama: p.prodiNama || '-',
        total: Number(p.total),
        approved: Number(p.approved),
      })),
    };
  }

  static async validasiKrs(mahasiswaId: number, periodeId: string) {
    const rencana = await this.getRencanaStudi(mahasiswaId);
    if (!rencana) {
      return null;
    }

    // Ambil KRS mahasiswa di periode ini dengan SKS dari mata kuliah
    const krsMahasiswa = await db
      .select({
        id: krs.id,
        kelasKuliahId: krs.kelasKuliahId,
        mataKuliahId: kelasKuliah.mataKuliahId,
        sksTotal: mataKuliah.sksTotal,
        isApproved: krs.isApproved,
      })
      .from(krs)
      .innerJoin(kelasKuliah, eq(krs.kelasKuliahId, kelasKuliah.id))
      .innerJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
      .where(and(eq(krs.mahasiswaId, mahasiswaId), eq(kelasKuliah.periodeId, periodeId)));

    const mkDiKrs = krsMahasiswa.map((k) => k.mataKuliahId);
    const mkRencanaSemesterIni = rencana.rencanaPerSemester.find((s) => s.semester === rencana.currentSemester);

    const warnings: { type: string; mk: string; semester?: number }[] = [];

    // MK wajib di rencana semester ini tapi tidak di KRS
    if (mkRencanaSemesterIni) {
      for (const mk of mkRencanaSemesterIni.mataKuliah) {
        if (mk.isWajib && mk.status === 'tersedia' && !mkDiKrs.includes(mk.mataKuliahId)) {
          warnings.push({ type: 'missing_required', mk: mk.nama, semester: rencana.currentSemester });
        }
      }
    }

    // MK di KRS tapi di luar rencana semester saat ini
    for (const mkId of mkDiKrs) {
      let foundInRencana = false;
      let foundSemester = 0;
      for (const sem of rencana.rencanaPerSemester) {
        const mk = sem.mataKuliah.find((m) => m.mataKuliahId === mkId);
        if (mk) {
          foundInRencana = true;
          foundSemester = sem.semester;
          break;
        }
      }
      if (foundInRencana && foundSemester !== rencana.currentSemester) {
        const mkData = await db.query.mataKuliah.findFirst({ where: eq(mataKuliah.id, mkId) });
        if (mkData) {
          warnings.push({ type: 'outside_plan', mk: mkData.nama, semester: foundSemester });
        }
      }
      if (!foundInRencana) {
        const mkData = await db.query.mataKuliah.findFirst({ where: eq(mataKuliah.id, mkId) });
        if (mkData) {
          warnings.push({ type: 'not_in_curriculum', mk: mkData.nama });
        }
      }
    }

    const totalSksDiKrs = krsMahasiswa.reduce((sum, k) => sum + (k.sksTotal || 0), 0);
    const totalSksDiRencana = mkRencanaSemesterIni?.totalSks || 0;
    const mkWajibTerpenuhi = rencana.rencanaPerSemester
      .flatMap((s) => s.mataKuliah)
      .filter((m) => m.isWajib && (m.status === 'diambil' || m.status === 'lulus')).length;
    const mkWajibTotal = rencana.rencanaPerSemester.flatMap((s) => s.mataKuliah).filter((m) => m.isWajib).length;

    return {
      isValid: warnings.length === 0,
      warnings,
      summary: {
        totalSksDiRencana: totalSksDiRencana.toString(),
        totalSksDiKrs: totalSksDiKrs.toString(),
        mkWajibTerpenuhi,
        mkWajibTotal,
      },
    };
  }
}
