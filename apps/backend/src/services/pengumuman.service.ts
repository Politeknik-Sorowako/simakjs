import { and, asc, desc, eq, ilike, inArray, isNull, lte, or, type SQLWrapper, sql } from 'drizzle-orm';
import {
  dosen,
  dosenPengajarKelas,
  kelasKuliah,
  krs,
  mahasiswa,
  mataKuliah,
  pengumuman,
  pengumumanDibaca,
  pengumumanLampiran,
  pengumumanTargetKelas,
  pengumumanTargetProdi,
  pengumumanTargetRombel,
  programStudi,
  rombelPraktikum,
  rombelPraktikumMahasiswa,
  users,
} from '../models/schema';
import { db } from '../utils/db';
import { getDosenAllowedKelasIds, getDosenIdByEmail } from '../utils/dosen-scope';
import { hasRole } from '../utils/role';
import type { UserPayload } from '../utils/types';
import { ProdiScopeService } from './prodi-scope.service';

export interface LampiranPayload {
  tipe: 'file' | 'gambar' | 'link';
  nama: string;
  url: string;
  ukuran?: number | null;
  mimeType?: string | null;
}

export interface SaveDraftPayload {
  id?: number;
  judul?: string;
  konten?: string;
  ringkasan?: string | null;
  targetRole?: 'semua' | 'mahasiswa' | 'dosen' | 'admin';
  targetProdiType?: 'semua' | 'spesifik';
  targetProdiIds?: number[];
  targetScopeType?: 'umum' | 'kelas' | 'rombel';
  targetKelasIds?: number[];
  targetRombelIds?: number[];
  isPinned?: boolean;
  thumbnailUrl?: string | null;
  publishedAt?: string | null;
  expiresAt?: string | null;
  lampiran?: LampiranPayload[];
}

export interface PublishPayload {
  id?: number;
  judul: string;
  konten: string;
  ringkasan?: string | null;
  targetRole: 'semua' | 'mahasiswa' | 'dosen' | 'admin';
  targetProdiType: 'semua' | 'spesifik';
  targetProdiIds?: number[];
  targetScopeType: 'umum' | 'kelas' | 'rombel';
  targetKelasIds?: number[];
  targetRombelIds?: number[];
  isPinned?: boolean;
  thumbnailUrl?: string | null;
  publishMode: 'now' | 'scheduled';
  scheduledPublishAt?: string | null;
  expiresAt?: string | null;
  lampiran?: LampiranPayload[];
}

export class PengumumanService {
  /**
   * Helper: Mengambil target options (prodi, kelas, rombel) yang diizinkan untuk user pembuat
   */
  static async getTargetOptions(user: UserPayload) {
    const isSuperOrAdmin = hasRole(user, ['super_admin', 'admin']);
    const isProdi = hasRole(user, ['prodi', 'kaprodi']);
    const isDosen = hasRole(user, ['dosen', 'instruktur']);

    let prodiList = await db
      .select({ id: programStudi.id, kode: programStudi.kode, nama: programStudi.nama })
      .from(programStudi)
      .orderBy(programStudi.nama);

    if (isProdi && !isSuperOrAdmin) {
      const allowedProdiIds = await ProdiScopeService.getUserAccessibleProdiIds(user);
      if (allowedProdiIds !== null) {
        prodiList = prodiList.filter((p) => allowedProdiIds.includes(p.id));
      }
    }

    let kelasList: { id: number; namaKelas: string; mataKuliah: string; dosenPengajar?: string }[] = [];
    let rombelList: { id: number; namaGroup: string; kelas: string; instruktur?: string }[] = [];

    if (isSuperOrAdmin) {
      const kRows = await db
        .select({
          id: kelasKuliah.id,
          namaKelas: kelasKuliah.namaKelas,
          namaMataKuliah: mataKuliah.nama,
        })
        .from(kelasKuliah)
        .leftJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
        .limit(200);

      const kIds = kRows.map((k) => k.id);
      const dpRows =
        kIds.length > 0
          ? await db
              .select({
                kelasKuliahId: dosenPengajarKelas.kelasKuliahId,
                namaDosen: dosen.nama,
              })
              .from(dosenPengajarKelas)
              .innerJoin(dosen, eq(dosenPengajarKelas.dosenId, dosen.id))
              .where(inArray(dosenPengajarKelas.kelasKuliahId, kIds))
          : [];

      const dosenMap = new Map<number, string[]>();
      for (const dp of dpRows) {
        if (!dosenMap.has(dp.kelasKuliahId)) dosenMap.set(dp.kelasKuliahId, []);
        if (dp.namaDosen) dosenMap.get(dp.kelasKuliahId)!.push(dp.namaDosen);
      }

      kelasList = kRows.map((k) => ({
        id: k.id,
        namaKelas: k.namaKelas,
        mataKuliah: k.namaMataKuliah || k.namaKelas,
        dosenPengajar: (dosenMap.get(k.id) || []).join(', ') || undefined,
      }));

      const rRows = await db
        .select({
          id: rombelPraktikum.id,
          namaGroup: rombelPraktikum.namaGroup,
          namaKelas: kelasKuliah.namaKelas,
          namaInstruktur: dosen.nama,
        })
        .from(rombelPraktikum)
        .leftJoin(kelasKuliah, eq(rombelPraktikum.kelasKuliahId, kelasKuliah.id))
        .leftJoin(dosen, eq(rombelPraktikum.instrukturId, dosen.id))
        .limit(200);

      rombelList = rRows.map((r) => ({
        id: r.id,
        namaGroup: r.namaGroup,
        kelas: r.namaKelas || r.namaGroup,
        instruktur: r.namaInstruktur || undefined,
      }));
    } else if (isProdi) {
      const prodiFilterIds = prodiList.map((p) => p.id);
      if (prodiFilterIds.length > 0) {
        const kRows = await db
          .select({
            id: kelasKuliah.id,
            namaKelas: kelasKuliah.namaKelas,
            namaMataKuliah: mataKuliah.nama,
          })
          .from(kelasKuliah)
          .innerJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
          .where(inArray(mataKuliah.programStudiId, prodiFilterIds))
          .limit(200);

        const kIds = kRows.map((k) => k.id);
        const dpRows =
          kIds.length > 0
            ? await db
                .select({
                  kelasKuliahId: dosenPengajarKelas.kelasKuliahId,
                  namaDosen: dosen.nama,
                })
                .from(dosenPengajarKelas)
                .innerJoin(dosen, eq(dosenPengajarKelas.dosenId, dosen.id))
                .where(inArray(dosenPengajarKelas.kelasKuliahId, kIds))
            : [];

        const dosenMap = new Map<number, string[]>();
        for (const dp of dpRows) {
          if (!dosenMap.has(dp.kelasKuliahId)) dosenMap.set(dp.kelasKuliahId, []);
          if (dp.namaDosen) dosenMap.get(dp.kelasKuliahId)!.push(dp.namaDosen);
        }

        kelasList = kRows.map((k) => ({
          id: k.id,
          namaKelas: k.namaKelas,
          mataKuliah: k.namaMataKuliah || k.namaKelas,
          dosenPengajar: (dosenMap.get(k.id) || []).join(', ') || undefined,
        }));

        const rRows = await db
          .select({
            id: rombelPraktikum.id,
            namaGroup: rombelPraktikum.namaGroup,
            namaKelas: kelasKuliah.namaKelas,
            namaInstruktur: dosen.nama,
          })
          .from(rombelPraktikum)
          .innerJoin(kelasKuliah, eq(rombelPraktikum.kelasKuliahId, kelasKuliah.id))
          .innerJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
          .leftJoin(dosen, eq(rombelPraktikum.instrukturId, dosen.id))
          .where(inArray(mataKuliah.programStudiId, prodiFilterIds))
          .limit(200);

        rombelList = rRows.map((r) => ({
          id: r.id,
          namaGroup: r.namaGroup,
          kelas: r.namaKelas || r.namaGroup,
          instruktur: r.namaInstruktur || undefined,
        }));
      }
    } else if (isDosen) {
      const dosenId = await getDosenIdByEmail(user.email);
      if (dosenId) {
        const allowedKelasIds = await getDosenAllowedKelasIds(dosenId);
        if (allowedKelasIds.length > 0) {
          const kRows = await db
            .select({
              id: kelasKuliah.id,
              namaKelas: kelasKuliah.namaKelas,
              namaMataKuliah: mataKuliah.nama,
            })
            .from(kelasKuliah)
            .leftJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
            .where(inArray(kelasKuliah.id, allowedKelasIds));

          const dpRows = await db
            .select({
              kelasKuliahId: dosenPengajarKelas.kelasKuliahId,
              namaDosen: dosen.nama,
            })
            .from(dosenPengajarKelas)
            .innerJoin(dosen, eq(dosenPengajarKelas.dosenId, dosen.id))
            .where(inArray(dosenPengajarKelas.kelasKuliahId, allowedKelasIds));

          const dosenMap = new Map<number, string[]>();
          for (const dp of dpRows) {
            if (!dosenMap.has(dp.kelasKuliahId)) dosenMap.set(dp.kelasKuliahId, []);
            if (dp.namaDosen) dosenMap.get(dp.kelasKuliahId)!.push(dp.namaDosen);
          }

          kelasList = kRows.map((k) => ({
            id: k.id,
            namaKelas: k.namaKelas,
            mataKuliah: k.namaMataKuliah || k.namaKelas,
            dosenPengajar: (dosenMap.get(k.id) || []).join(', ') || undefined,
          }));

          const rRows = await db
            .select({
              id: rombelPraktikum.id,
              namaGroup: rombelPraktikum.namaGroup,
              namaKelas: kelasKuliah.namaKelas,
              namaInstruktur: dosen.nama,
            })
            .from(rombelPraktikum)
            .leftJoin(kelasKuliah, eq(rombelPraktikum.kelasKuliahId, kelasKuliah.id))
            .leftJoin(dosen, eq(rombelPraktikum.instrukturId, dosen.id))
            .where(
              or(inArray(rombelPraktikum.kelasKuliahId, allowedKelasIds), eq(rombelPraktikum.instrukturId, dosenId)),
            );

          rombelList = rRows.map((r) => ({
            id: r.id,
            namaGroup: r.namaGroup,
            kelas: r.namaKelas || r.namaGroup,
            instruktur: r.namaInstruktur || undefined,
          }));
        }
      }
    }

    return {
      prodi: prodiList,
      kelas: kelasList,
      rombel: rombelList,
    };
  }

  /**
   * Mengambil feed pengumuman publik yang aktif untuk user yang login
   */
  static async getFeed(user: UserPayload, query: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const offset = (page - 1) * limit;

    const userRoles = user.roles || [user.role];
    const isMahasiswa = userRoles.includes('mahasiswa');
    const isDosen = userRoles.some((r) => ['dosen', 'instruktur', 'kaprodi'].includes(r));
    const isAdmin = userRoles.some((r) => ['admin', 'super_admin'].includes(r));

    let mhsProdiId: number | null = null;
    let mhsKelasIds: number[] = [];
    let mhsRombelIds: number[] = [];

    if (isMahasiswa) {
      const [mhs] = await db
        .select({ id: mahasiswa.id, prodiId: mahasiswa.programStudiId })
        .from(mahasiswa)
        .where(ilike(mahasiswa.email, user.email.trim()))
        .limit(1);

      if (mhs) {
        mhsProdiId = mhs.prodiId;
        const krsRows = await db
          .select({ kelasKuliahId: krs.kelasKuliahId })
          .from(krs)
          .where(and(eq(krs.mahasiswaId, mhs.id), eq(krs.isApproved, true)));
        mhsKelasIds = krsRows.map((k) => k.kelasKuliahId);

        const rombelRows = await db
          .select({ rombelId: rombelPraktikumMahasiswa.rombelPraktikumId })
          .from(rombelPraktikumMahasiswa)
          .where(eq(rombelPraktikumMahasiswa.mahasiswaId, mhs.id));
        mhsRombelIds = rombelRows.map((r) => r.rombelId);
      }
    }

    let dosenProdiId: number | null = null;
    let dosenKelasIds: number[] = [];
    let dosenRombelIds: number[] = [];

    if (isDosen) {
      const [dsn] = await db
        .select({ id: dosen.id, prodiId: dosen.programStudiId })
        .from(dosen)
        .where(ilike(dosen.email, user.email.trim()))
        .limit(1);

      if (dsn) {
        dosenProdiId = dsn.prodiId;
        dosenKelasIds = await getDosenAllowedKelasIds(dsn.id);
        const rRows = await db
          .select({ id: rombelPraktikum.id })
          .from(rombelPraktikum)
          .where(
            or(
              dosenKelasIds.length > 0 ? inArray(rombelPraktikum.kelasKuliahId, dosenKelasIds) : sql`false`,
              eq(rombelPraktikum.instrukturId, dsn.id),
            ),
          );
        dosenRombelIds = rRows.map((r) => r.id);
      }
    }

    const now = new Date();

    const allowedRoles: ('semua' | 'mahasiswa' | 'dosen' | 'admin')[] = ['semua'];
    if (isMahasiswa) allowedRoles.push('mahasiswa');
    if (isDosen) allowedRoles.push('dosen');
    if (isAdmin) allowedRoles.push('admin');

    const conditions = [
      inArray(pengumuman.status, ['published', 'scheduled']),
      lte(pengumuman.publishedAt, now),
      or(isNull(pengumuman.expiresAt), sql`${pengumuman.expiresAt} >= ${now}`),
      inArray(pengumuman.targetRole, allowedRoles),
    ];

    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      conditions.push(or(ilike(pengumuman.judul, term), ilike(pengumuman.konten, term))!);
    }

    const baseCandidates = await db
      .select({
        id: pengumuman.id,
        judul: pengumuman.judul,
        ringkasan: pengumuman.ringkasan,
        konten: pengumuman.konten,
        authorId: pengumuman.authorId,
        authorRole: pengumuman.authorRole,
        targetRole: pengumuman.targetRole,
        targetProdiType: pengumuman.targetProdiType,
        targetScopeType: pengumuman.targetScopeType,
        isPinned: pengumuman.isPinned,
        thumbnailUrl: pengumuman.thumbnailUrl,
        publishedAt: pengumuman.publishedAt,
        createdAt: pengumuman.createdAt,
        authorNama: users.nama,
      })
      .from(pengumuman)
      .leftJoin(users, eq(pengumuman.authorId, users.id))
      .where(and(...conditions))
      .orderBy(desc(pengumuman.isPinned), desc(pengumuman.publishedAt))
      .limit(200);

    const candidateIds = baseCandidates.map((c) => c.id);
    if (candidateIds.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const targetProdis = await db
      .select()
      .from(pengumumanTargetProdi)
      .where(inArray(pengumumanTargetProdi.pengumumanId, candidateIds));

    const targetKelas = await db
      .select()
      .from(pengumumanTargetKelas)
      .where(inArray(pengumumanTargetKelas.pengumumanId, candidateIds));

    const targetRombel = await db
      .select()
      .from(pengumumanTargetRombel)
      .where(inArray(pengumumanTargetRombel.pengumumanId, candidateIds));

    const readReceipts = await db
      .select({ pengumumanId: pengumumanDibaca.pengumumanId })
      .from(pengumumanDibaca)
      .where(and(inArray(pengumumanDibaca.pengumumanId, candidateIds), eq(pengumumanDibaca.userId, user.id)));

    const readSet = new Set(readReceipts.map((r) => r.pengumumanId));

    const prodiMap = new Map<number, number[]>();
    for (const p of targetProdis) {
      if (!prodiMap.has(p.pengumumanId)) prodiMap.set(p.pengumumanId, []);
      prodiMap.get(p.pengumumanId)!.push(p.programStudiId);
    }

    const kelasMap = new Map<number, number[]>();
    for (const k of targetKelas) {
      if (!kelasMap.has(k.pengumumanId)) kelasMap.set(k.pengumumanId, []);
      kelasMap.get(k.pengumumanId)!.push(k.kelasKuliahId);
    }

    const rombelMap = new Map<number, number[]>();
    for (const r of targetRombel) {
      if (!rombelMap.has(r.pengumumanId)) rombelMap.set(r.pengumumanId, []);
      rombelMap.get(r.pengumumanId)!.push(r.rombelPraktikumId);
    }

    const filtered = baseCandidates.filter((p) => {
      if (isAdmin) return true;

      if (p.targetProdiType === 'spesifik') {
        const pProdis = prodiMap.get(p.id) || [];
        if (isMahasiswa && mhsProdiId && !pProdis.includes(mhsProdiId)) {
          return false;
        }
        if (isDosen && dosenProdiId && !pProdis.includes(dosenProdiId)) {
          return false;
        }
      }

      if (p.targetScopeType === 'kelas') {
        const pKelas = kelasMap.get(p.id) || [];
        if (isMahasiswa) {
          const hasCommon = mhsKelasIds.some((kId) => pKelas.includes(kId));
          if (!hasCommon) return false;
        } else if (isDosen) {
          const hasCommon = dosenKelasIds.some((kId) => pKelas.includes(kId));
          if (!hasCommon) return false;
        } else {
          return false;
        }
      } else if (p.targetScopeType === 'rombel') {
        const pRombel = rombelMap.get(p.id) || [];
        if (isMahasiswa) {
          const hasCommon = mhsRombelIds.some((rId) => pRombel.includes(rId));
          if (!hasCommon) return false;
        } else if (isDosen) {
          const hasCommon = dosenRombelIds.some((rId) => pRombel.includes(rId));
          if (!hasCommon) return false;
        } else {
          return false;
        }
      }

      return true;
    });

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    const paginatedIds = paginated.map((p) => p.id);
    let lampiranList: (typeof pengumumanLampiran.$inferSelect)[] = [];
    if (paginatedIds.length > 0) {
      lampiranList = await db
        .select()
        .from(pengumumanLampiran)
        .where(inArray(pengumumanLampiran.pengumumanId, paginatedIds));
    }

    const lampiranMap = new Map<number, typeof lampiranList>();
    for (const l of lampiranList) {
      if (!lampiranMap.has(l.pengumumanId)) lampiranMap.set(l.pengumumanId, []);
      lampiranMap.get(l.pengumumanId)!.push(l);
    }

    const result = paginated.map((p) => ({
      ...p,
      isRead: readSet.has(p.id),
      lampiran: lampiranMap.get(p.id) || [],
    }));

    return {
      data: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Mengambil daftar pengumuman yang dikelola oleh user author / admin
   */
  static async getManageList(
    user: UserPayload,
    query: {
      search?: string;
      status?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: string;
    },
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 20));
    const offset = (page - 1) * limit;

    const isSuperOrAdmin = hasRole(user, ['super_admin', 'admin']);
    const conditions = [];

    if (!isSuperOrAdmin) {
      conditions.push(eq(pengumuman.authorId, user.id));
    }

    if (query.status && query.status !== 'all') {
      const validStatuses = pengumuman.status.enumValues;
      if (!validStatuses.includes(query.status as (typeof validStatuses)[number])) {
        throw new Error(`Status tidak valid. Pilihan valid: ${validStatuses.join(', ')} atau 'all'`);
      }
      conditions.push(eq(pengumuman.status, query.status as (typeof validStatuses)[number]));
    }

    if (query.search?.trim()) {
      const term = `%${query.search.trim()}%`;
      conditions.push(
        or(ilike(pengumuman.judul, term), ilike(pengumuman.konten, term), ilike(pengumuman.ringkasan, term))!,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumns: Record<string, SQLWrapper> = {
      judul: pengumuman.judul,
      status: pengumuman.status,
      publishedAt: pengumuman.publishedAt,
      createdAt: pengumuman.createdAt,
      viewCount: pengumuman.viewCount,
    };
    // Guard with Object.hasOwn so prototype keys (e.g. "constructor", "__proto__") fall
    // back to `createdAt` instead of resolving to Object.prototype values and breaking the query.
    const requestedSort = query.sortBy || 'createdAt';
    const selectedSort = Object.hasOwn(sortColumns, requestedSort) ? sortColumns[requestedSort] : pengumuman.createdAt;
    const direction = query.sortOrder === 'asc' ? sql`asc` : sql`desc`;
    // publishedAt nullable: dorong baris tanpa tanggal terbit (draft/terjadwal) ke akhir
    // agar urutan "Terbit" tetap konsisten dengan nilai yang ditampilkan (publishedAt || createdAt).
    const orderBy = [sql`${selectedSort} ${direction} nulls last`, asc(pengumuman.id)];

    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(pengumuman).where(whereClause);

    const rows = await db
      .select({
        id: pengumuman.id,
        judul: pengumuman.judul,
        konten: pengumuman.konten,
        ringkasan: pengumuman.ringkasan,
        authorId: pengumuman.authorId,
        authorRole: pengumuman.authorRole,
        status: pengumuman.status,
        targetRole: pengumuman.targetRole,
        targetProdiType: pengumuman.targetProdiType,
        targetScopeType: pengumuman.targetScopeType,
        isPinned: pengumuman.isPinned,
        thumbnailUrl: pengumuman.thumbnailUrl,
        publishedAt: pengumuman.publishedAt,
        withdrawnAt: pengumuman.withdrawnAt,
        withdrawnReason: pengumuman.withdrawnReason,
        expiresAt: pengumuman.expiresAt,
        lastAutoSavedAt: pengumuman.lastAutoSavedAt,
        viewCount: pengumuman.viewCount,
        createdAt: pengumuman.createdAt,
        updatedAt: pengumuman.updatedAt,
        authorNama: users.nama,
      })
      .from(pengumuman)
      .leftJoin(users, eq(pengumuman.authorId, users.id))
      .where(whereClause)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    const rowIds = rows.map((r) => r.id);
    let lampiranList: (typeof pengumumanLampiran.$inferSelect)[] = [];
    let prodiTargets: { pengumumanId: number; programStudiId: number }[] = [];
    let kelasTargets: { pengumumanId: number; kelasKuliahId: number }[] = [];
    let rombelTargets: { pengumumanId: number; rombelPraktikumId: number }[] = [];

    if (rowIds.length > 0) {
      lampiranList = await db.select().from(pengumumanLampiran).where(inArray(pengumumanLampiran.pengumumanId, rowIds));

      prodiTargets = await db
        .select({
          pengumumanId: pengumumanTargetProdi.pengumumanId,
          programStudiId: pengumumanTargetProdi.programStudiId,
        })
        .from(pengumumanTargetProdi)
        .where(inArray(pengumumanTargetProdi.pengumumanId, rowIds));

      kelasTargets = await db
        .select({
          pengumumanId: pengumumanTargetKelas.pengumumanId,
          kelasKuliahId: pengumumanTargetKelas.kelasKuliahId,
        })
        .from(pengumumanTargetKelas)
        .where(inArray(pengumumanTargetKelas.pengumumanId, rowIds));

      rombelTargets = await db
        .select({
          pengumumanId: pengumumanTargetRombel.pengumumanId,
          rombelPraktikumId: pengumumanTargetRombel.rombelPraktikumId,
        })
        .from(pengumumanTargetRombel)
        .where(inArray(pengumumanTargetRombel.pengumumanId, rowIds));
    }

    const lampiranMap = new Map<number, typeof lampiranList>();
    for (const l of lampiranList) {
      if (!lampiranMap.has(l.pengumumanId)) lampiranMap.set(l.pengumumanId, []);
      lampiranMap.get(l.pengumumanId)!.push(l);
    }

    const data = rows.map((r) => ({
      ...r,
      lampiran: lampiranMap.get(r.id) || [],
      targetProdiIds: prodiTargets.filter((p) => p.pengumumanId === r.id).map((p) => p.programStudiId),
      targetKelasIds: kelasTargets.filter((k) => k.pengumumanId === r.id).map((k) => k.kelasKuliahId),
      targetRombelIds: rombelTargets.filter((rm) => rm.pengumumanId === r.id).map((rm) => rm.rombelPraktikumId),
    }));

    return {
      data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  /**
   * Helper: Validasi apakah author berhak menargetkan prodi, kelas, atau rombel yang dikirim
   */
  private static async validateTargetScopes(
    user: UserPayload,
    payload: {
      targetProdiType?: 'semua' | 'spesifik';
      targetProdiIds?: number[];
      targetScopeType?: 'umum' | 'kelas' | 'rombel';
      targetKelasIds?: number[];
      targetRombelIds?: number[];
    },
  ) {
    const isSuperOrAdmin = hasRole(user, ['super_admin', 'admin']);
    if (isSuperOrAdmin) return;

    const isProdi = hasRole(user, ['prodi', 'kaprodi']);
    const isDosen = hasRole(user, ['dosen', 'instruktur']);

    // 1. Validasi Prodi Target
    if (payload.targetProdiType === 'spesifik' && payload.targetProdiIds && payload.targetProdiIds.length > 0) {
      if (isProdi) {
        const allowedProdiIds = await ProdiScopeService.getUserAccessibleProdiIds(user);
        if (allowedProdiIds !== null) {
          const unauthorized = payload.targetProdiIds.filter((pId) => !allowedProdiIds.includes(pId));
          if (unauthorized.length > 0) {
            throw new Error('Akses ditolak. Anda tidak berhak menargetkan program studi di luar wewenang Anda.');
          }
        }
      } else if (isDosen) {
        const dosenId = await getDosenIdByEmail(user.email);
        if (dosenId) {
          const [dsn] = await db
            .select({ prodiId: dosen.programStudiId })
            .from(dosen)
            .where(eq(dosen.id, dosenId))
            .limit(1);
          if (dsn?.prodiId && payload.targetProdiIds.some((pId) => pId !== dsn.prodiId)) {
            throw new Error('Akses ditolak. Dosen hanya dapat menargetkan program studi tempatnya bernaung.');
          }
        }
      }
    }

    // 2. Validasi Kelas Target
    if (payload.targetScopeType === 'kelas' && payload.targetKelasIds && payload.targetKelasIds.length > 0) {
      if (isDosen) {
        const dosenId = await getDosenIdByEmail(user.email);
        if (!dosenId) throw new Error('Profil dosen tidak ditemukan');
        const allowedKelasIds = await getDosenAllowedKelasIds(dosenId);
        const unauthorized = payload.targetKelasIds.filter((kId) => !allowedKelasIds.includes(kId));
        if (unauthorized.length > 0) {
          throw new Error('Akses ditolak. Anda hanya dapat menargetkan kelas yang Anda ampu.');
        }
      } else if (isProdi) {
        const allowedProdiIds = await ProdiScopeService.getUserAccessibleProdiIds(user);
        if (allowedProdiIds !== null) {
          const kelasRows = await db
            .select({ id: kelasKuliah.id, prodiId: mataKuliah.programStudiId })
            .from(kelasKuliah)
            .innerJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
            .where(inArray(kelasKuliah.id, payload.targetKelasIds));
          const unauthorized = kelasRows.filter((k) => !allowedProdiIds.includes(k.prodiId));
          if (unauthorized.length > 0) {
            throw new Error('Akses ditolak. Kelas yang ditargetkan berada di luar program studi Anda.');
          }
        }
      }
    }

    // 3. Validasi Rombel Target
    if (payload.targetScopeType === 'rombel' && payload.targetRombelIds && payload.targetRombelIds.length > 0) {
      if (isDosen) {
        const dosenId = await getDosenIdByEmail(user.email);
        if (!dosenId) throw new Error('Profil dosen tidak ditemukan');
        const allowedKelasIds = await getDosenAllowedKelasIds(dosenId);
        const rombelRows = await db
          .select({
            id: rombelPraktikum.id,
            kelasKuliahId: rombelPraktikum.kelasKuliahId,
            instrukturId: rombelPraktikum.instrukturId,
          })
          .from(rombelPraktikum)
          .where(inArray(rombelPraktikum.id, payload.targetRombelIds));

        for (const r of rombelRows) {
          const isInstruktur = r.instrukturId === dosenId;
          const isPengajarKelas = allowedKelasIds.includes(r.kelasKuliahId);
          if (!isInstruktur && !isPengajarKelas) {
            throw new Error('Akses ditolak. Anda hanya dapat menargetkan rombel praktikum yang Anda ampu.');
          }
        }
      } else if (isProdi) {
        const allowedProdiIds = await ProdiScopeService.getUserAccessibleProdiIds(user);
        if (allowedProdiIds !== null) {
          const rombelRows = await db
            .select({ id: rombelPraktikum.id, prodiId: mataKuliah.programStudiId })
            .from(rombelPraktikum)
            .innerJoin(kelasKuliah, eq(rombelPraktikum.kelasKuliahId, kelasKuliah.id))
            .innerJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
            .where(inArray(rombelPraktikum.id, payload.targetRombelIds));
          const unauthorized = rombelRows.filter((r) => !allowedProdiIds.includes(r.prodiId));
          if (unauthorized.length > 0) {
            throw new Error('Akses ditolak. Rombel praktikum yang ditargetkan berada di luar program studi Anda.');
          }
        }
      }
    }
  }

  /**
   * Detail pengumuman + otorisasi pembaca + mencatat status dibaca untuk user saat ini
   */
  static async getDetail(id: number, user: UserPayload) {
    const [row] = await db
      .select({
        id: pengumuman.id,
        judul: pengumuman.judul,
        konten: pengumuman.konten,
        ringkasan: pengumuman.ringkasan,
        authorId: pengumuman.authorId,
        authorRole: pengumuman.authorRole,
        status: pengumuman.status,
        targetRole: pengumuman.targetRole,
        targetProdiType: pengumuman.targetProdiType,
        targetScopeType: pengumuman.targetScopeType,
        isPinned: pengumuman.isPinned,
        thumbnailUrl: pengumuman.thumbnailUrl,
        publishedAt: pengumuman.publishedAt,
        withdrawnAt: pengumuman.withdrawnAt,
        withdrawnReason: pengumuman.withdrawnReason,
        expiresAt: pengumuman.expiresAt,
        lastAutoSavedAt: pengumuman.lastAutoSavedAt,
        viewCount: pengumuman.viewCount,
        createdAt: pengumuman.createdAt,
        updatedAt: pengumuman.updatedAt,
        authorNama: users.nama,
      })
      .from(pengumuman)
      .leftJoin(users, eq(pengumuman.authorId, users.id))
      .where(eq(pengumuman.id, id))
      .limit(1);

    if (!row) throw new Error('Pengumuman tidak ditemukan');

    const isAdmin = hasRole(user, ['super_admin', 'admin']);
    const isAuthor = row.authorId === user.id;

    // Jika bukan author atau admin, lakukan verifikasi hak akses visibilitas
    if (!isAdmin && !isAuthor) {
      const now = new Date();
      const isPubliclyAvailable =
        (row.status === 'published' ||
          (row.status === 'scheduled' && row.publishedAt && new Date(row.publishedAt) <= now)) &&
        (!row.expiresAt || new Date(row.expiresAt) >= now);

      if (!isPubliclyAvailable) {
        throw new Error('Pengumuman tidak ditemukan atau belum dipublikasikan');
      }

      const userRoles = user.roles || [user.role];
      const isMahasiswa = userRoles.includes('mahasiswa');
      const isDosen = userRoles.some((r) => ['dosen', 'instruktur', 'kaprodi'].includes(r));

      // Verifikasi target role
      if (row.targetRole !== 'semua') {
        if (row.targetRole === 'mahasiswa' && !isMahasiswa) {
          throw new Error('Anda tidak memiliki akses ke pengumuman ini');
        }
        if (row.targetRole === 'dosen' && !isDosen) {
          throw new Error('Anda tidak memiliki akses ke pengumuman ini');
        }
        if (row.targetRole === 'admin' && !isAdmin) {
          throw new Error('Anda tidak memiliki akses ke pengumuman ini');
        }
      }

      // Verifikasi target prodi
      if (row.targetProdiType === 'spesifik') {
        const targetProdiRows = await db
          .select({ prodiId: pengumumanTargetProdi.programStudiId })
          .from(pengumumanTargetProdi)
          .where(eq(pengumumanTargetProdi.pengumumanId, id));
        const allowedProdiIds = targetProdiRows.map((p) => p.prodiId);

        let userProdiId: number | null = null;
        if (isMahasiswa) {
          const [mhs] = await db
            .select({ prodiId: mahasiswa.programStudiId })
            .from(mahasiswa)
            .where(ilike(mahasiswa.email, user.email.trim()))
            .limit(1);
          userProdiId = mhs?.prodiId ?? null;
        } else if (isDosen) {
          const [dsn] = await db
            .select({ prodiId: dosen.programStudiId })
            .from(dosen)
            .where(ilike(dosen.email, user.email.trim()))
            .limit(1);
          userProdiId = dsn?.prodiId ?? null;
        }

        if (userProdiId && !allowedProdiIds.includes(userProdiId)) {
          throw new Error('Pengumuman ini ditujukan untuk program studi lain');
        }
      }

      // Verifikasi target scope kelas/rombel
      if (row.targetScopeType === 'kelas') {
        const targetKelasRows = await db
          .select({ kelasId: pengumumanTargetKelas.kelasKuliahId })
          .from(pengumumanTargetKelas)
          .where(eq(pengumumanTargetKelas.pengumumanId, id));
        const targetKelasIds = targetKelasRows.map((k) => k.kelasId);

        let userKelasIds: number[] = [];
        if (isMahasiswa) {
          const [mhs] = await db
            .select({ id: mahasiswa.id })
            .from(mahasiswa)
            .where(ilike(mahasiswa.email, user.email.trim()))
            .limit(1);
          if (mhs) {
            const krsRows = await db
              .select({ kelasKuliahId: krs.kelasKuliahId })
              .from(krs)
              .where(and(eq(krs.mahasiswaId, mhs.id), eq(krs.isApproved, true)));
            userKelasIds = krsRows.map((k) => k.kelasKuliahId);
          }
        } else if (isDosen) {
          const dsnId = await getDosenIdByEmail(user.email);
          if (dsnId) userKelasIds = await getDosenAllowedKelasIds(dsnId);
        }

        const match = userKelasIds.some((kId) => targetKelasIds.includes(kId));
        if (!match) {
          throw new Error('Pengumuman ini ditujukan untuk kelas kuliah spesifik di luar kelas Anda');
        }
      } else if (row.targetScopeType === 'rombel') {
        const targetRombelRows = await db
          .select({ rombelId: pengumumanTargetRombel.rombelPraktikumId })
          .from(pengumumanTargetRombel)
          .where(eq(pengumumanTargetRombel.pengumumanId, id));
        const targetRombelIds = targetRombelRows.map((r) => r.rombelId);

        let userRombelIds: number[] = [];
        if (isMahasiswa) {
          const [mhs] = await db
            .select({ id: mahasiswa.id })
            .from(mahasiswa)
            .where(ilike(mahasiswa.email, user.email.trim()))
            .limit(1);
          if (mhs) {
            const rRows = await db
              .select({ rombelId: rombelPraktikumMahasiswa.rombelPraktikumId })
              .from(rombelPraktikumMahasiswa)
              .where(eq(rombelPraktikumMahasiswa.mahasiswaId, mhs.id));
            userRombelIds = rRows.map((r) => r.rombelId);
          }
        } else if (isDosen) {
          const dsnId = await getDosenIdByEmail(user.email);
          if (dsnId) {
            const allowedKelasIds = await getDosenAllowedKelasIds(dsnId);
            const rRows = await db
              .select({ id: rombelPraktikum.id })
              .from(rombelPraktikum)
              .where(
                or(
                  allowedKelasIds.length > 0 ? inArray(rombelPraktikum.kelasKuliahId, allowedKelasIds) : sql`false`,
                  eq(rombelPraktikum.instrukturId, dsnId),
                ),
              );
            userRombelIds = rRows.map((r) => r.id);
          }
        }

        const match = userRombelIds.some((rId) => targetRombelIds.includes(rId));
        if (!match) {
          throw new Error('Pengumuman ini ditujukan untuk rombel praktikum spesifik di luar rombel Anda');
        }
      }
    }

    const lampiran = await db.select().from(pengumumanLampiran).where(eq(pengumumanLampiran.pengumumanId, id));

    const prodiTargets = await db
      .select({
        id: programStudi.id,
        nama: programStudi.nama,
      })
      .from(pengumumanTargetProdi)
      .innerJoin(programStudi, eq(pengumumanTargetProdi.programStudiId, programStudi.id))
      .where(eq(pengumumanTargetProdi.pengumumanId, id));

    const kelasTargets = await db
      .select({
        id: kelasKuliah.id,
        namaKelas: kelasKuliah.namaKelas,
      })
      .from(pengumumanTargetKelas)
      .innerJoin(kelasKuliah, eq(pengumumanTargetKelas.kelasKuliahId, kelasKuliah.id))
      .where(eq(pengumumanTargetKelas.pengumumanId, id));

    const rombelTargets = await db
      .select({
        id: rombelPraktikum.id,
        namaGroup: rombelPraktikum.namaGroup,
      })
      .from(pengumumanTargetRombel)
      .innerJoin(rombelPraktikum, eq(pengumumanTargetRombel.rombelPraktikumId, rombelPraktikum.id))
      .where(eq(pengumumanTargetRombel.pengumumanId, id));

    await db.insert(pengumumanDibaca).values({ pengumumanId: id, userId: user.id }).onConflictDoNothing();

    await db
      .update(pengumuman)
      .set({ viewCount: sql`${pengumuman.viewCount} + 1` })
      .where(eq(pengumuman.id, id));

    return {
      ...row,
      lampiran,
      targetProdis: prodiTargets,
      targetKelas: kelasTargets,
      targetRombel: rombelTargets,
    };
  }

  /**
   * Auto-save berkala / Simpan draft pengumuman
   */
  static async saveDraft(user: UserPayload, payload: SaveDraftPayload) {
    const isSuperOrAdmin = hasRole(user, ['super_admin', 'admin']);
    const isAllowedAuthor = hasRole(user, ['admin', 'super_admin', 'prodi', 'kaprodi', 'dosen', 'instruktur']);
    if (!isAllowedAuthor) {
      throw new Error('Hanya Admin, Program Studi, atau Dosen yang dapat membuat pengumuman');
    }

    // Validasi target prodi/kelas/rombel terhadap scope pengguna
    await this.validateTargetScopes(user, payload);

    const now = new Date();
    const judul = payload.judul?.trim() || 'Draf Tanpa Judul';
    const konten = payload.konten ?? '';
    const ringkasan = payload.ringkasan ?? (konten ? konten.slice(0, 160).replace(/[#*`_~]/g, '') : null);

    let pengumumanId = payload.id;

    if (pengumumanId) {
      const [existing] = await db.select().from(pengumuman).where(eq(pengumuman.id, pengumumanId)).limit(1);

      if (!existing) throw new Error('Pengumuman draf tidak ditemukan');
      if (!isSuperOrAdmin && existing.authorId !== user.id) {
        throw new Error('Anda tidak memiliki izin mengubah draf pengumuman ini');
      }

      await db
        .update(pengumuman)
        .set({
          judul,
          konten,
          ringkasan,
          targetRole: payload.targetRole ?? existing.targetRole,
          targetProdiType: payload.targetProdiType ?? existing.targetProdiType,
          targetScopeType: payload.targetScopeType ?? existing.targetScopeType,
          isPinned: payload.isPinned ?? existing.isPinned,
          thumbnailUrl: payload.thumbnailUrl !== undefined ? payload.thumbnailUrl : existing.thumbnailUrl,
          expiresAt:
            payload.expiresAt !== undefined
              ? payload.expiresAt
                ? new Date(payload.expiresAt)
                : null
              : existing.expiresAt,
          lastAutoSavedAt: now,
          updatedAt: now,
        })
        .where(eq(pengumuman.id, pengumumanId));
    } else {
      const [inserted] = await db
        .insert(pengumuman)
        .values({
          judul,
          konten,
          ringkasan,
          authorId: user.id,
          authorRole: user.role,
          status: 'draft',
          targetRole: payload.targetRole ?? 'semua',
          targetProdiType: payload.targetProdiType ?? 'semua',
          targetScopeType: payload.targetScopeType ?? 'umum',
          isPinned: payload.isPinned ?? false,
          thumbnailUrl: payload.thumbnailUrl ?? null,
          expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
          lastAutoSavedAt: now,
        })
        .returning({ id: pengumuman.id });

      pengumumanId = inserted.id;
    }

    if (payload.targetProdiIds) {
      await db.delete(pengumumanTargetProdi).where(eq(pengumumanTargetProdi.pengumumanId, pengumumanId));
      if (payload.targetProdiIds.length > 0) {
        await db.insert(pengumumanTargetProdi).values(
          payload.targetProdiIds.map((pId) => ({
            pengumumanId: pengumumanId!,
            programStudiId: pId,
          })),
        );
      }
    }

    if (payload.targetKelasIds) {
      await db.delete(pengumumanTargetKelas).where(eq(pengumumanTargetKelas.pengumumanId, pengumumanId));
      if (payload.targetKelasIds.length > 0) {
        await db.insert(pengumumanTargetKelas).values(
          payload.targetKelasIds.map((kId) => ({
            pengumumanId: pengumumanId!,
            kelasKuliahId: kId,
          })),
        );
      }
    }

    if (payload.targetRombelIds) {
      await db.delete(pengumumanTargetRombel).where(eq(pengumumanTargetRombel.pengumumanId, pengumumanId));
      if (payload.targetRombelIds.length > 0) {
        await db.insert(pengumumanTargetRombel).values(
          payload.targetRombelIds.map((rId) => ({
            pengumumanId: pengumumanId!,
            rombelPraktikumId: rId,
          })),
        );
      }
    }

    if (payload.lampiran) {
      await db.delete(pengumumanLampiran).where(eq(pengumumanLampiran.pengumumanId, pengumumanId));
      if (payload.lampiran.length > 0) {
        await db.insert(pengumumanLampiran).values(
          payload.lampiran.map((l) => ({
            pengumumanId: pengumumanId!,
            tipe: l.tipe,
            nama: l.nama,
            url: l.url,
            ukuran: l.ukuran ?? null,
            mimeType: l.mimeType ?? null,
          })),
        );
      }
    }

    return {
      message: 'Draft pengumuman berhasil disimpan secara berkala',
      id: pengumumanId,
      lastAutoSavedAt: now.toISOString(),
    };
  }

  /**
   * Publikasikan atau jadwalkan rilis pengumuman
   */
  static async publish(user: UserPayload, payload: PublishPayload) {
    const isSuperOrAdmin = hasRole(user, ['super_admin', 'admin']);
    const isAllowedAuthor = hasRole(user, ['admin', 'super_admin', 'prodi', 'kaprodi', 'dosen', 'instruktur']);
    if (!isAllowedAuthor) {
      throw new Error('Hanya Admin, Program Studi, atau Dosen yang dapat mempublikasikan pengumuman');
    }

    // Validasi target prodi/kelas/rombel terhadap scope pengguna
    await this.validateTargetScopes(user, payload);

    const now = new Date();
    let publishedAt = now;
    let status: 'published' | 'scheduled' = 'published';

    if (payload.publishMode === 'scheduled' && payload.scheduledPublishAt) {
      const scheduledDate = new Date(payload.scheduledPublishAt);
      if (scheduledDate > now) {
        publishedAt = scheduledDate;
        status = 'scheduled';
      }
    }

    const ringkasan = payload.ringkasan ?? payload.konten.slice(0, 160).replace(/[#*`_~]/g, '');

    let pengumumanId = payload.id;

    if (pengumumanId) {
      const [existing] = await db.select().from(pengumuman).where(eq(pengumuman.id, pengumumanId)).limit(1);

      if (!existing) throw new Error('Pengumuman tidak ditemukan');
      if (!isSuperOrAdmin && existing.authorId !== user.id) {
        throw new Error('Anda tidak memiliki izin mempublikasikan pengumuman ini');
      }

      await db
        .update(pengumuman)
        .set({
          judul: payload.judul,
          konten: payload.konten,
          ringkasan,
          status,
          targetRole: payload.targetRole,
          targetProdiType: payload.targetProdiType,
          targetScopeType: payload.targetScopeType,
          isPinned: payload.isPinned ?? false,
          thumbnailUrl: payload.thumbnailUrl !== undefined ? payload.thumbnailUrl : existing.thumbnailUrl,
          publishedAt,
          withdrawnAt: null,
          withdrawnReason: null,
          expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
          updatedAt: now,
        })
        .where(eq(pengumuman.id, pengumumanId));
    } else {
      const [inserted] = await db
        .insert(pengumuman)
        .values({
          judul: payload.judul,
          konten: payload.konten,
          ringkasan,
          authorId: user.id,
          authorRole: user.role,
          status,
          targetRole: payload.targetRole,
          targetProdiType: payload.targetProdiType,
          targetScopeType: payload.targetScopeType,
          isPinned: payload.isPinned ?? false,
          thumbnailUrl: payload.thumbnailUrl ?? null,
          publishedAt,
          expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
        })
        .returning({ id: pengumuman.id });

      pengumumanId = inserted.id;
    }

    await db.delete(pengumumanTargetProdi).where(eq(pengumumanTargetProdi.pengumumanId, pengumumanId));
    if (payload.targetProdiType === 'spesifik' && payload.targetProdiIds && payload.targetProdiIds.length > 0) {
      await db.insert(pengumumanTargetProdi).values(
        payload.targetProdiIds.map((pId) => ({
          pengumumanId: pengumumanId!,
          programStudiId: pId,
        })),
      );
    }

    await db.delete(pengumumanTargetKelas).where(eq(pengumumanTargetKelas.pengumumanId, pengumumanId));
    if (payload.targetScopeType === 'kelas' && payload.targetKelasIds && payload.targetKelasIds.length > 0) {
      await db.insert(pengumumanTargetKelas).values(
        payload.targetKelasIds.map((kId) => ({
          pengumumanId: pengumumanId!,
          kelasKuliahId: kId,
        })),
      );
    }

    await db.delete(pengumumanTargetRombel).where(eq(pengumumanTargetRombel.pengumumanId, pengumumanId));
    if (payload.targetScopeType === 'rombel' && payload.targetRombelIds && payload.targetRombelIds.length > 0) {
      await db.insert(pengumumanTargetRombel).values(
        payload.targetRombelIds.map((rId) => ({
          pengumumanId: pengumumanId!,
          rombelPraktikumId: rId,
        })),
      );
    }

    if (payload.lampiran) {
      await db.delete(pengumumanLampiran).where(eq(pengumumanLampiran.pengumumanId, pengumumanId));
      if (payload.lampiran.length > 0) {
        await db.insert(pengumumanLampiran).values(
          payload.lampiran.map((l) => ({
            pengumumanId: pengumumanId!,
            tipe: l.tipe,
            nama: l.nama,
            url: l.url,
            ukuran: l.ukuran ?? null,
            mimeType: l.mimeType ?? null,
          })),
        );
      }
    }

    return {
      message:
        status === 'scheduled'
          ? `Pengumuman berhasil dijadwalkan tayang pada ${publishedAt.toLocaleString('id-ID')}`
          : 'Pengumuman berhasil dipublikasikan!',
      id: pengumumanId,
      status,
      publishedAt: publishedAt.toISOString(),
    };
  }

  /**
   * Tarik / Batalkan pengumuman yang sedang tayang (Unpublish / Withdraw)
   */
  static async withdraw(id: number, user: UserPayload, reason?: string) {
    const isSuperOrAdmin = hasRole(user, ['super_admin', 'admin']);
    const [existing] = await db.select().from(pengumuman).where(eq(pengumuman.id, id)).limit(1);

    if (!existing) throw new Error('Pengumuman tidak ditemukan');
    if (!isSuperOrAdmin && existing.authorId !== user.id) {
      throw new Error('Anda tidak memiliki wewenang untuk menarik pengumuman ini');
    }

    const now = new Date();
    await db
      .update(pengumuman)
      .set({
        status: 'withdrawn',
        withdrawnAt: now,
        withdrawnReason: reason || null,
        updatedAt: now,
      })
      .where(eq(pengumuman.id, id));

    return {
      message: 'Pengumuman telah ditarik dan tidak lagi tampil untuk pembaca',
      id,
      status: 'withdrawn',
      withdrawnAt: now.toISOString(),
    };
  }

  /**
   * Hapus pengumuman secara permanen
   */
  static async delete(id: number, user: UserPayload) {
    const isSuperOrAdmin = hasRole(user, ['super_admin', 'admin']);
    const [existing] = await db.select().from(pengumuman).where(eq(pengumuman.id, id)).limit(1);

    if (!existing) throw new Error('Pengumuman tidak ditemukan');
    if (!isSuperOrAdmin && existing.authorId !== user.id) {
      throw new Error('Anda tidak memiliki wewenang menghapus pengumuman ini');
    }

    await db.delete(pengumuman).where(eq(pengumuman.id, id));
    return { message: 'Pengumuman berhasil dihapus', id };
  }
}
