import { aliasedTable, and, desc, eq, ilike, inArray, or, type SQL, sql } from 'drizzle-orm';
import {
  bap,
  bapPraktikum,
  dosen,
  kelasKuliah,
  kelompokApel,
  ketidakhadiranMahasiswa,
  kompensasiManual,
  mahasiswa,
  mataKuliah,
  presensi,
  presensiApel,
  presensiPraktikum,
  programStudi,
  rombelPraktikum,
  sesiApel,
  users,
} from '../models/schema';
import { db } from '../utils/db';

/** Status ketidakhadiran yang masuk beban kompensasi (dipakai filter rekaman). */
const STATUS_KOMPENSASI = ['SAKIT', 'IZIN', 'ALPA', 'TERLAMBAT', 'RUSAK'] as const;

const SORT_MAP = {
  tanggal: ketidakhadiranMahasiswa.tanggal,
  status: ketidakhadiranMahasiswa.status,
  durasi: ketidakhadiranMahasiswa.durasiMenit,
  nim: mahasiswa.nim,
  nama: mahasiswa.nama,
} as const;

type SortField = keyof typeof SORT_MAP;

function parseSort(sortBy?: string, sortOrder?: string): SQL<unknown> {
  const field = (sortBy as SortField) in SORT_MAP ? (sortBy as SortField) : 'tanggal';
  const col = SORT_MAP[field];
  return sortOrder === 'asc' ? sql`${col} ASC` : sql`${col} DESC`;
}

const verifiedUser = aliasedTable(users, 'verified_user');
const creatorUser = aliasedTable(users, 'creator_user');

/**
 * Kolom konteks sumber (kelas/sesi + MK/kelompok) untuk tabel terpusat
 * ketidakhadiran. Digunakan bersama oleh daftar ketidakhadiran & rekaman
 * kompensasi agar tampilan frontend konsisten.
 */
const SUMBER_CONTEXT_SQL = {
  sumberLabel: sql<string>`CASE
    WHEN ${ketidakhadiranMahasiswa.sumber} = 'BAP' THEN 'Perkuliahan'
    WHEN ${ketidakhadiranMahasiswa.sumber} = 'APEL' THEN 'Apel'
    WHEN ${ketidakhadiranMahasiswa.sumber} = 'PRAKTIKUM' THEN 'Praktikum'
    ELSE 'Manual' END`,
  pertemuanKe: sql<number | null>`CASE
    WHEN ${ketidakhadiranMahasiswa.sumber} = 'BAP' THEN ${bap.pertemuanKe}
    WHEN ${ketidakhadiranMahasiswa.sumber} = 'PRAKTIKUM' THEN ${bapPraktikum.sesiKe}
    ELSE NULL END`,
  materi: sql<string | null>`CASE
    WHEN ${ketidakhadiranMahasiswa.sumber} = 'BAP' THEN ${bap.materi}
    WHEN ${ketidakhadiranMahasiswa.sumber} = 'PRAKTIKUM' THEN ${bapPraktikum.materi}
    WHEN ${ketidakhadiranMahasiswa.sumber} = 'APEL' THEN NULL
    ELSE ${ketidakhadiranMahasiswa.keterangan} END`,
  lampiranEvidens: sql<string | null>`CASE
    WHEN ${ketidakhadiranMahasiswa.sumber} = 'BAP' THEN ${presensi.lampiranEvidens}
    WHEN ${ketidakhadiranMahasiswa.sumber} = 'PRAKTIKUM' THEN ${presensiPraktikum.lampiranEvidens}
    ELSE NULL END`,
  namaKelas: sql<string | null>`CASE
    WHEN ${ketidakhadiranMahasiswa.sumber} IN ('BAP', 'PRAKTIKUM') THEN ${kelasKuliah.namaKelas}
    ELSE NULL END`,
  mataKuliahKode: sql<string | null>`CASE
    WHEN ${ketidakhadiranMahasiswa.sumber} IN ('BAP', 'PRAKTIKUM') THEN ${mataKuliah.kode}
    ELSE NULL END`,
  mataKuliahNama: sql<string | null>`CASE
    WHEN ${ketidakhadiranMahasiswa.sumber} IN ('BAP', 'PRAKTIKUM') THEN ${mataKuliah.nama}
    ELSE NULL END`,
  dosenNama: sql<string | null>`CASE
    WHEN ${ketidakhadiranMahasiswa.sumber} IN ('BAP', 'PRAKTIKUM') THEN ${dosen.nama}
    ELSE NULL END`,
  kelompokNama: sql<string | null>`CASE
    WHEN ${ketidakhadiranMahasiswa.sumber} = 'APEL' THEN ${kelompokApel.namaKelompok}
    ELSE NULL END`,
  shift: sql<string | null>`CASE
    WHEN ${ketidakhadiranMahasiswa.sumber} = 'APEL' THEN ${sesiApel.shift}
    ELSE NULL END`,
  verificationNote: sql<string | null>`CASE
    WHEN ${ketidakhadiranMahasiswa.sumber} = 'APEL' THEN ${presensiApel.verificationNote}
    ELSE NULL END`,
  kompensasiManualId: sql<number | null>`CASE
    WHEN ${ketidakhadiranMahasiswa.sumber} = 'MANUAL' THEN ${ketidakhadiranMahasiswa.sumberId}
    ELSE NULL END`,
  createdBy: ketidakhadiranMahasiswa.createdBy,
  createdByName: creatorUser.nama,
};

/** Join baku dari tabel terpusat ke sumber presensi & relasi akademik. */
function baseQuery() {
  return db
    .select({
      id: ketidakhadiranMahasiswa.id,
      mahasiswaId: ketidakhadiranMahasiswa.mahasiswaId,
      nim: mahasiswa.nim,
      nama: mahasiswa.nama,
      foto: mahasiswa.foto,
      prodiId: mahasiswa.programStudiId,
      prodiNama: programStudi.nama,
      tanggal: ketidakhadiranMahasiswa.tanggal,
      sumber: ketidakhadiranMahasiswa.sumber,
      sumberId: ketidakhadiranMahasiswa.sumberId,
      status: ketidakhadiranMahasiswa.status,
      durasiMenit: ketidakhadiranMahasiswa.durasiMenit,
      keterangan: ketidakhadiranMahasiswa.keterangan,
      isVerified: ketidakhadiranMahasiswa.isVerified,
      verifiedBy: ketidakhadiranMahasiswa.verifiedBy,
      verifiedByName: verifiedUser.nama,
      verifiedAt: ketidakhadiranMahasiswa.verifiedAt,
      ...SUMBER_CONTEXT_SQL,
    })
    .from(ketidakhadiranMahasiswa)
    .innerJoin(mahasiswa, eq(ketidakhadiranMahasiswa.mahasiswaId, mahasiswa.id))
    .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id))
    .leftJoin(verifiedUser, eq(ketidakhadiranMahasiswa.verifiedBy, verifiedUser.id))
    .leftJoin(creatorUser, eq(ketidakhadiranMahasiswa.createdBy, creatorUser.id))
    .leftJoin(
      presensi,
      and(eq(ketidakhadiranMahasiswa.sumberId, presensi.id), eq(ketidakhadiranMahasiswa.sumber, 'BAP')),
    )
    .leftJoin(bap, eq(presensi.bapId, bap.id))
    .leftJoin(
      presensiPraktikum,
      and(eq(ketidakhadiranMahasiswa.sumberId, presensiPraktikum.id), eq(ketidakhadiranMahasiswa.sumber, 'PRAKTIKUM')),
    )
    .leftJoin(bapPraktikum, eq(presensiPraktikum.bapPraktikumId, bapPraktikum.id))
    .leftJoin(rombelPraktikum, eq(bapPraktikum.rombelPraktikumId, rombelPraktikum.id))
    .leftJoin(
      presensiApel,
      and(eq(ketidakhadiranMahasiswa.sumberId, presensiApel.id), eq(ketidakhadiranMahasiswa.sumber, 'APEL')),
    )
    .leftJoin(sesiApel, eq(presensiApel.sesiApelId, sesiApel.id))
    .leftJoin(kelompokApel, eq(sesiApel.kelompokApelId, kelompokApel.id))
    .leftJoin(kelasKuliah, eq(rombelPraktikum.kelasKuliahId, kelasKuliah.id))
    .leftJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
    .leftJoin(dosen, eq(bap.dosenId, dosen.id));
}

interface BaseFilterParams {
  search?: string;
  prodiIds?: number[];
  tglDari?: string;
  tglSampai?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

function buildConditions(params: BaseFilterParams): SQL<unknown>[] {
  const conditions: SQL<unknown>[] = [];
  if (params.search && params.search.trim()) {
    const s = `%${params.search.trim()}%`;
    const searchCond = or(ilike(mahasiswa.nama, s), ilike(mahasiswa.nim, s));
    if (searchCond) conditions.push(searchCond);
  }
  if (params.prodiIds && params.prodiIds.length > 0) {
    conditions.push(inArray(mahasiswa.programStudiId, params.prodiIds));
  }
  if (params.tglDari) {
    conditions.push(sql`${ketidakhadiranMahasiswa.tanggal} >= ${params.tglDari}`);
  }
  if (params.tglSampai) {
    conditions.push(sql`${ketidakhadiranMahasiswa.tanggal} <= ${params.tglSampai}`);
  }
  return conditions;
}

export class KompensasiRiwayatService {
  /**
   * Riwayat ketidakhadiran terpadu (BAP + APEL + PRAKTIKUM + MANUAL) dengan
   * filter prodi / NIM-nama / rentang tanggal / sumber / status verifikasi.
   * Dipakai halaman Tab "Ketidakhadiran".
   */
  static async getRiwayatKetidakhadiran(params: BaseFilterParams & { sumber?: string; statusVerif?: string }) {
    const conditions = buildConditions(params);
    if (params.sumber && ['BAP', 'APEL', 'PRAKTIKUM', 'MANUAL'].includes(params.sumber)) {
      conditions.push(eq(ketidakhadiranMahasiswa.sumber, params.sumber as 'BAP' | 'APEL' | 'PRAKTIKUM' | 'MANUAL'));
    }
    if (params.statusVerif === 'belum') {
      conditions.push(eq(ketidakhadiranMahasiswa.isVerified, false));
    } else if (params.statusVerif === 'sudah') {
      conditions.push(eq(ketidakhadiranMahasiswa.isVerified, true));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const limit = Math.min(Math.max(params.limit ?? 20, 1), 200);
    const offset = ((params.page ?? 1) - 1) * limit;

    const countQuery = db
      .select({ total: sql<number>`count(*)` })
      .from(ketidakhadiranMahasiswa)
      .innerJoin(mahasiswa, eq(ketidakhadiranMahasiswa.mahasiswaId, mahasiswa.id))
      .where(whereClause);

    const dataQuery = baseQuery()
      .where(whereClause)
      .orderBy(parseSort(params.sortBy, params.sortOrder))
      .limit(limit)
      .offset(offset);

    const [[totalRow], rows] = await Promise.all([countQuery, dataQuery]);
    const total = Number(totalRow?.total || 0);

    return {
      data: rows,
      meta: { total, page: params.page ?? 1, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Rekaman kompensasi terpadu: seluruh baris terverifikasi yang menghasilkan
   * beban kompensasi (SAKIT/IZIN/ALPA/TERLAMBAT + RUSAK) termasuk input manual,
   * dengan durasi > 0. Dipakai halaman Tab "Rekaman Kompensasi".
   */
  static async getRekamanKompensasi(params: BaseFilterParams & { sumber?: string }) {
    const conditions = buildConditions(params);
    conditions.push(eq(ketidakhadiranMahasiswa.isVerified, true));
    conditions.push(
      sql`${ketidakhadiranMahasiswa.status} IN (${sql.join(
        STATUS_KOMPENSASI.map((s) => sql`${s}`),
        sql`, `,
      )})`,
    );
    conditions.push(sql`${ketidakhadiranMahasiswa.durasiMenit} > 0`);
    if (params.sumber && ['BAP', 'APEL', 'PRAKTIKUM', 'MANUAL'].includes(params.sumber)) {
      conditions.push(eq(ketidakhadiranMahasiswa.sumber, params.sumber as 'BAP' | 'APEL' | 'PRAKTIKUM' | 'MANUAL'));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const limit = Math.min(Math.max(params.limit ?? 20, 1), 200);
    const offset = ((params.page ?? 1) - 1) * limit;

    const [[totalRow], rows] = await Promise.all([
      db
        .select({ total: sql<number>`count(*)` })
        .from(ketidakhadiranMahasiswa)
        .innerJoin(mahasiswa, eq(ketidakhadiranMahasiswa.mahasiswaId, mahasiswa.id))
        .where(whereClause),
      baseQuery().where(whereClause).orderBy(parseSort(params.sortBy, params.sortOrder)).limit(limit).offset(offset),
    ]);
    const total = Number(totalRow?.total || 0);

    return {
      data: rows,
      meta: { total, page: params.page ?? 1, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Anulir massal ketidakhadiran terverifikasi (sumber selain MANUAL):
   * meng-zero durasi pada tabel terpusat dan menyinkronkan status sumber
   * presensi menjadi hadir. Untuk rekaman MANUAL gunakan endpoint kompensasi-manual.
   */
  static async bulkAnulirKetidakhadiran(ids: number[], adminUserId: number, allowedProdiIds?: number[] | null) {
    if (!ids || ids.length === 0) {
      throw new Error('Tidak ada data yang dipilih untuk dianulir');
    }
    const uniqueIds = [...new Set(ids.map(Number).filter((n) => Number.isFinite(n) && n > 0))];
    if (uniqueIds.length === 0) {
      throw new Error('ID ketidakhadiran tidak valid');
    }

    return await db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(ketidakhadiranMahasiswa)
        .where(sql`${ketidakhadiranMahasiswa.id} IN (${sql.join(uniqueIds, sql`, `)})`);
      const anulirRows = rows.filter((r) => r.sumber !== 'MANUAL');
      if (anulirRows.length === 0) {
        throw new Error('Tidak ada ketidakhadiran non-manual yang dapat dianulir pada pilihan tersebut');
      }

      // Batasi ke lingkup prodi user (non-admin): tolak bila ada mahasiswa di luar scope.
      if (allowedProdiIds && allowedProdiIds.length > 0) {
        const mhsRows = await tx
          .select({ id: mahasiswa.id, programStudiId: mahasiswa.programStudiId })
          .from(mahasiswa)
          .where(inArray(mahasiswa.id, [...new Set(rows.map((r) => r.mahasiswaId))]));
        const allowed = new Set(allowedProdiIds);
        const outOfScope = mhsRows.filter((m) => !allowed.has(m.programStudiId ?? -1));
        if (outOfScope.length > 0) {
          throw new Error('Akses ditolak. Ada data ketidakhadiran di luar lingkup prodi Anda.');
        }
      }

      const note = `[anulir massal] oleh #${adminUserId}`;
      const updatedAt = new Date();

      for (const row of anulirRows) {
        await tx
          .update(ketidakhadiranMahasiswa)
          .set({
            durasiMenit: 0,
            keterangan: row.keterangan ? `${row.keterangan}\n${note}` : note,
            verifiedBy: adminUserId,
            verifiedAt: updatedAt,
          })
          .where(eq(ketidakhadiranMahasiswa.id, row.id));

        if (row.sumber === 'BAP' && row.sumberId != null) {
          const [prev] = await tx
            .select({ keteranganAdmin: presensi.keteranganAdmin })
            .from(presensi)
            .where(eq(presensi.id, row.sumberId));
          const prevNote = prev?.keteranganAdmin || '';
          await tx
            .update(presensi)
            .set({
              status: 'hadir' as 'hadir',
              durasiMangkir: 0,
              keteranganAdmin: prevNote ? `${prevNote} | ${note}` : note,
              resolvedBy: adminUserId,
              resolvedAt: updatedAt,
            })
            .where(eq(presensi.id, row.sumberId));
        } else if (row.sumber === 'APEL' && row.sumberId != null) {
          const [prev] = await tx
            .select({ verificationNote: presensiApel.verificationNote })
            .from(presensiApel)
            .where(eq(presensiApel.id, row.sumberId));
          const prevNote = prev?.verificationNote || '';
          await tx
            .update(presensiApel)
            .set({
              status: 'hadir' as 'hadir',
              verifiedStatus: 'hadir' as 'hadir',
              menitTerlambat: 0,
              verificationNote: prevNote ? `${prevNote} | ${note}` : note,
              verifiedBy: adminUserId,
              verifiedAt: updatedAt,
            })
            .where(eq(presensiApel.id, row.sumberId));
        } else if (row.sumber === 'PRAKTIKUM' && row.sumberId != null) {
          const [prev] = await tx
            .select({ keteranganAdmin: presensiPraktikum.keteranganAdmin })
            .from(presensiPraktikum)
            .where(eq(presensiPraktikum.id, row.sumberId));
          const prevNote = prev?.keteranganAdmin || '';
          await tx
            .update(presensiPraktikum)
            .set({
              status: 'hadir' as 'hadir',
              durasiMangkir: 0,
              keteranganAdmin: prevNote ? `${prevNote} | ${note}` : note,
              resolvedBy: adminUserId,
              resolvedAt: updatedAt,
            })
            .where(eq(presensiPraktikum.id, row.sumberId));
        }
      }

      // Bersihkan baris manual yang ikut terpilih (tidak dihitung, namun tetap
      // dihapus dari pilihan agar tidak membingungkan).
      const manualIds = rows.filter((r) => r.sumber === 'MANUAL').map((r) => r.id);
      if (manualIds.length > 0) {
        const manualSumberIds = rows.filter((r) => r.sumber === 'MANUAL').map((r) => r.sumberId);
        await tx
          .delete(kompensasiManual)
          .where(
            manualSumberIds.length > 0
              ? sql`${kompensasiManual.id} IN (${sql.join(manualSumberIds as number[], sql`, `)})`
              : sql`1 = 0`,
          );
        await tx
          .delete(ketidakhadiranMahasiswa)
          .where(sql`${ketidakhadiranMahasiswa.id} IN (${sql.join(manualIds, sql`, `)})`);
      }

      return { success: true, anulir: anulirRows.length, manualDeleted: manualIds.length };
    });
  }
}
