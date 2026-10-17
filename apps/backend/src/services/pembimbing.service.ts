import { and, asc, count, desc, eq, inArray, isNotNull, or, sql } from 'drizzle-orm';
import {
  dosen,
  mahasiswa,
  PEMBIMBING_JENIS,
  type PembimbingJenis,
  pembimbingMahasiswa,
  programStudi,
  users,
} from '../models/schema';
import { db } from '../utils/db';

export interface SetPembimbingInput {
  mahasiswaId: number;
  jenis: PembimbingJenis;
  dosenId?: number | null;
  namaEksternal?: string | null;
  instansiEksternal?: string | null;
  catatan?: string | null;
}

export interface PembimbingListFilter {
  programStudiId?: number;
  /** Lebih dari satu angkatan (dipakai halaman "belum ditetapkan" lintas angkatan). */
  angkatan?: string;
  angkatanIds?: string[];
  jenis?: PembimbingJenis;
  belumDitetapkan?: boolean;
  /** Batasi ke satu mahasiswa (dipakai role mahasiswa untuk melihat miliknya). */
  mahasiswaId?: number;
  /** Batasi ke mahasiswa yang dibimbingi dosen tsb sebagai PA, PKL, atau TA. */
  dosenId?: number;
  /** 'aktif' (default) hanya baris aktif; 'semua' memuat riwayat nonaktif. */
  status?: 'aktif' | 'semua';
  search?: string;
  page?: number;
  limit?: number;
}

/** Baris penetapan aktif per mahasiswa + jenis, digabung dengan data mahasiswa. */
export interface PembimbingListItem {
  mahasiswaId: number;
  nim: string;
  namaMahasiswa: string;
  angkatan: string | null;
  programStudiId: number | null;
  prodiNama: string | null;
  /** Dosen PA — read-only (disimpan di `mahasiswa.dosen_pa_id`). */
  dosenPaId: number | null;
  dosenPaNama: string | null;
  /** Penetapan aktif tiap jenis; null = belum ditetapkan. */
  pembimbing: Record<PembimbingJenis, PembimbingDetail | null>;
  /** Jumlah penetapan aktif (1..3 bila PKL/TA terisi sebagian). */
  jumlahDitetapkan: number;
}

export interface PembimbingDetail {
  id: number;
  jenis: PembimbingJenis;
  dosenId: number | null;
  dosenNama: string | null;
  dosenNip: string | null;
  namaEksternal: string | null;
  instansiEksternal: string | null;
  statusAktif: boolean;
  catatan: string | null;
  ditetapkanOlehNama: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PembimbingRiwayatItem extends PembimbingDetail {
  mahasiswaId: number;
  nim: string;
  namaMahasiswa: string;
}

export interface BulkSetPembimbingResult {
  updated: number;
  errors: Array<{ mahasiswaId: number; nim: string | null; error: string }>;
}

export interface ImporPembimbingResult {
  successCount: number;
  skippedCount: number;
  errors: Array<{ line: number; error: string }>;
}

interface NormalizedPembimbing {
  dosenId: number | null;
  namaEksternal: string | null;
  instansiEksternal: string | null;
  catatan: string | null;
}

const emptyObject = <T>(): Record<PembimbingJenis, T | null> => ({
  PKL: null,
  TA_UTAMA: null,
  TA_PENDAMPING: null,
});

export class PembimbingService {
  /** Normalisasi & validasi identitas pembimbing (internal vs eksternal). */
  private static normalizeIdentitas(input: SetPembimbingInput): NormalizedPembimbing {
    const dosenId = input.dosenId ?? null;
    const namaEksternal = input.namaEksternal?.trim() || null;
    const instansiEksternal = input.instansiEksternal?.trim() || null;

    if (dosenId !== null) {
      if (namaEksternal || instansiEksternal) {
        throw new Error('Pembimbing internal (dosen) tidak boleh diisi kolom pembimbing eksternal.');
      }
    } else {
      if (!namaEksternal) {
        throw new Error('Nama pembimbing eksternal wajib diisi bila pembimbing bukan dosen.');
      }
      if (!instansiEksternal) {
        throw new Error('Instansi pembimbing eksternal wajib diisi bila pembimbing bukan dosen.');
      }
    }

    return { dosenId, namaEksternal, instansiEksternal, catatan: input.catatan?.trim() || null };
  }

  /** Pastikan mahasiswa ada dan berada dalam prodi yang boleh diakses operator. */
  private static async loadMahasiswa(
    mahasiswaId: number,
    scopedProdiIds?: number[] | null,
  ): Promise<{ id: number; nim: string; programStudiId: number | null }> {
    const [row] = await db
      .select({ id: mahasiswa.id, nim: mahasiswa.nim, programStudiId: mahasiswa.programStudiId })
      .from(mahasiswa)
      .where(eq(mahasiswa.id, mahasiswaId))
      .limit(1);
    if (!row) throw new Error('Mahasiswa tidak ditemukan.');
    if (scopedProdiIds && !scopedProdiIds.includes(row.programStudiId ?? -1)) {
      throw new Error('Mahasiswa berada di luar cakupan program studi Anda.');
    }
    return row;
  }

  /** Dosen wajib ada; untuk operator ter-scope, dosen harus se-prodi dengan mahasiswa. */
  private static async validateDosen(dosenId: number, mahasiswaProdiId: number | null): Promise<void> {
    const [row] = await db
      .select({ id: dosen.id, programStudiId: dosen.programStudiId })
      .from(dosen)
      .where(eq(dosen.id, dosenId))
      .limit(1);
    if (!row) throw new Error('Dosen pembimbing tidak ditemukan.');
    // Operator tanpa scope global (kaprodi/admin prodi) hanya boleh menunjuk dosen
    // pada program studinya sendiri agar relasi lintas prodi tidak terbentuk diam-diam.
    if (mahasiswaProdiId !== null && row.programStudiId !== mahasiswaProdiId) {
      throw new Error('Dosen pembimbing berada pada program studi yang berbeda dari mahasiswa.');
    }
  }

  /** Cegah satu dosen menjadi Pembimbing 1 dan 2 pada mahasiswa yang sama. */
  private static async validateCekSamaKonflik(
    mahasiswaId: number,
    jenis: PembimbingJenis,
    dosenId: number | null,
  ): Promise<void> {
    if (dosenId === null) return;
    const pasanganTA: Partial<Record<PembimbingJenis, PembimbingJenis>> = {
      TA_UTAMA: 'TA_PENDAMPING',
      TA_PENDAMPING: 'TA_UTAMA',
    };
    const jenisPasangan = pasanganTA[jenis];
    if (!jenisPasangan) return;

    const [row] = await db
      .select({ id: pembimbingMahasiswa.id })
      .from(pembimbingMahasiswa)
      .where(
        and(
          eq(pembimbingMahasiswa.mahasiswaId, mahasiswaId),
          eq(pembimbingMahasiswa.jenis, jenisPasangan),
          eq(pembimbingMahasiswa.dosenId, dosenId),
          eq(pembimbingMahasiswa.statusAktif, true),
        ),
      )
      .limit(1);
    if (row) {
      throw new Error('Dosen yang sama tidak boleh menjadi Pembimbing 1 dan Pembimbing 2 sekaligus.');
    }
  }

  /**
   * Tetapkan/ganti pembimbing. Baris aktif lama untuk jenis yang sama dinonaktifkan
   * lalu baris baru di-insert dalam satu transaksi (unik parsial aman).
   */
  static async set(input: SetPembimbingInput, ditetapkanOlehId?: number | null, scopedProdiIds?: number[] | null) {
    const identitas = PembimbingService.normalizeIdentitas(input);
    const mhs = await PembimbingService.loadMahasiswa(input.mahasiswaId, scopedProdiIds);
    if (identitas.dosenId !== null) {
      await PembimbingService.validateDosen(identitas.dosenId, mhs.programStudiId);
    }
    await PembimbingService.validateCekSamaKonflik(input.mahasiswaId, input.jenis, identitas.dosenId);

    const created = await db.transaction(async (tx) => {
      await tx
        .update(pembimbingMahasiswa)
        .set({ statusAktif: false, updatedAt: new Date() })
        .where(
          and(
            eq(pembimbingMahasiswa.mahasiswaId, input.mahasiswaId),
            eq(pembimbingMahasiswa.jenis, input.jenis),
            eq(pembimbingMahasiswa.statusAktif, true),
          ),
        );
      const [row] = await tx
        .insert(pembimbingMahasiswa)
        .values({
          mahasiswaId: input.mahasiswaId,
          dosenId: identitas.dosenId,
          namaEksternal: identitas.namaEksternal,
          instansiEksternal: identitas.instansiEksternal,
          jenis: input.jenis,
          statusAktif: true,
          ditetapkanOlehId: ditetapkanOlehId ?? null,
          catatan: identitas.catatan,
        })
        .returning();
      return row;
    });

    return created;
  }

  /** Tetapkan satu pembimbing untuk banyak mahasiswa (validasi & riwayat per mahasiswa). */
  static async bulkSet(
    input: Omit<SetPembimbingInput, 'mahasiswaId'> & { mahasiswaIds: number[] },
    ditetapkanOlehId?: number | null,
    scopedProdiIds?: number[] | null,
  ): Promise<BulkSetPembimbingResult> {
    const result: BulkSetPembimbingResult = { updated: 0, errors: [] };
    for (const mahasiswaId of input.mahasiswaIds) {
      try {
        await PembimbingService.set({ ...input, mahasiswaId }, ditetapkanOlehId, scopedProdiIds);
        result.updated += 1;
      } catch (e: unknown) {
        result.errors.push({
          mahasiswaId,
          nim: null,
          error: e instanceof Error ? e.message : 'Gagal menetapkan pembimbing.',
        });
      }
    }
    // Lengkapi NIM pada pesan error agar mudah ditelusuri di UI.
    const ids = result.errors.map((e) => e.mahasiswaId);
    if (ids.length > 0) {
      const rows = await db
        .select({ id: mahasiswa.id, nim: mahasiswa.nim })
        .from(mahasiswa)
        .where(inArray(mahasiswa.id, ids));
      const nimById = new Map(rows.map((r) => [r.id, r.nim]));
      for (const item of result.errors) {
        item.nim = nimById.get(item.mahasiswaId) ?? null;
      }
    }
    return result;
  }

  /** Nonaktifkan satu penetapan (tanpa hard delete — riwayat tetap utuh). */
  static async nonaktifkan(id: number, scopedProdiIds?: number[] | null) {
    const [row] = await db
      .select({
        id: pembimbingMahasiswa.id,
        mahasiswaId: pembimbingMahasiswa.mahasiswaId,
        programStudiId: mahasiswa.programStudiId,
      })
      .from(pembimbingMahasiswa)
      .innerJoin(mahasiswa, eq(pembimbingMahasiswa.mahasiswaId, mahasiswa.id))
      .where(eq(pembimbingMahasiswa.id, id))
      .limit(1);
    if (!row) throw new Error('Data penetapan pembimbing tidak ditemukan.');
    if (scopedProdiIds && !scopedProdiIds.includes(row.programStudiId ?? -1)) {
      throw new Error('Data mahasiswa berada di luar cakupan program studi Anda.');
    }
    const [updated] = await db
      .update(pembimbingMahasiswa)
      .set({ statusAktif: false, updatedAt: new Date() })
      .where(eq(pembimbingMahasiswa.id, id))
      .returning();
    return updated;
  }

  /**
   * Daftar mahasiswa + penetapan pembimbing aktif. `belumDitetapkan` menyaring
   * mahasiswa yang belum punya penetapan aktif untuk `jenis` (atau untuk semua
   * jenis bila `jenis` tidak diisi).
   */
  static async list(filter: PembimbingListFilter, scopedProdiIds?: number[] | null) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(200, Math.max(1, filter.limit ?? 25));
    const offset = (page - 1) * limit;
    const includeHistory = filter.status === 'semua';

    const mhsWhere = [];
    if (scopedProdiIds) {
      if (scopedProdiIds.length === 0) {
        return { data: [] as PembimbingListItem[], total: 0, page, limit, totalPages: 0 };
      }
      mhsWhere.push(inArray(mahasiswa.programStudiId, scopedProdiIds));
    }
    if (filter.programStudiId) {
      mhsWhere.push(eq(mahasiswa.programStudiId, filter.programStudiId));
    }
    const angkatanList = filter.angkatanIds?.length ? filter.angkatanIds : filter.angkatan ? [filter.angkatan] : [];
    if (angkatanList.length > 0) {
      mhsWhere.push(inArray(mahasiswa.angkatan, angkatanList));
    }
    if (filter.search?.trim()) {
      const q = `%${filter.search.trim()}%`;
      mhsWhere.push(or(eq(mahasiswa.nim, filter.search.trim()), sql`${mahasiswa.nama} ILIKE ${q}`)!);
    }
    if (filter.mahasiswaId) {
      mhsWhere.push(eq(mahasiswa.id, filter.mahasiswaId));
    }
    if (filter.dosenId) {
      // Dosen melihat mahasiswa yang ia bimbing: sebagai PA, atau lewat penetapan
      // PKL/TA aktif. EXISTS ditulis sebagai SQL fragment agar tetap menyatu dengan
      // kondisi mahasiswa (bukan subquery Drizzle terpisah).
      mhsWhere.push(
        or(
          eq(mahasiswa.dosenPaId, filter.dosenId),
          sql`EXISTS (SELECT 1 FROM "pembimbing_mahasiswa" pm WHERE pm."mahasiswa_id" = ${mahasiswa.id} AND pm."dosen_id" = ${filter.dosenId} AND pm."status_aktif" = true)`,
        )!,
      );
    }
    // Penyaring "belum ditetapkan": mahasiswa tanpa penetapan AKTIF untuk jenis yang
    // sedang disaring (atau untuk semua jenis bila `jenis` tidak diisi).
    if (filter.belumDitetapkan) {
      const jenisFilter = filter.jenis ? [filter.jenis] : [...PEMBIMBING_JENIS];
      const assigned = db
        .select({ mahasiswaId: pembimbingMahasiswa.mahasiswaId })
        .from(pembimbingMahasiswa)
        .where(
          and(
            eq(pembimbingMahasiswa.statusAktif, true),
            inArray(pembimbingMahasiswa.jenis, jenisFilter),
            isNotNull(pembimbingMahasiswa.mahasiswaId),
          ),
        );
      mhsWhere.push(sql`NOT EXISTS (${assigned})`);
    }
    const mhsWhereSql = mhsWhere.length ? and(...mhsWhere) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select({ id: mahasiswa.id })
        .from(mahasiswa)
        .where(mhsWhereSql)
        .orderBy(desc(mahasiswa.angkatan), asc(mahasiswa.nim))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(mahasiswa).where(mhsWhereSql),
    ]);

    const items = await PembimbingService.composeItems(
      rows.map((r) => r.id),
      { includeHistory, jenisOnly: filter.jenis },
    );

    const total = Number(totalRows[0]?.value ?? 0);
    return { data: items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Susun item list dari daftar id mahasiswa: data mahasiswa + penetapan per jenis. */
  private static async composeItems(
    mahasiswaIds: number[],
    opts: { includeHistory: boolean; jenisOnly?: PembimbingJenis },
  ): Promise<PembimbingListItem[]> {
    if (mahasiswaIds.length === 0) return [];

    const mhsRows = await db
      .select({
        id: mahasiswa.id,
        nim: mahasiswa.nim,
        nama: mahasiswa.nama,
        angkatan: mahasiswa.angkatan,
        programStudiId: mahasiswa.programStudiId,
        prodiNama: programStudi.nama,
        dosenPaId: mahasiswa.dosenPaId,
        paNama: sql<string | null>`${dosen.nama}`,
      })
      .from(mahasiswa)
      .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id))
      .leftJoin(dosen, eq(mahasiswa.dosenPaId, dosen.id))
      .where(inArray(mahasiswa.id, mahasiswaIds));

    const jenisFilter = opts.jenisOnly ? [opts.jenisOnly] : [...PEMBIMBING_JENIS];
    const rows = await db
      .select({
        id: pembimbingMahasiswa.id,
        mahasiswaId: pembimbingMahasiswa.mahasiswaId,
        jenis: pembimbingMahasiswa.jenis,
        dosenId: pembimbingMahasiswa.dosenId,
        dosenNama: sql<string | null>`${dosen.nama}`,
        dosenNip: sql<string | null>`${dosen.nip}`,
        namaEksternal: pembimbingMahasiswa.namaEksternal,
        instansiEksternal: pembimbingMahasiswa.instansiEksternal,
        statusAktif: pembimbingMahasiswa.statusAktif,
        catatan: pembimbingMahasiswa.catatan,
        ditetapkanOlehNama: sql<string | null>`${users.nama}`,
        createdAt: pembimbingMahasiswa.createdAt,
        updatedAt: pembimbingMahasiswa.updatedAt,
      })
      .from(pembimbingMahasiswa)
      .leftJoin(dosen, eq(pembimbingMahasiswa.dosenId, dosen.id))
      .leftJoin(users, eq(pembimbingMahasiswa.ditetapkanOlehId, users.id))
      .where(
        opts.includeHistory
          ? and(inArray(pembimbingMahasiswa.mahasiswaId, mahasiswaIds), inArray(pembimbingMahasiswa.jenis, jenisFilter))
          : and(
              inArray(pembimbingMahasiswa.mahasiswaId, mahasiswaIds),
              inArray(pembimbingMahasiswa.jenis, jenisFilter),
              eq(pembimbingMahasiswa.statusAktif, true),
            ),
      )
      .orderBy(desc(pembimbingMahasiswa.updatedAt));

    const byMhs = new Map<number, PembimbingListItem['pembimbing']>();
    const totals = new Map<number, number>();
    for (const row of rows) {
      const map = byMhs.get(row.mahasiswaId) ?? emptyObject<PembimbingDetail>();
      if (row.jenis && PEMBIMBING_JENIS.includes(row.jenis as PembimbingJenis)) {
        map[row.jenis as PembimbingJenis] = {
          id: row.id,
          jenis: row.jenis as PembimbingJenis,
          dosenId: row.dosenId,
          dosenNama: row.dosenNama,
          dosenNip: row.dosenNip,
          namaEksternal: row.namaEksternal,
          instansiEksternal: row.instansiEksternal,
          statusAktif: row.statusAktif,
          catatan: row.catatan,
          ditetapkanOlehNama: row.ditetapkanOlehNama,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        };
        if (row.statusAktif) totals.set(row.mahasiswaId, (totals.get(row.mahasiswaId) ?? 0) + 1);
      }
      byMhs.set(row.mahasiswaId, map);
    }

    return mhsRows.map((m) => ({
      mahasiswaId: m.id,
      nim: m.nim,
      namaMahasiswa: m.nama,
      angkatan: m.angkatan,
      programStudiId: m.programStudiId,
      prodiNama: m.prodiNama,
      dosenPaId: m.dosenPaId,
      dosenPaNama: m.paNama,
      pembimbing: byMhs.get(m.id) ?? emptyObject<PembimbingDetail>(),
      jumlahDitetapkan: totals.get(m.id) ?? 0,
    }));
  }

  /** Penetapan aktif untuk satu mahasiswa (dipakai UI mahasiswa/dosen & default sesi bimbingan). */
  static async getByMahasiswa(mahasiswaId: number) {
    const items = await PembimbingService.composeItems([mahasiswaId], { includeHistory: false });
    return items[0] ?? null;
  }

  /** Riwayat penetapan (termasuk nonaktif) untuk satu mahasiswa. */
  static async getRiwayat(mahasiswaId: number): Promise<PembimbingRiwayatItem[]> {
    const [mhs] = await db
      .select({ nim: mahasiswa.nim, nama: mahasiswa.nama })
      .from(mahasiswa)
      .where(eq(mahasiswa.id, mahasiswaId))
      .limit(1);
    const rows = await db
      .select({
        id: pembimbingMahasiswa.id,
        mahasiswaId: pembimbingMahasiswa.mahasiswaId,
        jenis: pembimbingMahasiswa.jenis,
        dosenId: pembimbingMahasiswa.dosenId,
        dosenNama: sql<string | null>`${dosen.nama}`,
        dosenNip: sql<string | null>`${dosen.nip}`,
        namaEksternal: pembimbingMahasiswa.namaEksternal,
        instansiEksternal: pembimbingMahasiswa.instansiEksternal,
        statusAktif: pembimbingMahasiswa.statusAktif,
        catatan: pembimbingMahasiswa.catatan,
        ditetapkanOlehNama: sql<string | null>`${users.nama}`,
        createdAt: pembimbingMahasiswa.createdAt,
        updatedAt: pembimbingMahasiswa.updatedAt,
      })
      .from(pembimbingMahasiswa)
      .leftJoin(dosen, eq(pembimbingMahasiswa.dosenId, dosen.id))
      .leftJoin(users, eq(pembimbingMahasiswa.ditetapkanOlehId, users.id))
      .where(eq(pembimbingMahasiswa.mahasiswaId, mahasiswaId))
      .orderBy(desc(pembimbingMahasiswa.updatedAt));
    return rows.map((r) => ({
      ...r,
      jenis: r.jenis as PembimbingJenis,
      nim: mhs?.nim ?? '',
      namaMahasiswa: mhs?.nama ?? '',
    }));
  }

  /**
   * Dosen pembimbing default untuk kategori bimbingan tertentu
   * (TUGAS_AKHIR → TA_UTAMA, MAGANG → PKL). Dipakai saat membuat sesi bimbingan
   * bila dosen belum dipilih. Mengembalikan null bila belum ditetapkan.
   */
  static async resolvePembimbingDefault(
    mahasiswaId: number,
    kategoriBimbingan: string | null | undefined,
  ): Promise<number | null> {
    const map: Record<string, PembimbingJenis> = {
      TUGAS_AKHIR: 'TA_UTAMA',
      MAGANG: 'PKL',
    };
    const jenis = kategoriBimbingan ? map[kategoriBimbingan.toUpperCase()] : undefined;
    if (!jenis) return null;

    const [row] = await db
      .select({ dosenId: pembimbingMahasiswa.dosenId })
      .from(pembimbingMahasiswa)
      .where(
        and(
          eq(pembimbingMahasiswa.mahasiswaId, mahasiswaId),
          eq(pembimbingMahasiswa.jenis, jenis),
          eq(pembimbingMahasiswa.statusAktif, true),
          isNotNull(pembimbingMahasiswa.dosenId),
        ),
      )
      .limit(1);
    return row?.dosenId ?? null;
  }

  /**
   * Impor CSV penetapan pembimbing. Header: `nim`, `jenis` (opsional),
   * `nip_dosen` (opsional) atau `nama_eksternal` + `instansi_eksternal`,
   * `catatan` (opsional). Proses per baris — satu baris gagal tidak
   * membatalkan baris lain.
   */
  static async importCsv(
    csvText: string,
    opts: { jenisDefault?: PembimbingJenis; ditetapkanOlehId?: number | null; scopedProdiIds?: number[] | null },
  ): Promise<ImporPembimbingResult> {
    const result: ImporPembimbingResult = { successCount: 0, skippedCount: 0, errors: [] };
    const rows = CsvPembimbingParser.parse(csvText);
    if (rows.length === 0) {
      result.errors.push({ line: 1, error: 'CSV kosong atau hanya berisi header.' });
      return result;
    }

    const header = rows[0].map((h) => h.toLowerCase().trim());
    const idx = {
      nim: header.indexOf('nim'),
      jenis: header.indexOf('jenis'),
      nip: header.indexOf('nip_dosen') !== -1 ? header.indexOf('nip_dosen') : header.indexOf('nip'),
      nama: header.indexOf('nama_eksternal'),
      instansi: header.indexOf('instansi_eksternal'),
      catatan: header.indexOf('catatan'),
    };
    if (idx.nim === -1) {
      result.errors.push({ line: 1, error: 'CSV harus memiliki kolom header "nim".' });
      return result;
    }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const lineNo = i + 1;
      const cell = (index: number): string => (index === -1 ? '' : (row[index] ?? '').trim());
      const nim = cell(idx.nim);
      if (!nim) continue; // baris kosong → lewati diam-diam

      const jenisRaw = (cell(idx.jenis) || opts.jenisDefault || '').toUpperCase().replace(/[\s-]/g, '_');
      if (!PEMBIMBING_JENIS.includes(jenisRaw as PembimbingJenis)) {
        result.errors.push({
          line: lineNo,
          error: `Jenis pembimbing tidak dikenal: "${cell(idx.jenis) || '-'}". Gunakan PKL, TA_UTAMA, atau TA_PENDAMPING.`,
        });
        continue;
      }

      try {
        const [mhs] = await db
          .select({ id: mahasiswa.id, programStudiId: mahasiswa.programStudiId })
          .from(mahasiswa)
          .where(eq(mahasiswa.nim, nim))
          .limit(1);
        if (!mhs) {
          result.errors.push({ line: lineNo, error: `Mahasiswa dengan NIM "${nim}" tidak ditemukan.` });
          continue;
        }

        const nip = cell(idx.nip);
        let dosenId: number | null = null;
        if (nip) {
          const [dsn] = await db.select({ id: dosen.id }).from(dosen).where(eq(dosen.nip, nip)).limit(1);
          if (!dsn) {
            result.errors.push({ line: lineNo, error: `Dosen dengan NIP "${nip}" tidak ditemukan.` });
            continue;
          }
          dosenId = dsn.id;
        }

        await PembimbingService.set(
          {
            mahasiswaId: mhs.id,
            jenis: jenisRaw as PembimbingJenis,
            dosenId,
            namaEksternal: cell(idx.nama) || null,
            instansiEksternal: cell(idx.instansi) || null,
            catatan: cell(idx.catatan) || null,
          },
          opts.ditetapkanOlehId ?? null,
          opts.scopedProdiIds,
        );
        result.successCount += 1;
      } catch (e: unknown) {
        result.errors.push({
          line: lineNo,
          error: e instanceof Error ? e.message : 'Gagal menyimpan penetapan pembimbing.',
        });
      }
    }

    return result;
  }
}

/**
 * Pemisah CSV sederhana yang menghormati tanda kutip. Pemisahdideteksi otomatis
 * (`,` atau `;`) dari baris header agar nilai seperti nama instansi yang memuat
 * tanda koma tidak salah pecah.
 */
class CsvPembimbingParser {
  static parse(text: string): string[][] {
    const clean = text.replace(/^\uFEFF/, '');
    const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
    const delimiter = (firstLine.split(';').length ?? 0) > (firstLine.split(',').length ?? 0) ? ';' : ',';

    const rows: string[][] = [];
    let current: string[] = [];
    let field = '';
    let inQuotes = false;

    const pushRow = () => {
      current.push(field);
      field = '';
      const cleaned = current.map((c) => c.trim());
      current = [];
      if (cleaned.some((c) => c !== '')) rows.push(cleaned);
    };

    for (let i = 0; i < clean.length; i++) {
      const ch = clean[i];
      if (inQuotes) {
        if (ch === '"') {
          if (clean[i + 1] === '"') {
            field += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
        continue;
      }
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        current.push(field);
        field = '';
      } else if (ch === '\n') {
        pushRow();
      } else if (ch !== '\r') {
        field += ch;
      }
    }
    if (field.length > 0 || current.length > 0) pushRow();

    return rows;
  }
}
