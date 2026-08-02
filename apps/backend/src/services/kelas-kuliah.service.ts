import { and, count, eq, ilike, inArray, or } from 'drizzle-orm';
import { dosen, dosenPengajarKelas, kelasKuliah, mataKuliah, programStudi } from '../models/schema';
import { db } from '../utils/db';

export interface CreateKelasDto {
  mataKuliahId: number;
  periodeId: string;
  namaKelas: string;
  idPddikti?: string;
}

export interface ImportKelasItem {
  kodeProdi?: string;
  kodeMataKuliah?: string;
  periodeId: string;
  namaKelas: string;
  nipDosen?: string;
  sksBebanMengajar?: number | string;
  idPddikti?: string;
}

export interface ImportKelasResult {
  success: number;
  failed: number;
  errors: { row: number; namaKelas: string; error: string }[];
}

export class KelasKuliahService {
  static async getAll(page = 1, limit = 10, search = '', periodeId?: string, dosenId?: number) {
    const offset = (page - 1) * limit;
    const conditions = [];

    if (search) {
      conditions.push(or(ilike(kelasKuliah.namaKelas, `%${search}%`), ilike(kelasKuliah.periodeId, `%${search}%`)));
    }
    if (periodeId) {
      conditions.push(eq(kelasKuliah.periodeId, periodeId));
    }
    if (dosenId !== undefined) {
      const kelasSubquery = db
        .select({ kelasKuliahId: dosenPengajarKelas.kelasKuliahId })
        .from(dosenPengajarKelas)
        .where(eq(dosenPengajarKelas.dosenId, dosenId));
      conditions.push(inArray(kelasKuliah.id, kelasSubquery));
    }

    let whereClause = undefined;
    if (conditions.length > 0) {
      whereClause = and(...conditions);
    }

    const [totalResult] = await db.select({ total: count() }).from(kelasKuliah).where(whereClause);

    const total = totalResult?.total || 0;

    const data = await db.query.kelasKuliah.findMany({
      where: whereClause,
      limit,
      offset,
      with: {
        mataKuliah: true,
        periodeAkademik: true,
        dosenPengajarKelas: {
          with: {
            dosen: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  static async getById(id: number) {
    const data = await db.query.kelasKuliah.findFirst({
      where: eq(kelasKuliah.id, id),
      with: {
        mataKuliah: true,
        periodeAkademik: true,
        dosenPengajarKelas: {
          with: {
            dosen: true,
          },
        },
      },
    });
    return data || null;
  }

  static async create(data: CreateKelasDto) {
    const [newKelas] = await db.insert(kelasKuliah).values(data).returning();
    return newKelas;
  }

  static async update(id: number, data: Partial<CreateKelasDto>) {
    const [updatedKelas] = await db.update(kelasKuliah).set(data).where(eq(kelasKuliah.id, id)).returning();
    return updatedKelas || null;
  }

  static async getByMk(mataKuliahId: number, periodeId: string) {
    return await db.query.kelasKuliah.findMany({
      where: and(eq(kelasKuliah.mataKuliahId, mataKuliahId), eq(kelasKuliah.periodeId, periodeId)),
      with: {
        dosenPengajarKelas: {
          with: {
            dosen: true,
          },
        },
      },
    });
  }

  static async delete(id: number) {
    const [deletedKelas] = await db.delete(kelasKuliah).where(eq(kelasKuliah.id, id)).returning();
    return deletedKelas || null;
  }

  static async import(items: ImportKelasItem[]): Promise<ImportKelasResult> {
    const result: ImportKelasResult = { success: 0, failed: 0, errors: [] };

    // 1. Map Program Studi by Kode
    const uniqueProdiKodes = [...new Set(items.map((item) => item.kodeProdi?.trim()).filter((k): k is string => !!k))];
    let prodiKodeToId = new Map<string, number>();
    if (uniqueProdiKodes.length > 0) {
      const prodiList = await db
        .select({ id: programStudi.id, kode: programStudi.kode })
        .from(programStudi)
        .where(inArray(programStudi.kode, uniqueProdiKodes));
      prodiKodeToId = new Map(prodiList.map((p) => [p.kode, p.id]));
    }

    // 2. Map Mata Kuliah by (programStudiId, kode) or (kode)
    const uniqueMkKodes = [
      ...new Set(items.map((item) => item.kodeMataKuliah?.trim()).filter((k): k is string => !!k)),
    ];
    let mkKeyToId = new Map<string, number>();
    if (uniqueMkKodes.length > 0) {
      const mkList = await db
        .select({ id: mataKuliah.id, kode: mataKuliah.kode, programStudiId: mataKuliah.programStudiId })
        .from(mataKuliah)
        .where(inArray(mataKuliah.kode, uniqueMkKodes));
      for (const m of mkList) {
        mkKeyToId.set(`${m.programStudiId}:${m.kode}`, m.id);
        if (!mkKeyToId.has(m.kode)) {
          mkKeyToId.set(m.kode, m.id);
        }
      }
    }

    // 3. Collect & Map Dosen by NIP (supporting delimited NIPs like "NIP1; NIP2")
    const allNipsExtracted: string[] = [];
    for (const item of items) {
      if (item.nipDosen?.trim()) {
        const parts = item.nipDosen
          .split(/[;,]/)
          .map((s) => s.trim())
          .filter(Boolean);
        allNipsExtracted.push(...parts);
      }
    }
    const uniqueNips = [...new Set(allNipsExtracted)];
    let nipToDosen = new Map<string, { id: number; nama: string }>();
    if (uniqueNips.length > 0) {
      const dosenList = await db
        .select({ id: dosen.id, nip: dosen.nip, nama: dosen.nama })
        .from(dosen)
        .where(inArray(dosen.nip, uniqueNips));
      nipToDosen = new Map(dosenList.map((d) => [d.nip, { id: d.id, nama: d.nama }]));
    }

    // 4. Pre-check existing Kelas Kuliah
    const uniqueMkIds = Array.from(mkKeyToId.values());
    const uniqueNamaKelas = [...new Set(items.map((i) => i.namaKelas?.trim()).filter((n): n is string => !!n))];
    let existingKeySet = new Set<string>();
    if (uniqueMkIds.length > 0 && uniqueNamaKelas.length > 0) {
      const existingKelas = await db
        .select({
          mataKuliahId: kelasKuliah.mataKuliahId,
          namaKelas: kelasKuliah.namaKelas,
          periodeId: kelasKuliah.periodeId,
        })
        .from(kelasKuliah)
        .where(and(inArray(kelasKuliah.mataKuliahId, uniqueMkIds), inArray(kelasKuliah.namaKelas, uniqueNamaKelas)));
      existingKeySet = new Set(existingKelas.map((k) => `${k.mataKuliahId}:${k.namaKelas}:${k.periodeId}`));
    }

    const validKelas: { mataKuliahId: number; periodeId: string; namaKelas: string; idPddikti?: string }[] = [];
    const seenValidKelasKeys = new Set<string>();

    const dosenToPlot: {
      nama: string;
      nip: string;
      mataKuliahId: number;
      namaKelas: string;
      periodeId: string;
      sksBebanMengajar: number;
    }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const urutan = i + 1;
      const namaKelas = item.namaKelas?.trim() || '';
      const kodeProdi = item.kodeProdi?.trim();

      if (!item.kodeMataKuliah?.trim()) {
        result.failed++;
        result.errors.push({ row: urutan, namaKelas, error: 'kode_mata_kuliah wajib diisi' });
        continue;
      }

      let mkId: number | undefined;
      if (kodeProdi) {
        const prodiId = prodiKodeToId.get(kodeProdi);
        if (!prodiId) {
          result.failed++;
          result.errors.push({
            row: urutan,
            namaKelas,
            error: `Program Studi dengan kode '${kodeProdi}' tidak ditemukan`,
          });
          continue;
        }
        mkId = mkKeyToId.get(`${prodiId}:${item.kodeMataKuliah.trim()}`);
      } else {
        mkId = mkKeyToId.get(item.kodeMataKuliah.trim());
      }

      if (!mkId) {
        result.failed++;
        const prodiErrMsg = kodeProdi ? ` di Prodi '${kodeProdi}'` : '';
        result.errors.push({
          row: urutan,
          namaKelas,
          error: `Mata Kuliah dengan kode '${item.kodeMataKuliah}' tidak ditemukan${prodiErrMsg}`,
        });
        continue;
      }

      if (!item.periodeId?.trim()) {
        result.failed++;
        result.errors.push({ row: urutan, namaKelas, error: 'periode_id wajib diisi' });
        continue;
      }

      if (!namaKelas) {
        result.failed++;
        result.errors.push({ row: urutan, namaKelas, error: 'nama_kelas wajib diisi' });
        continue;
      }

      if (namaKelas.length > 50) {
        result.failed++;
        result.errors.push({ row: urutan, namaKelas, error: 'nama_kelas maksimal 50 karakter' });
        continue;
      }

      // Handle dosen validation & plotting
      let rowDosenFailed = false;
      const tempDosenPlotRow: typeof dosenToPlot = [];

      if (item.nipDosen?.trim()) {
        const nips = item.nipDosen
          .split(/[;,]/)
          .map((s) => s.trim())
          .filter(Boolean);
        const sksInputs = String(item.sksBebanMengajar ?? 0)
          .split(/[;,]/)
          .map((s) => Number(s.trim()));

        for (let idx = 0; idx < nips.length; idx++) {
          const nip = nips[idx];
          const dosenInfo = nipToDosen.get(nip);
          if (!dosenInfo) {
            result.failed++;
            result.errors.push({
              row: urutan,
              namaKelas,
              error: `Dosen dengan NIP '${nip}' tidak ditemukan`,
            });
            rowDosenFailed = true;
            break;
          }

          const sks = !isNaN(sksInputs[idx]) ? sksInputs[idx] : !isNaN(sksInputs[0]) ? sksInputs[0] : 0;
          if (sks < 0 || sks > 24) {
            result.failed++;
            result.errors.push({
              row: urutan,
              namaKelas,
              error: `SKS Beban Mengajar harus antara 0-24 (diterima: ${sks})`,
            });
            rowDosenFailed = true;
            break;
          }

          tempDosenPlotRow.push({
            nama: dosenInfo.nama,
            nip,
            mataKuliahId: mkId,
            namaKelas,
            periodeId: item.periodeId.trim(),
            sksBebanMengajar: sks,
          });
        }
      }

      if (rowDosenFailed) {
        continue;
      }

      dosenToPlot.push(...tempDosenPlotRow);

      const classKey = `${mkId}:${namaKelas}:${item.periodeId.trim()}`;
      if (!existingKeySet.has(classKey) && !seenValidKelasKeys.has(classKey)) {
        seenValidKelasKeys.add(classKey);
        validKelas.push({
          mataKuliahId: mkId,
          periodeId: item.periodeId.trim(),
          namaKelas,
          idPddikti: item.idPddikti?.trim() || undefined,
        });
      }
    }

    if (validKelas.length > 0) {
      try {
        const inserted = await db.insert(kelasKuliah).values(validKelas).returning({ id: kelasKuliah.id });
        result.success = inserted.length;

        for (const plot of dosenToPlot) {
          let kelasId: number | undefined;
          const kelasIdx = validKelas.findIndex(
            (v) =>
              v.mataKuliahId === plot.mataKuliahId && v.namaKelas === plot.namaKelas && v.periodeId === plot.periodeId,
          );
          if (kelasIdx !== -1 && inserted[kelasIdx]) {
            kelasId = inserted[kelasIdx].id;
          } else {
            const existing = await db.query.kelasKuliah.findFirst({
              where: and(
                eq(kelasKuliah.mataKuliahId, plot.mataKuliahId),
                eq(kelasKuliah.namaKelas, plot.namaKelas),
                eq(kelasKuliah.periodeId, plot.periodeId),
              ),
            });
            kelasId = existing?.id;
          }

          if (!kelasId) continue;

          const dosenId = nipToDosen.get(plot.nip)?.id;
          if (!dosenId) continue;

          const existingMapping = await db.query.dosenPengajarKelas.findFirst({
            where: and(eq(dosenPengajarKelas.kelasKuliahId, kelasId), eq(dosenPengajarKelas.dosenId, dosenId)),
          });

          if (!existingMapping) {
            await db.insert(dosenPengajarKelas).values({
              kelasKuliahId: kelasId,
              dosenId,
              sksBebanMengajar: plot.sksBebanMengajar,
            });
          }
        }
      } catch (err: unknown) {
        result.failed += validKelas.length;
        result.errors.push({ row: 0, namaKelas: '', error: 'Gagal menyimpan data ke database' });
        console.error('Kelas Kuliah import error:', err);
      }
    } else if (dosenToPlot.length > 0) {
      for (const plot of dosenToPlot) {
        const existing = await db.query.kelasKuliah.findFirst({
          where: and(
            eq(kelasKuliah.mataKuliahId, plot.mataKuliahId),
            eq(kelasKuliah.namaKelas, plot.namaKelas),
            eq(kelasKuliah.periodeId, plot.periodeId),
          ),
        });
        if (existing) {
          const dosenId = nipToDosen.get(plot.nip)?.id;
          if (dosenId) {
            const existingMapping = await db.query.dosenPengajarKelas.findFirst({
              where: and(eq(dosenPengajarKelas.kelasKuliahId, existing.id), eq(dosenPengajarKelas.dosenId, dosenId)),
            });
            if (!existingMapping) {
              try {
                await db.insert(dosenPengajarKelas).values({
                  kelasKuliahId: existing.id,
                  dosenId,
                  sksBebanMengajar: plot.sksBebanMengajar,
                });
              } catch {
                // skip duplicate
              }
            }
          }
        }
      }
    }

    return result;
  }

  static getTemplateCsv(): string {
    return 'kode_prodi,kode_mata_kuliah,periode_id,nama_kelas,nip_dosen,sks_beban_mengajar,id_pddikti\nTI,TI001,20241,1A,198501012010011001,3,\nTI,TI001,20241,1A,198705152015012002,2,\nTI,TI002,20241,2B,198501012010011001;198705152015012002,3;3,';
  }
}
