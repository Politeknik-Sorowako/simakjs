import { randomBytes } from 'node:crypto';
import { and, asc, count, eq, ilike, inArray, isNotNull, or, type SQL, sql } from 'drizzle-orm';
import {
  bap,
  bapPraktikum,
  dosen,
  kelasKuliah,
  ketidakhadiranMahasiswa,
  krs,
  mahasiswa,
  mataKuliah,
  nilaiKomponenMahasiswa,
  nilaiPraktik,
  presensi,
  presensiPraktikum,
  programStudi,
  rombelEnrollmentLog,
  rombelPraktikum,
  rombelPraktikumMahasiswa,
  users,
} from '../models/schema';
import { db } from '../utils/db';

export class RombelPraktikumService {
  static async getByKelas(kelasKuliahId: number) {
    const list = await db.query.rombelPraktikum.findMany({
      where: eq(rombelPraktikum.kelasKuliahId, kelasKuliahId),
      with: {
        instruktur: true,
        mahasiswaList: {
          with: {
            mahasiswa: true,
          },
        },
      },
    });
    return list.map((r) => ({
      ...r,
      mahasiswaList: [...r.mahasiswaList].sort((a, b) =>
        (a.mahasiswa?.nim || '').localeCompare(b.mahasiswa?.nim || '', 'id'),
      ),
    }));
  }

  static async createRombel(data: {
    kelasKuliahId: number;
    namaGroup: string;
    instrukturId?: number | null;
    keterangan?: string | null;
  }) {
    const [newGroup] = await db.insert(rombelPraktikum).values(data).returning();
    return newGroup;
  }

  static async updateRombel(
    id: number,
    data: Partial<{
      namaGroup: string;
      instrukturId?: number | null;
      keterangan?: string | null;
    }>,
  ) {
    const [updated] = await db.update(rombelPraktikum).set(data).where(eq(rombelPraktikum.id, id)).returning();
    return updated || null;
  }

  static async deleteRombel(id: number) {
    const [deleted] = await db.delete(rombelPraktikum).where(eq(rombelPraktikum.id, id)).returning();
    return deleted || null;
  }

  static async assignMahasiswa(rombelPraktikumId: number, mahasiswaIds: number[]) {
    await db.delete(rombelPraktikumMahasiswa).where(eq(rombelPraktikumMahasiswa.rombelPraktikumId, rombelPraktikumId));

    if (mahasiswaIds.length > 0) {
      await db.insert(rombelPraktikumMahasiswa).values(
        mahasiswaIds.map((mhsId) => ({
          rombelPraktikumId,
          mahasiswaId: mhsId,
        })),
      );
    }
    return true;
  }

  // --- SELF-ENROLLMENT (LINK & QR) ---
  static async generateEnrollmentToken(id: number) {
    const token = randomBytes(16).toString('base64url').slice(0, 24);
    const [updated] = await db
      .update(rombelPraktikum)
      .set({
        enrollmentToken: token,
        enrollmentEnabled: true,
        enrollmentExpiresAt: null,
      })
      .where(eq(rombelPraktikum.id, id))
      .returning();
    if (!updated) {
      throw new Error('Rombel praktikum tidak ditemukan');
    }
    return { token, enrollmentEnabled: true };
  }

  static async toggleEnrollment(id: number, enabled: boolean) {
    const [updated] = await db
      .update(rombelPraktikum)
      .set({ enrollmentEnabled: enabled })
      .where(eq(rombelPraktikum.id, id))
      .returning();
    if (!updated) {
      throw new Error('Rombel praktikum tidak ditemukan');
    }
    return updated;
  }

  static async getMahasiswaIdByEmail(email: string): Promise<number | null> {
    const [mhs] = await db.select({ id: mahasiswa.id }).from(mahasiswa).where(eq(mahasiswa.email, email));
    return mhs?.id ?? null;
  }

  static async getRombelByToken(token: string) {
    const rombel = await db.query.rombelPraktikum.findFirst({
      where: eq(rombelPraktikum.enrollmentToken, token),
      with: {
        instruktur: true,
        kelasKuliah: {
          with: {
            mataKuliah: true,
          },
        },
        mahasiswaList: {
          with: {
            mahasiswa: true,
          },
        },
      },
    });
    return rombel || null;
  }

  static async selfEnroll(token: string, mahasiswaId: number, ipAddress?: string | null, userAgent?: string | null) {
    // Validate the token first (cheap, no lock needed).
    const precheck = await db.query.rombelPraktikum.findFirst({
      where: eq(rombelPraktikum.enrollmentToken, token),
    });
    if (!precheck) {
      throw new Error('Token pendaftaran tidak valid');
    }
    if (!precheck.enrollmentEnabled) {
      throw new Error('Pendaftaran mandiri rombel ini sedang ditutup');
    }

    const enrolledKrs = await db.$count(
      krs,
      and(eq(krs.mahasiswaId, mahasiswaId), eq(krs.kelasKuliahId, precheck.kelasKuliahId)),
    );
    if (enrolledKrs === 0) {
      throw new Error('Mahasiswa belum terdaftar pada kelas mata kuliah ini');
    }

    // The quota check + membership insert + log insert run inside a single
    // transaction with a row-level lock on the rombel row to prevent the race
    // condition where concurrent requests both pass the capacity check.
    const result = await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(rombelPraktikum).where(eq(rombelPraktikum.id, precheck.id)).for('update');
      if (!locked) {
        throw new Error('Rombel praktikum tidak ditemukan');
      }
      if (locked.enrollmentExpiresAt && new Date(locked.enrollmentExpiresAt) < new Date()) {
        throw new Error('Masa pendaftaran rombel telah berakhir');
      }
      if (locked.enrollmentMaxStudents) {
        const currentCount = await tx.$count(
          rombelPraktikumMahasiswa,
          eq(rombelPraktikumMahasiswa.rombelPraktikumId, locked.id),
        );
        if (currentCount >= locked.enrollmentMaxStudents) {
          throw new Error('Kuota mahasiswa rombel sudah penuh');
        }
      }

      const alreadyMember = await tx.$count(
        rombelPraktikumMahasiswa,
        and(
          eq(rombelPraktikumMahasiswa.rombelPraktikumId, locked.id),
          eq(rombelPraktikumMahasiswa.mahasiswaId, mahasiswaId),
        ),
      );
      if (alreadyMember > 0) {
        throw new Error('Mahasiswa sudah terdaftar di rombel ini');
      }

      const [member] = await tx
        .insert(rombelPraktikumMahasiswa)
        .values({ rombelPraktikumId: locked.id, mahasiswaId })
        .returning();

      await tx.insert(rombelEnrollmentLog).values({
        rombelPraktikumId: locked.id,
        mahasiswaId,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      });

      return { member, rombelNama: locked.namaGroup };
    });

    return result;
  }

  static async getEnrollmentLog(id: number) {
    return await db.query.rombelEnrollmentLog.findMany({
      where: eq(rombelEnrollmentLog.rombelPraktikumId, id),
      with: {
        mahasiswa: true,
      },
    });
  }

  // --- BAP PRAKTIKUM ---
  static async getBapByRombel(rombelPraktikumId: number) {
    return await db.query.bapPraktikum.findMany({
      where: eq(bapPraktikum.rombelPraktikumId, rombelPraktikumId),
      with: {
        instruktur: true,
        presensiList: true,
      },
    });
  }

  static async createBap(data: {
    rombelPraktikumId: number;
    tanggal: string;
    sesiKe: number;
    tema?: string | null;
    materi: string;
    catatan?: string | null;
    durasiMenit: number;
    instrukturId?: number | null;
    sesiIds?: number[];
  }) {
    const { sesiIds, ...base } = data;
    if (sesiIds && sesiIds.length > 1) {
      // Multi-sesi: duplicate BAP per selected sesi for repetitive reporting
      const created = [];
      for (const sesiKe of sesiIds) {
        const [row] = await db
          .insert(bapPraktikum)
          .values({ ...base, sesiKe })
          .returning();
        created.push(row);
      }
      // Return first created BAP (consistent single-object shape for the caller)
      return created[0] || null;
    }
    const sesi = sesiIds && sesiIds.length === 1 ? sesiIds[0] : base.sesiKe;
    const [newBap] = await db
      .insert(bapPraktikum)
      .values({ ...base, sesiKe: sesi })
      .returning();
    return newBap;
  }

  static async updateBap(
    id: number,
    data: Partial<{
      tanggal: string;
      sesiKe: number;
      tema?: string | null;
      materi: string;
      catatan?: string | null;
      durasiMenit: number;
      instrukturId?: number | null;
    }>,
  ) {
    const [updated] = await db.update(bapPraktikum).set(data).where(eq(bapPraktikum.id, id)).returning();
    return updated || null;
  }

  static async deleteBap(id: number) {
    await db.delete(presensiPraktikum).where(eq(presensiPraktikum.bapPraktikumId, id));
    const [deleted] = await db.delete(bapPraktikum).where(eq(bapPraktikum.id, id)).returning();
    return deleted || null;
  }

  static async updateBapBulk(data: {
    bapPraktikumId: number;
    tanggal: string;
    sesiIds: number[];
    tema?: string | null;
    materi: string;
    catatan?: string | null;
    durasiMenit: number;
    instrukturId?: number | null;
  }) {
    const { bapPraktikumId, sesiIds, ...updates } = data;
    const primary = await db.query.bapPraktikum.findFirst({ where: eq(bapPraktikum.id, bapPraktikumId) });
    if (!primary) {
      throw new Error('BAP praktikum tidak ditemukan.');
    }
    const targetDate = updates.tanggal;
    const sesiSet = new Set(sesiIds.filter((s) => !isNaN(Number(s)) && Number(s) > 0).map((s) => Number(s)));

    const sameDateRows = await db
      .select({ id: bapPraktikum.id, sesiKe: bapPraktikum.sesiKe })
      .from(bapPraktikum)
      .where(and(eq(bapPraktikum.rombelPraktikumId, primary.rombelPraktikumId), eq(bapPraktikum.tanggal, targetDate)));

    // Keep the primary BAP (update it), delete any other same-date BAPs not in selection.
    const existingSesiSet = new Set(sameDateRows.map((r) => Number(r.sesiKe)));
    const primaryKept = sameDateRows.some((r) => r.id === bapPraktikumId);

    if (primaryKept) {
      await db.update(bapPraktikum).set(updates).where(eq(bapPraktikum.id, bapPraktikumId));
      for (const row of sameDateRows) {
        if (row.id !== bapPraktikumId && !sesiSet.has(Number(row.sesiKe))) {
          await db.delete(bapPraktikum).where(eq(bapPraktikum.id, row.id));
        }
      }
    } else {
      await db.delete(bapPraktikum).where(eq(bapPraktikum.id, bapPraktikumId));
    }

    // Determine final existing sesi set after deletions.
    const afterDelete = await db
      .select({ sesiKe: bapPraktikum.sesiKe })
      .from(bapPraktikum)
      .where(and(eq(bapPraktikum.rombelPraktikumId, primary.rombelPraktikumId), eq(bapPraktikum.tanggal, targetDate)));
    const finalExisting = new Set(afterDelete.map((r) => Number(r.sesiKe)));

    if (finalExisting.size === 0 && sesiSet.size > 0) {
      // No primary BAP kept; create a fresh one for the first selected sesi.
      const firstSesi = Number(Math.min(...Array.from(sesiSet)));
      await db
        .insert(bapPraktikum)
        .values({ ...updates, sesiKe: firstSesi, rombelPraktikumId: primary.rombelPraktikumId });
      finalExisting.add(firstSesi);
    }

    // Create missing BAP records for selected sesi not yet present.
    for (const sesiKe of Array.from(sesiSet)) {
      if (!finalExisting.has(sesiKe)) {
        await db.insert(bapPraktikum).values({ ...updates, sesiKe, rombelPraktikumId: primary.rombelPraktikumId });
      }
    }

    void existingSesiSet;
    return await db
      .select()
      .from(bapPraktikum)
      .where(and(eq(bapPraktikum.rombelPraktikumId, primary.rombelPraktikumId), eq(bapPraktikum.tanggal, targetDate)));
  }

  static async savePresensiBulk(
    bapPraktikumId: number,
    presensiList: {
      mahasiswaId: number;
      status: 'hadir' | 'izin' | 'sakit' | 'alpa' | 'telat' | 'unknown';
      durasiMangkir?: number;
      keterangan?: string;
    }[],
    adminUserId?: number | null,
  ) {
    const [bapPrak] = await db
      .select({ tanggal: bapPraktikum.tanggal })
      .from(bapPraktikum)
      .where(eq(bapPraktikum.id, bapPraktikumId));
    if (!bapPrak) {
      throw new Error('BAP praktikum tidak ditemukan');
    }

    let inserted: Array<{ id: number; mahasiswaId: number; status: string; durasiMangkir: number }> = [];

    await db.transaction(async (tx) => {
      await tx.delete(presensiPraktikum).where(eq(presensiPraktikum.bapPraktikumId, bapPraktikumId));

      if (presensiList.length > 0) {
        inserted = await tx
          .insert(presensiPraktikum)
          .values(
            presensiList.map((p) => ({
              bapPraktikumId,
              mahasiswaId: p.mahasiswaId,
              status: p.status as 'hadir' | 'sakit' | 'izin' | 'telat' | 'alpa' | 'unknown',
              durasiMangkir: p.durasiMangkir || 0,
              keterangan: p.keterangan || null,
            })),
          )
          .returning({
            id: presensiPraktikum.id,
            mahasiswaId: presensiPraktikum.mahasiswaId,
            status: presensiPraktikum.status,
            durasiMangkir: presensiPraktikum.durasiMangkir,
          });
      }

      // Sinkron ke tabel terpusat ketidakhadiran (single source of truth).
      const absentRows = inserted.filter((row) => row.status !== 'hadir');
      if (absentRows.length > 0) {
        const ketidakhadiranRows = absentRows.map((row) => ({
          mahasiswaId: row.mahasiswaId,
          tanggal: bapPrak.tanggal,
          sumber: 'PRAKTIKUM' as const,
          sumberId: row.id,
          status: (row.status === 'telat' ? 'TERLAMBAT' : row.status.toUpperCase()) as
            | 'UNKNOWN'
            | 'SAKIT'
            | 'IZIN'
            | 'ALPA'
            | 'TERLAMBAT'
            | 'RUSAK',
          durasiMenit: row.durasiMangkir,
          keterangan: null,
          isVerified: row.status !== 'unknown',
          createdBy: adminUserId ?? null,
        }));
        await tx
          .insert(ketidakhadiranMahasiswa)
          .values(ketidakhadiranRows)
          .onConflictDoUpdate({
            target: [ketidakhadiranMahasiswa.sumber, ketidakhadiranMahasiswa.sumberId],
            set: {
              status: sql`excluded.status`,
              durasiMenit: sql`excluded.durasi_menit`,
              isVerified: sql`excluded.is_verified`,
              keterangan: sql`excluded.keterangan`,
            },
          });
      }
    });

    return true;
  }

  static async getPresensiByBap(bapPraktikumId: number) {
    const rows = await db
      .select({
        id: presensiPraktikum.id,
        bapPraktikumId: presensiPraktikum.bapPraktikumId,
        mahasiswaId: presensiPraktikum.mahasiswaId,
        status: presensiPraktikum.status,
        durasiMangkir: presensiPraktikum.durasiMangkir,
        keterangan: presensiPraktikum.keterangan,
        resolvedAt: presensiPraktikum.resolvedAt,
        isVerified: ketidakhadiranMahasiswa.isVerified,
        verifiedAt: ketidakhadiranMahasiswa.verifiedAt,
        verifiedByName: users.nama,
        mahasiswa: {
          id: mahasiswa.id,
          nim: mahasiswa.nim,
          nama: mahasiswa.nama,
        },
      })
      .from(presensiPraktikum)
      .leftJoin(mahasiswa, eq(presensiPraktikum.mahasiswaId, mahasiswa.id))
      .leftJoin(
        ketidakhadiranMahasiswa,
        and(
          eq(ketidakhadiranMahasiswa.sumber, 'PRAKTIKUM'),
          eq(ketidakhadiranMahasiswa.sumberId, presensiPraktikum.id),
        ),
      )
      .leftJoin(users, eq(ketidakhadiranMahasiswa.verifiedBy, users.id))
      .where(eq(presensiPraktikum.bapPraktikumId, bapPraktikumId))
      .orderBy(asc(mahasiswa.nim));
    return rows;
  }

  static async getUnknownPresensiPraktikum(
    page = 1,
    limit = 20,
    search?: string,
    prodiIds?: number[],
    statusFilter?: 'belum' | 'sudah',
  ) {
    let baseCondition: SQL<unknown>;
    if (statusFilter === 'belum') {
      baseCondition = eq(presensiPraktikum.status, 'unknown');
    } else if (statusFilter === 'sudah') {
      baseCondition = isNotNull(presensiPraktikum.resolvedAt);
    } else {
      baseCondition = or(eq(presensiPraktikum.status, 'unknown'), isNotNull(presensiPraktikum.resolvedAt))!;
    }
    const conditions: SQL<unknown>[] = [baseCondition];
    if (search) {
      const orCondition = or(ilike(mahasiswa.nama, `%${search}%`), ilike(mahasiswa.nim, `%${search}%`));
      if (orCondition) conditions.push(orCondition);
    }
    if (prodiIds && prodiIds.length > 0) {
      conditions.push(inArray(mahasiswa.programStudiId, prodiIds));
    }
    const whereClause = and(...conditions);

    const [totalResult] = await db
      .select({ total: count() })
      .from(presensiPraktikum)
      .innerJoin(mahasiswa, eq(presensiPraktikum.mahasiswaId, mahasiswa.id))
      .where(whereClause);
    const total = totalResult?.total || 0;

    const rows = await db
      .select({
        id: presensiPraktikum.id,
        bapPraktikumId: presensiPraktikum.bapPraktikumId,
        mahasiswaId: presensiPraktikum.mahasiswaId,
        nim: mahasiswa.nim,
        nama: mahasiswa.nama,
        foto: mahasiswa.foto,
        programStudiId: mahasiswa.programStudiId,
        prodiNama: programStudi.nama,
        status: presensiPraktikum.status,
        durasiMangkir: presensiPraktikum.durasiMangkir,
        keterangan: presensiPraktikum.keterangan,
        keteranganAdmin: presensiPraktikum.keteranganAdmin,
        resolvedAt: presensiPraktikum.resolvedAt,
        resolvedBy: presensiPraktikum.resolvedBy,
        resolvedByName: users.nama,
        createdAt: presensiPraktikum.createdAt,
        bapPrakTanggal: bapPraktikum.tanggal,
        bapPrakSesiKe: bapPraktikum.sesiKe,
        bapPrakMateri: bapPraktikum.materi,
        namaGroup: rombelPraktikum.namaGroup,
        kelasKuliahId: kelasKuliah.id,
        namaKelas: kelasKuliah.namaKelas,
        mataKuliahKode: mataKuliah.kode,
        mataKuliahNama: mataKuliah.nama,
        dosenNama: dosen.nama,
      })
      .from(presensiPraktikum)
      .innerJoin(mahasiswa, eq(presensiPraktikum.mahasiswaId, mahasiswa.id))
      .innerJoin(bapPraktikum, eq(presensiPraktikum.bapPraktikumId, bapPraktikum.id))
      .innerJoin(rombelPraktikum, eq(bapPraktikum.rombelPraktikumId, rombelPraktikum.id))
      .leftJoin(kelasKuliah, eq(rombelPraktikum.kelasKuliahId, kelasKuliah.id))
      .leftJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
      .leftJoin(dosen, eq(rombelPraktikum.instrukturId, dosen.id))
      .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id))
      .leftJoin(users, eq(presensiPraktikum.resolvedBy, users.id))
      .where(whereClause)
      .limit(limit)
      .offset((page - 1) * limit)
      .orderBy(bapPraktikum.tanggal);

    const totalPages = Math.ceil(total / limit);
    return { data: rows, meta: { total, page, limit, totalPages } };
  }

  // --- SYNC ENGINE: PRAKTIKUM -> KELAS INDUK ---

  static async syncPresensiPraktikumToKelas(bapPraktikumId: number) {
    const [bapPrak] = await db.select().from(bapPraktikum).where(eq(bapPraktikum.id, bapPraktikumId));
    if (!bapPrak) {
      throw new Error('BAP praktikum tidak ditemukan');
    }

    const [rombel] = await db.select().from(rombelPraktikum).where(eq(rombelPraktikum.id, bapPrak.rombelPraktikumId));
    if (!rombel) {
      throw new Error('Rombel praktikum tidak ditemukan');
    }

    const presensiList = await db
      .select()
      .from(presensiPraktikum)
      .where(eq(presensiPraktikum.bapPraktikumId, bapPraktikumId));

    const dosenId = bapPrak.instrukturId ?? rombel.instrukturId;
    if (!dosenId) {
      throw new Error('Instruktur/dosen belum ditetapkan pada rombel atau BAP praktikum');
    }

    // Cari BAP teori pada kelas & tanggal yang sama agar sync idempotent
    let [bapTeori] = await db
      .select()
      .from(bap)
      .where(and(eq(bap.kelasKuliahId, rombel.kelasKuliahId), eq(bap.tanggal, bapPrak.tanggal)));

    if (!bapTeori) {
      const total = await db.$count(bap, eq(bap.kelasKuliahId, rombel.kelasKuliahId));
      const pertemuanKe = total + 1;

      [bapTeori] = await db
        .insert(bap)
        .values({
          kelasKuliahId: rombel.kelasKuliahId,
          tanggal: bapPrak.tanggal,
          pertemuanKe,
          materi: `[Praktikum] ${bapPrak.materi}`,
          catatan: bapPrak.catatan,
          durasiMenit: bapPrak.durasiMenit,
          dosenId,
        })
        .returning();
    }

    const itemsToInsert = presensiList.map((p) => ({
      bapId: bapTeori.id,
      mahasiswaId: p.mahasiswaId,
      status: p.status,
      durasiMangkir: p.durasiMangkir,
      keterangan: p.keterangan || null,
    }));

    await db.transaction(async (tx) => {
      await tx.delete(presensi).where(eq(presensi.bapId, bapTeori.id));
      if (itemsToInsert.length > 0) {
        await tx.insert(presensi).values(itemsToInsert);
      }
    });

    return { success: true, syncedCount: itemsToInsert.length, bapTeoriId: bapTeori.id };
  }

  static async syncNilaiPraktikumToKelas(rombelPraktikumId: number) {
    const [rombel] = await db.select().from(rombelPraktikum).where(eq(rombelPraktikum.id, rombelPraktikumId));
    if (!rombel) {
      throw new Error('Rombel praktikum tidak ditemukan');
    }

    const nilaiList = await db.select().from(nilaiPraktik).where(eq(nilaiPraktik.rombelPraktikumId, rombelPraktikumId));

    if (nilaiList.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    const mhsIds = [...new Set(nilaiList.map((n) => n.mahasiswaId))];
    const krsList = await db
      .select()
      .from(krs)
      .where(and(inArray(krs.mahasiswaId, mhsIds), eq(krs.kelasKuliahId, rombel.kelasKuliahId)));

    const krsMap = new Map(krsList.map((k) => [k.mahasiswaId, k]));

    // Rata-rata nilai praktikum per mahasiswa per komponen
    const nilaiPerKomponen = new Map<string, { nilai: number; count: number }>();
    for (const n of nilaiList) {
      const key = `${n.mahasiswaId}:${n.komponenNilaiId ?? 'x'}`;
      const cur = nilaiPerKomponen.get(key) || { nilai: 0, count: 0 };
      nilaiPerKomponen.set(key, { nilai: cur.nilai + Number(n.nilaiAngka), count: cur.count + 1 });
    }

    let syncedCount = 0;

    await db.transaction(async (tx) => {
      for (const [key, agg] of nilaiPerKomponen) {
        const [mhsIdStr, komponenIdStr] = key.split(':');
        const mhsId = parseInt(mhsIdStr);
        const krsRecord = krsMap.get(mhsId);
        if (!krsRecord) continue;

        const komponenId = komponenIdStr === 'x' ? null : parseInt(komponenIdStr);
        const nilaiRata = agg.nilai / agg.count;

        if (komponenId !== null) {
          const existing = await tx
            .select({ id: nilaiKomponenMahasiswa.id })
            .from(nilaiKomponenMahasiswa)
            .where(
              and(
                eq(nilaiKomponenMahasiswa.krsId, krsRecord.id),
                eq(nilaiKomponenMahasiswa.komponenNilaiId, komponenId),
              ),
            );
          if (existing.length > 0) {
            await tx
              .update(nilaiKomponenMahasiswa)
              .set({ nilai: String(nilaiRata.toFixed(2)) })
              .where(eq(nilaiKomponenMahasiswa.id, existing[0].id));
          } else {
            await tx.insert(nilaiKomponenMahasiswa).values({
              krsId: krsRecord.id,
              komponenNilaiId: komponenId,
              nilai: String(nilaiRata.toFixed(2)),
            });
          }
          syncedCount++;
        } else {
          await tx
            .update(krs)
            .set({ nilaiAngka: String(nilaiRata.toFixed(2)) })
            .where(eq(krs.id, krsRecord.id));
          syncedCount++;
        }
      }
    });

    return { success: true, syncedCount };
  }
}
