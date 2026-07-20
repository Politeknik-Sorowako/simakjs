import { and, count, eq, ilike, inArray, or } from 'drizzle-orm';
import { dosen, dosenPengajarKelas, kelasKuliah, mataKuliah } from '../models/schema';
import { db } from '../utils/db';

export interface CreateKelasDto {
  mataKuliahId: number;
  periodeId: string;
  namaKelas: string;
  idPddikti?: string;
}

export interface ImportKelasItem {
  kodeMataKuliah?: string;
  periodeId: string;
  namaKelas: string;
  nipDosen?: string;
  sksBebanMengajar?: number;
  idPddikti?: string;
}

export interface ImportKelasResult {
  success: number;
  failed: number;
  errors: { row: number; namaKelas: string; error: string }[];
}

export class KelasKuliahService {
  static async getAll(page = 1, limit = 10, search = '', periodeId?: string) {
    const offset = (page - 1) * limit;
    let conditions = [];

    if (search) {
      conditions.push(or(ilike(kelasKuliah.namaKelas, `%${search}%`), ilike(kelasKuliah.periodeId, `%${search}%`)));
    }
    if (periodeId) {
      conditions.push(eq(kelasKuliah.periodeId, periodeId));
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

    const uniqueMkKodes = [...new Set(items.map((item) => item.kodeMataKuliah).filter((k): k is string => !!k))];
    let mkKodeToId = new Map<string, number>();
    if (uniqueMkKodes.length > 0) {
      const mkList = await db
        .select({ id: mataKuliah.id, kode: mataKuliah.kode })
        .from(mataKuliah)
        .where(inArray(mataKuliah.kode, uniqueMkKodes));
      mkKodeToId = new Map(mkList.map((m) => [m.kode, m.id]));
    }

    const uniqueNips = [...new Set(items.map((item) => item.nipDosen?.trim()).filter((n): n is string => !!n))];
    let nipToDosen = new Map<string, { id: number; nama: string }>();
    if (uniqueNips.length > 0) {
      const dosenList = await db
        .select({ id: dosen.id, nip: dosen.nip, nama: dosen.nama })
        .from(dosen)
        .where(inArray(dosen.nip, uniqueNips));
      nipToDosen = new Map(dosenList.map((d) => [d.nip, { id: d.id, nama: d.nama }]));
    }

    const validKelas: { mataKuliahId: number; periodeId: string; namaKelas: string; idPddikti?: string }[] = [];
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

      if (!item.kodeMataKuliah) {
        result.failed++;
        result.errors.push({ row: urutan, namaKelas, error: 'kode_mata_kuliah wajib diisi' });
        continue;
      }

      const mkId = mkKodeToId.get(item.kodeMataKuliah);
      if (!mkId) {
        result.failed++;
        result.errors.push({
          row: urutan,
          namaKelas,
          error: `Mata Kuliah dengan kode '${item.kodeMataKuliah}' tidak ditemukan`,
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

      if (item.nipDosen?.trim()) {
        const dosenInfo = nipToDosen.get(item.nipDosen.trim());
        if (!dosenInfo) {
          result.failed++;
          result.errors.push({
            row: urutan,
            namaKelas,
            error: `Dosen dengan NIP '${item.nipDosen}' tidak ditemukan`,
          });
          continue;
        }
        const sks = item.sksBebanMengajar ?? 0;
        if (sks < 0 || sks > 24) {
          result.failed++;
          result.errors.push({
            row: urutan,
            namaKelas,
            error: `SKS Beban Mengajar harus antara 0-24 (diterima: ${sks})`,
          });
          continue;
        }
        dosenToPlot.push({
          nama: dosenInfo.nama,
          nip: item.nipDosen.trim(),
          mataKuliahId: mkId,
          namaKelas,
          periodeId: item.periodeId.trim(),
          sksBebanMengajar: sks,
        });
      }

      const existing = await db.query.kelasKuliah.findFirst({
        where: and(eq(kelasKuliah.mataKuliahId, mkId), eq(kelasKuliah.namaKelas, namaKelas)),
      });

      if (existing) {
        const dosenInfo = item.nipDosen?.trim() ? nipToDosen.get(item.nipDosen.trim()) : undefined;
        if (dosenInfo) {
          dosenToPlot.push({
            nama: dosenInfo.nama,
            nip: item.nipDosen!.trim(),
            mataKuliahId: mkId,
            namaKelas,
            periodeId: item.periodeId.trim(),
            sksBebanMengajar: item.sksBebanMengajar ?? 0,
          });
        }
        continue;
      }

      validKelas.push({
        mataKuliahId: mkId,
        periodeId: item.periodeId.trim(),
        namaKelas,
        idPddikti: item.idPddikti?.trim() || undefined,
      });
    }

    if (validKelas.length > 0) {
      try {
        const inserted = await db.insert(kelasKuliah).values(validKelas).returning({ id: kelasKuliah.id });
        result.success = inserted.length;

        for (const plot of dosenToPlot) {
          let kelasId: number | undefined;
          const kelasIdx = validKelas.findIndex(
            (v) => v.mataKuliahId === plot.mataKuliahId && v.namaKelas === plot.namaKelas,
          );
          if (kelasIdx !== -1 && inserted[kelasIdx]) {
            kelasId = inserted[kelasIdx].id;
          } else {
            const existing = await db.query.kelasKuliah.findFirst({
              where: and(eq(kelasKuliah.mataKuliahId, plot.mataKuliahId), eq(kelasKuliah.namaKelas, plot.namaKelas)),
            });
            kelasId = existing?.id;
          }

          if (!kelasId) continue;

          const existingMapping = await db.query.dosenPengajarKelas.findFirst({
            where: and(
              eq(dosenPengajarKelas.kelasKuliahId, kelasId),
              eq(dosenPengajarKelas.dosenId, nipToDosen.get(plot.nip)?.id ?? 0),
            ),
          });

          if (!existingMapping) {
            await db.insert(dosenPengajarKelas).values({
              kelasKuliahId: kelasId,
              dosenId: nipToDosen.get(plot.nip)!.id,
              sksBebanMengajar: plot.sksBebanMengajar,
            });
          }
        }
      } catch (err: unknown) {
        result.failed += validKelas.length;
        result.errors.push({ row: 0, namaKelas: '', error: 'Gagal menyimpan data ke database' });
        console.error('Kelas Kuliah import error:', err);
      }
    }

    for (const plot of dosenToPlot) {
      const kelasStillMissing = !validKelas.some(
        (v) => v.mataKuliahId === plot.mataKuliahId && v.namaKelas === plot.namaKelas,
      );
      if (kelasStillMissing) {
        const existing = await db.query.kelasKuliah.findFirst({
          where: and(eq(kelasKuliah.mataKuliahId, plot.mataKuliahId), eq(kelasKuliah.namaKelas, plot.namaKelas)),
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
    return 'kode_mata_kuliah,periode_id,nama_kelas,nip_dosen,sks_beban_mengajar,id_pddikti\nTI001,20241,1A,198501012010011001,3,\nTI001,20241,1A,198705152015012002,4,\nTI002,20241,2B,198501012010011001,6,';
  }
}
