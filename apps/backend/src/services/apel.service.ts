import { and, asc, count, desc, eq, ilike, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm';
import {
  dosen,
  kelompokApel,
  kelompokApelAnggota,
  mahasiswa,
  presensiApel,
  programStudi,
  sesiApel,
  users,
} from '../models/schema';
import { db } from '../utils/db';

export class ApelService {
  static async createKelompok(data: {
    namaKelompok: string;
    dosenId?: number | null;
    shift?: string;
    keterangan?: string;
  }) {
    const [kelompok] = await db
      .insert(kelompokApel)
      .values({
        namaKelompok: data.namaKelompok,
        dosenId: data.dosenId || null,
        shift: data.shift || 'pagi',
        keterangan: data.keterangan,
      })
      .returning();
    return kelompok;
  }

  static async updateKelompok(
    id: number,
    data: { namaKelompok?: string; dosenId?: number; shift?: string; keterangan?: string; isActive?: boolean },
  ) {
    const [updated] = await db.update(kelompokApel).set(data).where(eq(kelompokApel.id, id)).returning();
    if (!updated) throw new Error('Kelompok apel tidak ditemukan');
    return updated;
  }

  static async deleteKelompok(id: number) {
    const [deleted] = await db.update(kelompokApel).set({ isActive: false }).where(eq(kelompokApel.id, id)).returning();
    if (!deleted) throw new Error('Kelompok apel tidak ditemukan');
    return { message: 'Kelompok apel berhasil dinonaktifkan' };
  }

  static async getKelompokByProdi(_prodiId?: number, dosenId?: number) {
    const conditions = [eq(kelompokApel.isActive, true)];
    if (dosenId) {
      conditions.push(or(eq(kelompokApel.dosenId, dosenId), isNull(kelompokApel.dosenId))!);
    }

    const rows = await db
      .select({
        id: kelompokApel.id,
        namaKelompok: kelompokApel.namaKelompok,
        dosenId: kelompokApel.dosenId,
        dosenNama: dosen.nama,
        shift: kelompokApel.shift,
        keterangan: kelompokApel.keterangan,
        isActive: kelompokApel.isActive,
        jumlahAnggota: sql<number>`(SELECT COUNT(*) FROM ${kelompokApelAnggota} WHERE ${kelompokApelAnggota.kelompokApelId} = ${kelompokApel.id})`,
      })
      .from(kelompokApel)
      .leftJoin(dosen, eq(kelompokApel.dosenId, dosen.id))
      .where(and(...conditions))
      .orderBy(kelompokApel.namaKelompok);

    return rows;
  }

  static async getKelompokDetail(id: number) {
    const [kelompok] = await db
      .select({
        id: kelompokApel.id,
        namaKelompok: kelompokApel.namaKelompok,
        dosenId: kelompokApel.dosenId,
        dosenNama: dosen.nama,
        shift: kelompokApel.shift,
        keterangan: kelompokApel.keterangan,
        isActive: kelompokApel.isActive,
      })
      .from(kelompokApel)
      .leftJoin(dosen, eq(kelompokApel.dosenId, dosen.id))
      .where(eq(kelompokApel.id, id));

    if (!kelompok) throw new Error('Kelompok apel tidak ditemukan');

    const anggota = await db
      .select({
        id: kelompokApelAnggota.id,
        mahasiswaId: kelompokApelAnggota.mahasiswaId,
        nim: mahasiswa.nim,
        nama: mahasiswa.nama,
      })
      .from(kelompokApelAnggota)
      .leftJoin(mahasiswa, eq(kelompokApelAnggota.mahasiswaId, mahasiswa.id))
      .where(eq(kelompokApelAnggota.kelompokApelId, id))
      .orderBy(mahasiswa.nama);

    return { ...kelompok, anggota };
  }

  static async addAnggota(kelompokId: number, mahasiswaIds: number[]) {
    const existing = await db
      .select({ mahasiswaId: kelompokApelAnggota.mahasiswaId })
      .from(kelompokApelAnggota)
      .where(
        and(eq(kelompokApelAnggota.kelompokApelId, kelompokId), inArray(kelompokApelAnggota.mahasiswaId, mahasiswaIds)),
      );

    const existingIds = new Set(existing.map((e) => e.mahasiswaId));
    const newIds = mahasiswaIds.filter((id) => !existingIds.has(id));

    if (newIds.length > 0) {
      const values = newIds.map((mahasiswaId) => ({
        kelompokApelId: kelompokId,
        mahasiswaId,
      }));
      await db.insert(kelompokApelAnggota).values(values);
    }

    return { added: newIds.length, skipped: mahasiswaIds.length - newIds.length };
  }

  static async removeAnggota(kelompokId: number, mahasiswaId: number) {
    await db
      .delete(kelompokApelAnggota)
      .where(and(eq(kelompokApelAnggota.kelompokApelId, kelompokId), eq(kelompokApelAnggota.mahasiswaId, mahasiswaId)));
    return { message: 'Anggota berhasil dihapus' };
  }

  static async bukaSesi(data: {
    kelompokApelId: number;
    tanggal: string;
    shift: string;
    dosenId: number;
    jamMulai: string;
    catatan?: string | null;
  }) {
    const [existing] = await db
      .select({ id: sesiApel.id })
      .from(sesiApel)
      .where(
        and(
          eq(sesiApel.kelompokApelId, data.kelompokApelId),
          eq(sesiApel.tanggal, data.tanggal),
          eq(sesiApel.shift, data.shift),
        ),
      );

    if (existing) {
      throw new Error(
        `Sesi apel kelompok ini untuk tanggal ${data.tanggal} shift '${data.shift}' sudah pernah dibuka.`,
      );
    }

    const [sesi] = await db.insert(sesiApel).values(data).returning();

    const anggota = await db
      .select({ mahasiswaId: kelompokApelAnggota.mahasiswaId })
      .from(kelompokApelAnggota)
      .where(eq(kelompokApelAnggota.kelompokApelId, data.kelompokApelId));

    if (anggota.length > 0) {
      const presensiValues = anggota.map((a) => ({
        sesiApelId: sesi.id,
        mahasiswaId: a.mahasiswaId,
        status: 'hadir' as const,
      }));
      await db.insert(presensiApel).values(presensiValues);
    }

    return { ...sesi, jumlahAnggota: anggota.length };
  }

  static async submitPresensi(
    sesiId: number,
    presensiList: Array<{
      mahasiswaId: number;
      status: string;
      menitTerlambat?: number | null;
      keterangan?: string | null;
    }>,
  ) {
    const [foundSesi] = await db.select().from(sesiApel).where(eq(sesiApel.id, sesiId));
    if (!foundSesi) throw new Error('Sesi apel tidak ditemukan');
    if (foundSesi.isClosed) throw new Error('Sesi apel sudah ditutup');

    for (const item of presensiList) {
      const menit =
        item.status !== 'hadir'
          ? item.menitTerlambat !== undefined && item.menitTerlambat !== null
            ? item.menitTerlambat
            : 0
          : null;

      const [existing] = await db
        .select({ id: presensiApel.id })
        .from(presensiApel)
        .where(and(eq(presensiApel.sesiApelId, sesiId), eq(presensiApel.mahasiswaId, item.mahasiswaId)));

      if (existing) {
        await db
          .update(presensiApel)
          .set({
            // biome-ignore lint/suspicious/noExplicitAny: Drizzle enum type mismatch
            status: item.status as any,
            menitTerlambat: menit,
            keterangan: item.keterangan ?? null,
          })
          .where(eq(presensiApel.id, existing.id));
      } else {
        await db.insert(presensiApel).values({
          sesiApelId: sesiId,
          mahasiswaId: item.mahasiswaId,
          // biome-ignore lint/suspicious/noExplicitAny: Drizzle enum type mismatch
          status: item.status as any,
          menitTerlambat: menit,
          keterangan: item.keterangan ?? null,
        });
      }
    }

    return { message: 'Presensi apel berhasil disimpan' };
  }

  static async getSesiPresensi(sesiId: number) {
    const [sesi] = await db
      .select({
        id: sesiApel.id,
        kelompokApelId: sesiApel.kelompokApelId,
        kelompokNama: kelompokApel.namaKelompok,
        tanggal: sesiApel.tanggal,
        shift: sesiApel.shift,
        dosenId: sesiApel.dosenId,
        dosenNama: dosen.nama,
        jamMulai: sesiApel.jamMulai,
        catatan: sesiApel.catatan,
        isClosed: sesiApel.isClosed,
      })
      .from(sesiApel)
      .leftJoin(kelompokApel, eq(sesiApel.kelompokApelId, kelompokApel.id))
      .leftJoin(dosen, eq(sesiApel.dosenId, dosen.id))
      .where(eq(sesiApel.id, sesiId));

    if (!sesi) throw new Error('Sesi apel tidak ditemukan');

    const rows = await db
      .select({
        id: presensiApel.id,
        sesiApelId: presensiApel.sesiApelId,
        mahasiswaId: presensiApel.mahasiswaId,
        mahasiswaNim: mahasiswa.nim,
        mahasiswaNama: mahasiswa.nama,
        status: presensiApel.status,
        menitTerlambat: presensiApel.menitTerlambat,
        keterangan: presensiApel.keterangan,
        verifiedStatus: presensiApel.verifiedStatus,
        verifiedAt: presensiApel.verifiedAt,
        verificationNote: presensiApel.verificationNote,
      })
      .from(presensiApel)
      .leftJoin(mahasiswa, eq(presensiApel.mahasiswaId, mahasiswa.id))
      .where(eq(presensiApel.sesiApelId, sesiId))
      .orderBy(mahasiswa.nim, mahasiswa.nama);

    return { sesi, presensi: rows };
  }

  static async getSesiByKelompok(kelompokId: number) {
    const rows = await db
      .select({
        id: sesiApel.id,
        kelompokApelId: sesiApel.kelompokApelId,
        tanggal: sesiApel.tanggal,
        shift: sesiApel.shift,
        dosenId: sesiApel.dosenId,
        dosenNama: dosen.nama,
        jamMulai: sesiApel.jamMulai,
        isClosed: sesiApel.isClosed,
        closedAt: sesiApel.closedAt,
        createdAt: sesiApel.createdAt,
        jumlahMahasiswa: sql<number>`(SELECT COUNT(*) FROM ${presensiApel} WHERE ${presensiApel.sesiApelId} = ${sesiApel.id})`,
        hadirCount: sql<number>`(SELECT COUNT(*) FROM ${presensiApel} WHERE ${presensiApel.sesiApelId} = ${sesiApel.id} AND ${presensiApel.status} = 'hadir')`,
        terlambatCount: sql<number>`(SELECT COUNT(*) FROM ${presensiApel} WHERE ${presensiApel.sesiApelId} = ${sesiApel.id} AND ${presensiApel.status} = 'terlambat')`,
        unknownCount: sql<number>`(SELECT COUNT(*) FROM ${presensiApel} WHERE ${presensiApel.sesiApelId} = ${sesiApel.id} AND ${presensiApel.status} = 'unknown')`,
      })
      .from(sesiApel)
      .leftJoin(dosen, eq(sesiApel.dosenId, dosen.id))
      .where(eq(sesiApel.kelompokApelId, kelompokId))
      .orderBy(sql`${sesiApel.tanggal} DESC, ${sesiApel.jamMulai} DESC`);

    return rows;
  }

  static async getSesiAktif(dosenId?: number) {
    const conditions = [eq(sesiApel.isClosed, false)];
    if (dosenId) conditions.push(eq(sesiApel.dosenId, dosenId));

    const rows = await db
      .select({
        id: sesiApel.id,
        kelompokApelId: sesiApel.kelompokApelId,
        kelompokNama: kelompokApel.namaKelompok,
        tanggal: sesiApel.tanggal,
        shift: sesiApel.shift,
        dosenId: sesiApel.dosenId,
        dosenNama: dosen.nama,
        jamMulai: sesiApel.jamMulai,
      })
      .from(sesiApel)
      .leftJoin(kelompokApel, eq(sesiApel.kelompokApelId, kelompokApel.id))
      .leftJoin(dosen, eq(sesiApel.dosenId, dosen.id))
      .where(and(...conditions))
      .orderBy(sql`${sesiApel.tanggal} DESC, ${sesiApel.jamMulai} DESC`);

    return rows;
  }

  static async tutupSesi(sesiId: number) {
    const [foundSesi] = await db.select().from(sesiApel).where(eq(sesiApel.id, sesiId));
    if (!foundSesi) throw new Error('Sesi apel tidak ditemukan');
    if (foundSesi.isClosed) throw new Error('Sesi apel sudah ditutup');

    const [updated] = await db
      .update(sesiApel)
      .set({ isClosed: true, closedAt: new Date() })
      .where(eq(sesiApel.id, sesiId))
      .returning();

    return updated;
  }

  static async bukaKembaliSesi(sesiId: number) {
    const [foundSesi] = await db.select().from(sesiApel).where(eq(sesiApel.id, sesiId));
    if (!foundSesi) throw new Error('Sesi apel tidak ditemukan');
    if (!foundSesi.isClosed) throw new Error('Sesi apel belum ditutup');

    const [updated] = await db
      .update(sesiApel)
      .set({ isClosed: false, closedAt: null })
      .where(eq(sesiApel.id, sesiId))
      .returning();

    return updated;
  }

  static async deleteSesi(sesiId: number) {
    const [foundSesi] = await db.select().from(sesiApel).where(eq(sesiApel.id, sesiId));
    if (!foundSesi) throw new Error('Sesi apel tidak ditemukan');

    await db.delete(sesiApel).where(eq(sesiApel.id, sesiId));
    return { message: 'Sesi apel berhasil dihapus' };
  }

  static async updateSesi(
    sesiId: number,
    data: { tanggal?: string; shift?: string; jamMulai?: string; dosenId?: number | null; catatan?: string | null },
  ) {
    const [foundSesi] = await db.select().from(sesiApel).where(eq(sesiApel.id, sesiId));
    if (!foundSesi) throw new Error('Sesi apel tidak ditemukan');

    const updateData: Partial<typeof sesiApel.$inferInsert> = {};
    if (data.tanggal !== undefined) updateData.tanggal = data.tanggal;
    if (data.shift !== undefined) updateData.shift = data.shift;
    if (data.jamMulai !== undefined) updateData.jamMulai = data.jamMulai;
    if (data.dosenId !== undefined && data.dosenId !== null) updateData.dosenId = data.dosenId;
    if (data.catatan !== undefined) updateData.catatan = data.catatan;

    const [updated] = await db.update(sesiApel).set(updateData).where(eq(sesiApel.id, sesiId)).returning();
    return updated;
  }

  static async getPresensiUnknown(
    page = 1,
    limit = 20,
    prodiId?: number,
    kelompokId?: number,
    tanggal?: string,
    search?: string,
    statusFilter?: 'belum' | 'sudah' | 'all',
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
  ) {
    const offset = (page - 1) * limit;
    const conditions = [eq(presensiApel.status, 'unknown')];
    if (prodiId) conditions.push(eq(mahasiswa.programStudiId, prodiId));
    if (kelompokId) conditions.push(eq(sesiApel.kelompokApelId, kelompokId));
    if (tanggal) conditions.push(eq(sesiApel.tanggal, tanggal));
    if (statusFilter === 'belum') conditions.push(isNull(presensiApel.verifiedStatus));
    if (statusFilter === 'sudah') conditions.push(isNotNull(presensiApel.verifiedStatus));
    if (search) {
      const escaped = search.replace(/[\\%_]/g, '\\$&');
      conditions.push(or(ilike(mahasiswa.nim, `%${escaped}%`), ilike(mahasiswa.nama, `%${escaped}%`))!);
    }

    const sortColumns: Record<string, { asc: unknown; desc: unknown }> = {
      nama: { asc: asc(mahasiswa.nama), desc: desc(mahasiswa.nama) },
      nim: { asc: asc(mahasiswa.nim), desc: desc(mahasiswa.nim) },
      tanggal: { asc: asc(sesiApel.tanggal), desc: desc(sesiApel.tanggal) },
      shift: { asc: asc(sesiApel.shift), desc: desc(sesiApel.shift) },
      waktu: { asc: asc(presensiApel.createdAt), desc: desc(presensiApel.createdAt) },
      prodi: { asc: asc(programStudi.nama), desc: desc(programStudi.nama) },
    };

    let orderByClause = sql`${sesiApel.tanggal} DESC, ${presensiApel.createdAt} DESC`;
    if (sortBy && sortColumns[sortBy]) {
      const dir = sortOrder === 'asc' ? sortColumns[sortBy].asc : sortColumns[sortBy].desc;
      orderByClause = sql`${dir}`;
    }

    const [totalResult] = await db
      .select({ total: sql<number>`count(*)` })
      .from(presensiApel)
      .innerJoin(sesiApel, eq(presensiApel.sesiApelId, sesiApel.id))
      .innerJoin(mahasiswa, eq(presensiApel.mahasiswaId, mahasiswa.id))
      .where(and(...conditions));

    const total = Number(totalResult?.total || 0);

    const rows = await db
      .select({
        id: presensiApel.id,
        sesiApelId: presensiApel.sesiApelId,
        mahasiswaId: presensiApel.mahasiswaId,
        mahasiswaNim: mahasiswa.nim,
        mahasiswaNama: mahasiswa.nama,
        mahasiswaProdiId: mahasiswa.programStudiId,
        prodiNama: programStudi.nama,
        tanggal: sesiApel.tanggal,
        shift: sesiApel.shift,
        kelompokNama: kelompokApel.namaKelompok,
        dosenNama: dosen.nama,
        createdAt: presensiApel.createdAt,
        menitTerlambat: presensiApel.menitTerlambat,
        verifiedStatus: presensiApel.verifiedStatus,
        verifiedAt: presensiApel.verifiedAt,
        verifiedBy: presensiApel.verifiedBy,
      })
      .from(presensiApel)
      .innerJoin(sesiApel, eq(presensiApel.sesiApelId, sesiApel.id))
      .innerJoin(mahasiswa, eq(presensiApel.mahasiswaId, mahasiswa.id))
      .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id))
      .leftJoin(kelompokApel, eq(sesiApel.kelompokApelId, kelompokApel.id))
      .leftJoin(dosen, eq(sesiApel.dosenId, dosen.id))
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    return { data: rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  static async verifyPresensi(
    id: number,
    data: { verifiedStatus: string; verifiedBy: number; verificationNote?: string; menitTerlambat?: number | null },
  ) {
    const [found] = await db.select().from(presensiApel).where(eq(presensiApel.id, id));
    if (!found) throw new Error('Presensi apel tidak ditemukan');
    if (found.status !== 'unknown') throw new Error('Status presensi bukan unknown');

    let verificationNote = data.verificationNote;
    if (found.verifiedStatus) {
      const prev = found.verificationNote ? `, catatan sebelumnya: "${found.verificationNote}"` : '';
      verificationNote =
        `[Koreksi] Status sebelumnya: ${found.verifiedStatus}${prev} → ${data.verificationNote || ''}`.trim();
    }

    const [updated] = await db
      .update(presensiApel)
      .set({
        verifiedStatus: data.verifiedStatus as 'hadir' | 'sakit' | 'izin' | 'alpa',
        verifiedBy: data.verifiedBy,
        verifiedAt: new Date(),
        verificationNote,
        menitTerlambat:
          data.menitTerlambat !== undefined && data.menitTerlambat !== null
            ? data.menitTerlambat
            : found.menitTerlambat,
      })
      .where(eq(presensiApel.id, id))
      .returning();

    return updated;
  }

  static async getMonitorRealtime(dosenId?: number, tanggal?: string) {
    const conditions = [eq(sesiApel.isClosed, false)];
    if (dosenId) conditions.push(eq(sesiApel.dosenId, dosenId));
    if (tanggal) conditions.push(eq(sesiApel.tanggal, tanggal));

    const sesiAktif = await db
      .select({
        id: sesiApel.id,
        kelompokApelId: sesiApel.kelompokApelId,
        kelompokNama: kelompokApel.namaKelompok,
        tanggal: sesiApel.tanggal,
        shift: sesiApel.shift,
        dosenId: sesiApel.dosenId,
        dosenNama: dosen.nama,
        jamMulai: sesiApel.jamMulai,
        totalMahasiswa: sql<number>`(SELECT COUNT(*) FROM ${presensiApel} WHERE ${presensiApel.sesiApelId} = ${sesiApel.id})`,
        hadir: sql<number>`(SELECT COUNT(*) FROM ${presensiApel} WHERE ${presensiApel.sesiApelId} = ${sesiApel.id} AND ${presensiApel.status} = 'hadir')`,
        terlambat: sql<number>`(SELECT COUNT(*) FROM ${presensiApel} WHERE ${presensiApel.sesiApelId} = ${sesiApel.id} AND ${presensiApel.status} = 'terlambat')`,
        unknown: sql<number>`(SELECT COUNT(*) FROM ${presensiApel} WHERE ${presensiApel.sesiApelId} = ${sesiApel.id} AND ${presensiApel.status} = 'unknown')`,
      })
      .from(sesiApel)
      .leftJoin(kelompokApel, eq(sesiApel.kelompokApelId, kelompokApel.id))
      .leftJoin(dosen, eq(sesiApel.dosenId, dosen.id))
      .where(and(...conditions))
      .orderBy(sql`${sesiApel.tanggal} DESC, ${sesiApel.jamMulai} DESC`);

    const totalSesiAktif = sesiAktif.length;
    const totalHadir = sesiAktif.reduce((s, r) => s + Number(r.hadir), 0);
    const totalTerlambat = sesiAktif.reduce((s, r) => s + Number(r.terlambat), 0);
    const totalUnknown = sesiAktif.reduce((s, r) => s + Number(r.unknown), 0);

    return {
      summary: { totalSesiAktif, totalHadir, totalTerlambat, totalUnknown },
      detail: sesiAktif,
    };
  }

  static async getRekapApel(kelompokId: number) {
    const rows = await db
      .select({
        mahasiswaId: mahasiswa.id,
        nim: mahasiswa.nim,
        nama: mahasiswa.nama,
        totalHadir: sql<number>`COALESCE(SUM(CASE WHEN ${presensiApel.status} = 'hadir' THEN 1 ELSE 0 END), 0)`,
        totalTerlambat: sql<number>`COALESCE(SUM(CASE WHEN ${presensiApel.status} = 'terlambat' THEN 1 ELSE 0 END), 0)`,
        totalUnknown: sql<number>`COALESCE(SUM(CASE WHEN ${presensiApel.status} = 'unknown' THEN 1 ELSE 0 END), 0)`,
        totalMenitTerlambat: sql<number>`COALESCE(SUM(${presensiApel.menitTerlambat}), 0)`,
      })
      .from(kelompokApelAnggota)
      .leftJoin(mahasiswa, eq(kelompokApelAnggota.mahasiswaId, mahasiswa.id))
      .leftJoin(
        presensiApel,
        and(eq(presensiApel.mahasiswaId, mahasiswa.id), eq(presensiApel.sesiApelId, sql`${sesiApel.id}`)),
      )
      .leftJoin(sesiApel, eq(sesiApel.kelompokApelId, kelompokApelAnggota.kelompokApelId))
      .where(eq(kelompokApelAnggota.kelompokApelId, kelompokId))
      .groupBy(mahasiswa.id, mahasiswa.nim, mahasiswa.nama)
      .orderBy(mahasiswa.nama);

    return rows;
  }

  static async getDosenByEmail(email: string) {
    const [found] = await db.select().from(dosen).where(eq(dosen.email, email));
    return found || null;
  }

  static async getDosenById(id: number) {
    const [found] = await db.select().from(dosen).where(eq(dosen.id, id));
    return found || null;
  }
}
