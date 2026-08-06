import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import {
  bimbingan,
  bimbinganThread,
  dosen,
  mahasiswa,
  periodeAkademik,
  programStudi,
  sesiBimbingan,
} from '../models/schema';
import { db } from '../utils/db';

export class BimbinganService {
  static async getActivePeriode() {
    const [active] = await db.select().from(periodeAkademik).where(eq(periodeAkademik.aktif, true));
    return active;
  }

  static async getOrCreateBimbingan(mahasiswaId: number, targetPeriodeId?: string) {
    const activePeriode = await this.getActivePeriode();
    if (!activePeriode) {
      throw new Error('Tidak ada periode akademik aktif.');
    }
    const reqPeriodeId = targetPeriodeId || activePeriode.id;

    // Ambil daftar semua periode yang memiliki bimbingan untuk mahasiswa ini
    const rawPeriodes = await db
      .select({ periodeId: bimbingan.periodeId })
      .from(bimbingan)
      .where(eq(bimbingan.mahasiswaId, mahasiswaId));
    const availablePeriodes = rawPeriodes.map((p) => p.periodeId);

    // Tambahkan periode aktif jika belum ada di list
    if (activePeriode && !availablePeriodes.includes(activePeriode.id)) {
      availablePeriodes.push(activePeriode.id);
    }

    // Cari bimbingan untuk periode terpilih
    const [existing] = await db
      .select()
      .from(bimbingan)
      .where(and(eq(bimbingan.mahasiswaId, mahasiswaId), eq(bimbingan.periodeId, reqPeriodeId)));

    if (existing) {
      // Ambil thread chat
      const threadMessages = await db
        .select()
        .from(bimbinganThread)
        .where(eq(bimbinganThread.bimbinganId, existing.id))
        .orderBy(desc(bimbinganThread.createdAt));

      // Ambil semua sesi bimbingan
      const sesiList = await db
        .select()
        .from(sesiBimbingan)
        .where(eq(sesiBimbingan.bimbinganId, existing.id))
        .orderBy(asc(sesiBimbingan.pertemuanKe));

      return {
        ...existing,
        thread: threadMessages,
        sesi: sesiList,
        availablePeriodes,
      };
    }

    // Jika belum ada, buat bimbingan baru (hanya untuk periode aktif)
    if (reqPeriodeId !== activePeriode.id) {
      return {
        id: 0,
        mahasiswaId,
        dosenId: null,
        periodeId: reqPeriodeId,
        ringkasan: null,
        isApproved: false,
        permasalahan: null,
        solusi: null,
        tanggalBimbingan: null,
        statusBkd: false,
        thread: [],
        sesi: [],
        availablePeriodes,
      };
    }

    const [mhs] = await db
      .select({
        id: mahasiswa.id,
        dosenPaId: mahasiswa.dosenPaId,
      })
      .from(mahasiswa)
      .where(eq(mahasiswa.id, mahasiswaId));

    if (!mhs) {
      throw new Error('Mahasiswa tidak ditemukan.');
    }

    const [newBimbingan] = await db
      .insert(bimbingan)
      .values({
        mahasiswaId,
        dosenId: mhs.dosenPaId,
        periodeId: activePeriode.id,
        ringkasan: null,
        isApproved: false,
        permasalahan: null,
        solusi: null,
        tanggalBimbingan: null,
        statusBkd: false,
      })
      .returning();

    return {
      ...newBimbingan,
      thread: [],
      sesi: [],
      availablePeriodes,
    };
  }

  static async addThreadMessage(
    bimbinganId: number,
    senderRole: 'dosen' | 'mahasiswa' | 'admin' | 'prodi',
    pesan: string,
    tipe?: string,
  ) {
    const [newMsg] = await db
      .insert(bimbinganThread)
      .values({
        bimbinganId,
        senderRole,
        pesan,
        tipe: tipe || 'uts',
      })
      .returning();
    return newMsg;
  }

  static async updateBimbingan(
    bimbinganId: number,
    data: {
      ringkasan?: string;
      isApproved?: boolean;
      permasalahan?: string;
      solusi?: string;
      tanggalBimbingan?: Date;
      statusBkd?: boolean;
    },
  ) {
    const [updated] = await db
      .update(bimbingan)
      .set({
        ...data,
        tanggalBimbingan: data.tanggalBimbingan ? data.tanggalBimbingan.toISOString().split('T')[0] : undefined,
        updatedAt: new Date(),
      })
      .where(eq(bimbingan.id, bimbinganId))
      .returning();
    return updated;
  }

  static async getBimbinganById(id: number) {
    const [record] = await db.select().from(bimbingan).where(eq(bimbingan.id, id));
    return record;
  }

  static async addSesiBimbingan(
    bimbinganId: number,
    data: {
      pertemuanKe: number;
      tanggalBimbingan: Date;
      permasalahan: string;
      solusi: string;
      statusBkd: boolean;
      kategoriId?: number | null;
    },
  ) {
    const [newSesi] = await db
      .insert(sesiBimbingan)
      .values({
        bimbinganId,
        ...data,
        kategoriId: data.kategoriId || null,
        tanggalBimbingan: data.tanggalBimbingan.toISOString().split('T')[0],
      })
      .returning();
    return newSesi;
  }

  static async updateSesiBimbingan(
    sesiId: number,
    data: {
      pertemuanKe?: number;
      tanggalBimbingan?: Date;
      permasalahan?: string;
      solusi?: string;
      statusBkd?: boolean;
      kategoriId?: number | null;
    },
  ) {
    const [updatedSesi] = await db
      .update(sesiBimbingan)
      .set({
        ...data,
        kategoriId: data.kategoriId !== undefined ? data.kategoriId : undefined,
        tanggalBimbingan: data.tanggalBimbingan ? data.tanggalBimbingan.toISOString().split('T')[0] : undefined,
        updatedAt: new Date(),
      })
      .where(eq(sesiBimbingan.id, sesiId))
      .returning();
    return updatedSesi;
  }

  static async deleteSesiBimbingan(sesiId: number) {
    const [deletedSesi] = await db.delete(sesiBimbingan).where(eq(sesiBimbingan.id, sesiId)).returning();
    return deletedSesi;
  }

  static async clearChatThread(bimbinganId: number) {
    await db.delete(bimbinganThread).where(eq(bimbinganThread.bimbinganId, bimbinganId));
    return { success: true };
  }

  static async getMonitoringBimbingan(dosenId?: number) {
    try {
      const activePeriode = await this.getActivePeriode();
      if (!activePeriode) {
        return [];
      }

      // Ambil daftar mahasiswa
      const queryBuilder = db
        .select({
          id: mahasiswa.id,
          nim: mahasiswa.nim,
          nama: mahasiswa.nama,
          angkatan: mahasiswa.angkatan,
          prodiId: mahasiswa.programStudiId,
          prodiNama: programStudi.nama,
          dosenPaId: mahasiswa.dosenPaId,
          dosenPaNama: dosen.nama,
        })
        .from(mahasiswa)
        .leftJoin(dosen, eq(mahasiswa.dosenPaId, dosen.id))
        .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id));

      if (dosenId !== undefined) {
        queryBuilder.where(eq(mahasiswa.dosenPaId, dosenId));
      }

      const listMahasiswa = await queryBuilder;

      // Ambil semua bimbingan untuk periode aktif
      let listBimbingan: (typeof bimbingan.$inferSelect)[] = [];
      try {
        listBimbingan = await db.select().from(bimbingan).where(eq(bimbingan.periodeId, activePeriode.id));
      } catch (e: unknown) {
        console.error('[BimbinganService] Error querying bimbingan for active periode:', {
          periodeId: activePeriode.id,
          error: e instanceof Error ? e.message : e,
        });
      }

      const mapBimbingan = new Map<number, typeof bimbingan.$inferSelect>();
      const bimbinganIds: number[] = [];
      for (const b of listBimbingan) {
        mapBimbingan.set(b.mahasiswaId, b);
        bimbinganIds.push(b.id);
      }

      // Ambil rekap total sesi per bimbingan (hanya untuk bimbingan di periode aktif)
      let allSesi: { id: number; bimbinganId: number }[] = [];
      if (bimbinganIds.length > 0) {
        try {
          allSesi = await db
            .select({
              id: sesiBimbingan.id,
              bimbinganId: sesiBimbingan.bimbinganId,
            })
            .from(sesiBimbingan)
            .where(inArray(sesiBimbingan.bimbinganId, bimbinganIds));
        } catch (e: unknown) {
          console.error('[BimbinganService] Error querying sesiBimbingan:', {
            bimbinganCount: bimbinganIds.length,
            error: e instanceof Error ? e.message : e,
          });
        }
      }

      const sesiCountMap = new Map<number, number>();
      for (const s of allSesi) {
        const currentVal = sesiCountMap.get(s.bimbinganId) || 0;
        sesiCountMap.set(s.bimbinganId, currentVal + 1);
      }

      return listMahasiswa.map((mhs) => {
        const bimb = mapBimbingan.get(mhs.id);
        const totalSesi = bimb ? sesiCountMap.get(bimb.id) || 0 : 0;
        return {
          ...mhs,
          bimbinganId: bimb?.id || null,
          ringkasan: bimb?.ringkasan || null,
          isApproved: bimb?.isApproved || false,
          totalSesi,
          permasalahan: bimb?.permasalahan || null,
          solusi: bimb?.solusi || null,
          tanggalBimbingan: bimb?.tanggalBimbingan || null,
          statusBkd: bimb?.statusBkd || false,
          createdAt: bimb?.createdAt || null,
        };
      });
    } catch (err: unknown) {
      console.error('[BimbinganService] Error in getMonitoringBimbingan:', {
        dosenId,
        error: err instanceof Error ? err.message : err,
      });
      return [];
    }
  }

  static async getRekapBimbinganDosen(dosenId?: number, periodeId?: string) {
    const filterPeriodeId = periodeId || (await this.getActivePeriode())?.id;
    if (!filterPeriodeId) {
      return [];
    }

    const conditions = [eq(bimbingan.periodeId, filterPeriodeId)];
    if (dosenId !== undefined) {
      conditions.push(eq(bimbingan.dosenId, dosenId));
    }

    const bimbinganList = await db
      .select({
        id: bimbingan.id,
        mahasiswaId: bimbingan.mahasiswaId,
        dosenId: bimbingan.dosenId,
        periodeId: bimbingan.periodeId,
        ringkasan: bimbingan.ringkasan,
        isApproved: bimbingan.isApproved,
        mahasiswa: {
          nim: mahasiswa.nim,
          nama: mahasiswa.nama,
        },
      })
      .from(bimbingan)
      .innerJoin(mahasiswa, eq(bimbingan.mahasiswaId, mahasiswa.id))
      .where(and(...conditions));

    if (bimbinganList.length === 0) {
      return [];
    }

    const bimbIds = bimbinganList.map((b) => b.id);
    const sesiList = await db
      .select()
      .from(sesiBimbingan)
      .where(inArray(sesiBimbingan.bimbinganId, bimbIds))
      .orderBy(asc(sesiBimbingan.pertemuanKe));

    const sesiMap = new Map<number, (typeof sesiBimbingan.$inferSelect)[]>();
    for (const s of sesiList) {
      const arr = sesiMap.get(s.bimbinganId) || [];
      arr.push(s);
      sesiMap.set(s.bimbinganId, arr);
    }

    return bimbinganList.map((b) => {
      const sesi = sesiMap.get(b.id) || [];
      return {
        ...b,
        sesi,
        totalSesi: sesi.length,
        statusBkd: sesi.some((s) => s.statusBkd),
      };
    });
  }

  static async getMonitoringBimbinganLengkap(filter?: { periodeId?: string; prodiId?: number; dosenPaId?: number }) {
    const activePeriode = await this.getActivePeriode();
    const rawPeriodeId = filter?.periodeId || activePeriode?.id;
    const targetPeriodeId = rawPeriodeId ? String(rawPeriodeId) : undefined;

    if (!targetPeriodeId) {
      return [];
    }

    const mhsQuery = db
      .select({
        id: mahasiswa.id,
        nim: mahasiswa.nim,
        nama: mahasiswa.nama,
        prodiId: mahasiswa.programStudiId,
        dosenPaId: mahasiswa.dosenPaId,
        dosenPaNama: dosen.nama,
      })
      .from(mahasiswa)
      .leftJoin(dosen, eq(mahasiswa.dosenPaId, dosen.id));

    const conditions = [];
    if (filter?.dosenPaId) {
      conditions.push(eq(mahasiswa.dosenPaId, filter.dosenPaId));
    }
    if (filter?.prodiId) {
      conditions.push(eq(mahasiswa.programStudiId, filter.prodiId));
    }

    const listMahasiswa = conditions.length > 0 ? await mhsQuery.where(and(...conditions)) : await mhsQuery;

    const listBimbingan = await db.select().from(bimbingan).where(eq(bimbingan.periodeId, targetPeriodeId));

    const bimbinganMap = new Map<number, typeof bimbingan.$inferSelect>();
    const bimbinganIds: number[] = [];
    for (const b of listBimbingan) {
      bimbinganMap.set(b.mahasiswaId, b);
      bimbinganIds.push(b.id);
    }

    const sesiMap = new Map<number, (typeof sesiBimbingan.$inferSelect)[]>();
    if (bimbinganIds.length > 0) {
      const allSesi = await db
        .select()
        .from(sesiBimbingan)
        .where(inArray(sesiBimbingan.bimbinganId, bimbinganIds))
        .orderBy(asc(sesiBimbingan.pertemuanKe));

      for (const s of allSesi) {
        const current = sesiMap.get(s.bimbinganId) || [];
        current.push(s);
        sesiMap.set(s.bimbinganId, current);
      }
    }

    return listMahasiswa.map((mhs) => {
      const bimb = bimbinganMap.get(mhs.id);
      const sesiList = bimb ? sesiMap.get(bimb.id) || [] : [];
      return {
        mahasiswaId: mhs.id,
        nim: mhs.nim,
        namaMahasiswa: mhs.nama,
        prodiId: mhs.prodiId,
        dosenPaId: mhs.dosenPaId,
        dosenPaNama: mhs.dosenPaNama || 'Belum Ditentukan',
        periodeId: targetPeriodeId,
        bimbinganId: bimb?.id || null,
        totalSesi: sesiList.length,
        isApproved: bimb?.isApproved || false,
        statusBkd: bimb?.statusBkd || false,
        sesiList,
      };
    });
  }
}
