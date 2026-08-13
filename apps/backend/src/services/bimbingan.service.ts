import { and, asc, count, desc, eq, ilike, inArray, or } from 'drizzle-orm';
import {
  bimbingan,
  bimbinganAttachments,
  bimbinganThread,
  dosen,
  mahasiswa,
  notifications,
  periodeAkademik,
  programStudi,
  sesiBimbingan,
  users,
} from '../models/schema';
import { db } from '../utils/db';

export class BimbinganService {
  static async getActivePeriode() {
    const [active] = await db.select().from(periodeAkademik).where(eq(periodeAkademik.aktif, true));
    return active;
  }

  static async notifyDosenPa(mahasiswaId: number, title: string, message: string, bimbinganId: number) {
    try {
      const [mhs] = await db
        .select({
          id: mahasiswa.id,
          nama: mahasiswa.nama,
          nim: mahasiswa.nim,
          dosenPaId: mahasiswa.dosenPaId,
        })
        .from(mahasiswa)
        .where(eq(mahasiswa.id, mahasiswaId));

      if (!mhs || !mhs.dosenPaId) return;

      const [dosenRow] = await db.select({ email: dosen.email }).from(dosen).where(eq(dosen.id, mhs.dosenPaId));

      if (!dosenRow || !dosenRow.email) return;

      const [userRow] = await db.select({ id: users.id }).from(users).where(eq(users.email, dosenRow.email));

      if (!userRow) return;

      await db.insert(notifications).values({
        userId: userRow.id,
        title,
        message,
        link: `/bimbingan?id=${bimbinganId}`,
      });
    } catch (e) {
      console.error('[BimbinganService] Error sending notification to Dosen PA:', e);
    }
  }

  static async getOrCreateBimbingan(mahasiswaId: number, targetPeriodeId?: string, kategori = 'PA') {
    const activePeriode = await this.getActivePeriode();
    if (!activePeriode) {
      throw new Error('Tidak ada periode akademik aktif.');
    }
    const reqPeriodeId = targetPeriodeId || activePeriode.id;

    // Ambil daftar semua periode yang memiliki bimbingan untuk mahasiswa ini
    const rawPeriodes = await db
      .select({ periodeId: bimbingan.periodeId })
      .from(bimbingan)
      .where(and(eq(bimbingan.mahasiswaId, mahasiswaId), eq(bimbingan.kategori, kategori)));
    const availablePeriodes = rawPeriodes.map((p) => p.periodeId);

    // Tambahkan periode aktif jika belum ada di list
    if (activePeriode && !availablePeriodes.includes(activePeriode.id)) {
      availablePeriodes.push(activePeriode.id);
    }

    // Cari bimbingan untuk periode terpilih & kategori
    const [existing] = await db
      .select()
      .from(bimbingan)
      .where(
        and(
          eq(bimbingan.mahasiswaId, mahasiswaId),
          eq(bimbingan.periodeId, reqPeriodeId),
          eq(bimbingan.kategori, kategori),
        ),
      );

    if (existing) {
      const threadMessages = await db
        .select()
        .from(bimbinganThread)
        .where(eq(bimbinganThread.bimbinganId, existing.id))
        .orderBy(desc(bimbinganThread.createdAt));

      const sesiList = await db
        .select()
        .from(sesiBimbingan)
        .where(eq(sesiBimbingan.bimbinganId, existing.id))
        .orderBy(asc(sesiBimbingan.pertemuanKe));

      const attachments = await db
        .select()
        .from(bimbinganAttachments)
        .where(eq(bimbinganAttachments.bimbinganId, existing.id));

      const topik = existing.topikBimbingan || existing.permasalahan || null;

      return {
        ...existing,
        topikBimbingan: topik,
        permasalahan: topik,
        thread: threadMessages,
        sesi: sesiList.map((s) => ({
          ...s,
          topikBimbingan: s.topikBimbingan || s.permasalahan,
          permasalahan: s.topikBimbingan || s.permasalahan,
        })),
        attachments,
        availablePeriodes,
      };
    }

    if (reqPeriodeId !== activePeriode.id) {
      return {
        id: 0,
        mahasiswaId,
        dosenId: null,
        periodeId: reqPeriodeId,
        ringkasan: null,
        isApproved: false,
        permasalahan: null,
        topikBimbingan: null,
        solusi: null,
        tanggalBimbingan: null,
        statusBkd: false,
        kategori,
        isReadByMahasiswa: true,
        readAtMahasiswa: null,
        thread: [],
        sesi: [],
        attachments: [],
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
        topikBimbingan: null,
        solusi: null,
        tanggalBimbingan: null,
        statusBkd: false,
        kategori,
        isReadByMahasiswa: true,
      })
      .returning();

    return {
      ...newBimbingan,
      topikBimbingan: null,
      permasalahan: null,
      thread: [],
      sesi: [],
      attachments: [],
      availablePeriodes,
    };
  }

  static async addThreadMessage(
    bimbinganId: number,
    senderRole: 'dosen' | 'mahasiswa' | 'admin' | 'prodi',
    pesan: string,
    tipe?: string,
    fileAttachment?: { fileUrl: string; fileName: string; fileSize: number; fileType: string; uploadedBy?: number },
  ) {
    const isMahasiswa = senderRole === 'mahasiswa';
    const [newMsg] = await db
      .insert(bimbinganThread)
      .values({
        bimbinganId,
        senderRole,
        pesan,
        tipe: tipe || 'uts',
        isReadByMahasiswa: isMahasiswa,
        readAtMahasiswa: isMahasiswa ? new Date() : null,
      })
      .returning();

    if (fileAttachment) {
      await db.insert(bimbinganAttachments).values({
        bimbinganId,
        bimbinganThreadId: newMsg.id,
        fileUrl: fileAttachment.fileUrl,
        fileName: fileAttachment.fileName,
        fileSize: fileAttachment.fileSize,
        fileType: fileAttachment.fileType,
        uploadedBy: fileAttachment.uploadedBy || null,
      });
    }

    // Update bimbingan read status if sent by dosen
    if (!isMahasiswa) {
      await db
        .update(bimbingan)
        .set({ isReadByMahasiswa: false, readAtMahasiswa: null, updatedAt: new Date() })
        .where(eq(bimbingan.id, bimbinganId));
    } else {
      // Trigger notification to Dosen PA
      const bimb = await this.getBimbinganById(bimbinganId);
      if (bimb) {
        const topik = bimb.topikBimbingan || bimb.permasalahan || 'Topik Bimbingan';
        await this.notifyDosenPa(
          bimb.mahasiswaId,
          'Balasan Bimbingan',
          `Mahasiswa membalas Bimbingan dengan topik: "${topik}"`,
          bimbinganId,
        );
      }
    }

    return newMsg;
  }

  static async updateBimbingan(
    bimbinganId: number,
    data: {
      ringkasan?: string;
      isApproved?: boolean;
      topikBimbingan?: string;
      permasalahan?: string;
      solusi?: string;
      tanggalBimbingan?: string;
      statusBkd?: boolean;
      kategori?: string;
    },
  ) {
    const topikVal = data.topikBimbingan !== undefined ? data.topikBimbingan : data.permasalahan;

    const [updated] = await db
      .update(bimbingan)
      .set({
        ...data,
        topikBimbingan: topikVal,
        permasalahan: topikVal,
        tanggalBimbingan: data.tanggalBimbingan,
        updatedAt: new Date(),
      })
      .where(eq(bimbingan.id, bimbinganId))
      .returning();

    return updated;
  }

  static async markAsReadByMahasiswa(bimbinganId: number) {
    const now = new Date();
    await db
      .update(bimbingan)
      .set({ isReadByMahasiswa: true, readAtMahasiswa: now })
      .where(eq(bimbingan.id, bimbinganId));

    await db
      .update(bimbinganThread)
      .set({ isReadByMahasiswa: true, readAtMahasiswa: now })
      .where(eq(bimbinganThread.bimbinganId, bimbinganId));

    return { success: true, readAt: now };
  }

  static async markAllReadByMahasiswa(mahasiswaId: number) {
    const now = new Date();
    const records = await db.select({ id: bimbingan.id }).from(bimbingan).where(eq(bimbingan.mahasiswaId, mahasiswaId));

    const ids = records.map((r) => r.id);
    if (ids.length === 0) {
      return { success: true, readAt: now, updated: 0 };
    }

    await db.update(bimbingan).set({ isReadByMahasiswa: true, readAtMahasiswa: now }).where(inArray(bimbingan.id, ids));

    await db
      .update(bimbinganThread)
      .set({ isReadByMahasiswa: true, readAtMahasiswa: now })
      .where(inArray(bimbinganThread.bimbinganId, ids));

    return { success: true, readAt: now, updated: ids.length };
  }

  static async addAttachment(data: {
    bimbinganId: number;
    bimbinganThreadId?: number | null;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    uploadedBy?: number | null;
  }) {
    const [newAttachment] = await db
      .insert(bimbinganAttachments)
      .values({
        bimbinganId: data.bimbinganId,
        bimbinganThreadId: data.bimbinganThreadId || null,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: data.fileType,
        uploadedBy: data.uploadedBy || null,
      })
      .returning();
    return newAttachment;
  }

  static async getBimbinganById(id: number) {
    const [record] = await db.select().from(bimbingan).where(eq(bimbingan.id, id));
    if (record) {
      const topik = record.topikBimbingan || record.permasalahan || null;
      return { ...record, topikBimbingan: topik, permasalahan: topik };
    }
    return record;
  }

  static async addSesiBimbingan(
    bimbinganId: number,
    data: {
      pertemuanKe: number;
      tanggalBimbingan: string;
      topikBimbingan?: string;
      permasalahan?: string;
      solusi: string;
      statusBkd: boolean;
      kategoriId?: number | null;
    },
  ) {
    const topikVal = data.topikBimbingan || data.permasalahan || '';
    const [newSesi] = await db
      .insert(sesiBimbingan)
      .values({
        bimbinganId,
        pertemuanKe: data.pertemuanKe,
        tanggalBimbingan: data.tanggalBimbingan,
        topikBimbingan: topikVal,
        permasalahan: topikVal,
        solusi: data.solusi,
        statusBkd: data.statusBkd,
        kategoriId: data.kategoriId || null,
      })
      .returning();

    // Trigger notification to Dosen PA
    const bimb = await this.getBimbinganById(bimbinganId);
    if (bimb) {
      await this.notifyDosenPa(
        bimb.mahasiswaId,
        'Pengajuan Sesi Bimbingan Baru',
        `Mahasiswa mengajukan Sesi Bimbingan Ke-${data.pertemuanKe} dengan topik: "${topikVal}"`,
        bimbinganId,
      );
    }

    return newSesi;
  }

  static async updateSesiBimbingan(
    sesiId: number,
    data: {
      pertemuanKe?: number;
      tanggalBimbingan?: string;
      topikBimbingan?: string;
      permasalahan?: string;
      solusi?: string;
      statusBkd?: boolean;
      kategoriId?: number | null;
    },
  ) {
    const topikVal = data.topikBimbingan !== undefined ? data.topikBimbingan : data.permasalahan;

    const [updatedSesi] = await db
      .update(sesiBimbingan)
      .set({
        ...data,
        topikBimbingan: topikVal,
        permasalahan: topikVal,
        kategoriId: data.kategoriId !== undefined ? data.kategoriId : undefined,
        tanggalBimbingan: data.tanggalBimbingan,
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

  static async getMonitoringBimbingan(dosenId?: number, kategori?: string) {
    try {
      const activePeriode = await this.getActivePeriode();
      if (!activePeriode) {
        return [];
      }

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

      queryBuilder.orderBy(mahasiswa.nim);
      const listMahasiswa = await queryBuilder;

      const bimbConditions = [eq(bimbingan.periodeId, activePeriode.id)];
      if (kategori && kategori !== 'ALL') {
        bimbConditions.push(eq(bimbingan.kategori, kategori));
      }

      let listBimbingan: (typeof bimbingan.$inferSelect)[] = [];
      try {
        listBimbingan = await db
          .select()
          .from(bimbingan)
          .where(and(...bimbConditions));
      } catch (e: unknown) {
        console.error('[BimbinganService] Error querying bimbingan:', e);
      }

      const mapBimbingan = new Map<number, typeof bimbingan.$inferSelect>();
      const bimbinganIds: number[] = [];
      for (const b of listBimbingan) {
        mapBimbingan.set(b.mahasiswaId, b);
        bimbinganIds.push(b.id);
      }

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
          console.error('[BimbinganService] Error querying sesiBimbingan:', e);
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
        const topik = bimb?.topikBimbingan || bimb?.permasalahan || null;
        return {
          ...mhs,
          bimbinganId: bimb?.id || null,
          ringkasan: bimb?.ringkasan || null,
          isApproved: bimb?.isApproved || false,
          totalSesi,
          topikBimbingan: topik,
          permasalahan: topik,
          solusi: bimb?.solusi || null,
          tanggalBimbingan: bimb?.tanggalBimbingan || null,
          statusBkd: bimb?.statusBkd || false,
          kategori: bimb?.kategori || 'PA',
          isReadByMahasiswa: bimb?.isReadByMahasiswa ?? true,
          readAtMahasiswa: bimb?.readAtMahasiswa || null,
          createdAt: bimb?.createdAt || null,
        };
      });
    } catch (err: unknown) {
      console.error('[BimbinganService] Error in getMonitoringBimbingan:', err);
      return [];
    }
  }

  static async getRekapBimbinganDosen(dosenId?: number, periodeId?: string, kategori?: string) {
    const filterPeriodeId = periodeId || (await this.getActivePeriode())?.id;
    if (!filterPeriodeId) {
      return [];
    }

    const conditions = [eq(bimbingan.periodeId, filterPeriodeId)];
    if (dosenId !== undefined) {
      conditions.push(eq(bimbingan.dosenId, dosenId));
    }
    if (kategori && kategori !== 'ALL') {
      conditions.push(eq(bimbingan.kategori, kategori));
    }

    const bimbinganList = await db
      .select({
        id: bimbingan.id,
        mahasiswaId: bimbingan.mahasiswaId,
        dosenId: bimbingan.dosenId,
        periodeId: bimbingan.periodeId,
        ringkasan: bimbingan.ringkasan,
        isApproved: bimbingan.isApproved,
        topikBimbingan: bimbingan.topikBimbingan,
        permasalahan: bimbingan.permasalahan,
        kategori: bimbingan.kategori,
        isReadByMahasiswa: bimbingan.isReadByMahasiswa,
        readAtMahasiswa: bimbingan.readAtMahasiswa,
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
      const topik = b.topikBimbingan || b.permasalahan || null;
      return {
        ...b,
        topikBimbingan: topik,
        permasalahan: topik,
        sesi: sesi.map((s) => ({
          ...s,
          topikBimbingan: s.topikBimbingan || s.permasalahan,
          permasalahan: s.topikBimbingan || s.permasalahan,
        })),
        totalSesi: sesi.length,
        statusBkd: sesi.some((s) => s.statusBkd),
      };
    });
  }

  static async getMonitoringBimbinganLengkap(filter?: {
    periodeId?: string;
    prodiId?: number;
    dosenPaId?: number;
    kategori?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const activePeriode = await this.getActivePeriode();
    const rawPeriodeId = filter?.periodeId || activePeriode?.id;
    const targetPeriodeId = rawPeriodeId ? String(rawPeriodeId) : undefined;

    if (!targetPeriodeId) {
      return { data: [], meta: { total: 0, page: 1, limit: filter?.limit || 10, totalPages: 0 } };
    }

    const page = Math.max(1, filter?.page || 1);
    const limit = Math.min(10000, Math.max(1, filter?.limit || 10));
    const offset = (page - 1) * limit;
    const search = filter?.search?.trim();
    const kategori = filter?.kategori;

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
      .leftJoin(dosen, eq(mahasiswa.dosenPaId, dosen.id))
      .orderBy(asc(mahasiswa.id));

    const conditions = [];
    if (filter?.dosenPaId) {
      conditions.push(eq(mahasiswa.dosenPaId, filter.dosenPaId));
    }
    if (filter?.prodiId) {
      conditions.push(eq(mahasiswa.programStudiId, filter.prodiId));
    }
    if (search) {
      conditions.push(
        or(ilike(mahasiswa.nim, `%${search}%`), ilike(mahasiswa.nama, `%${search}%`), ilike(dosen.nama, `%${search}%`)),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ total: count() })
      .from(mahasiswa)
      .leftJoin(dosen, eq(mahasiswa.dosenPaId, dosen.id))
      .where(whereClause);

    const total = totalResult?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const listMahasiswa = await mhsQuery.where(whereClause).limit(limit).offset(offset);
    const pageMahasiswaIds = listMahasiswa.map((m) => m.id);

    const bimbConditions = [eq(bimbingan.periodeId, targetPeriodeId)];
    if (pageMahasiswaIds.length > 0) {
      bimbConditions.push(inArray(bimbingan.mahasiswaId, pageMahasiswaIds));
    }
    if (kategori && kategori !== 'ALL') {
      bimbConditions.push(eq(bimbingan.kategori, kategori));
    }

    const listBimbingan =
      pageMahasiswaIds.length > 0
        ? await db
            .select()
            .from(bimbingan)
            .where(and(...bimbConditions))
        : [];

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
        current.push({
          ...s,
          topikBimbingan: s.topikBimbingan || s.permasalahan,
          permasalahan: s.topikBimbingan || s.permasalahan,
        });
        sesiMap.set(s.bimbinganId, current);
      }
    }

    const data = listMahasiswa.map((mhs) => {
      const bimb = bimbinganMap.get(mhs.id);
      const sesiList = bimb ? sesiMap.get(bimb.id) || [] : [];
      const topik = bimb?.topikBimbingan || bimb?.permasalahan || null;
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
        kategori: bimb?.kategori || 'PA',
        isReadByMahasiswa: bimb?.isReadByMahasiswa ?? true,
        readAtMahasiswa: bimb?.readAtMahasiswa || null,
        topikBimbingan: topik,
        permasalahan: topik,
        sesiList,
      };
    });

    return { data, meta: { total, page, limit, totalPages } };
  }
}
