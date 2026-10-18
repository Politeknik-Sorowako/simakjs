import { and, asc, count, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  aktivitasMbkm,
  aktivitasMbkmStatusLog,
  anggotaAktivitasMbkm,
  bimbingan,
  bimbinganAktivitasMbkm,
  dosen,
  jenisAktivitasMbkm,
  konversiAktivitasMbkm,
  mahasiswa,
  mataKuliah,
  periodeAkademik,
  programStudi,
  users,
} from '../models/schema';
import { db } from '../utils/db';

/** Alias agar pembuat dan penyetuju aktivitas bisa ditampilkan terpisah. */
const usersDisetujui = alias(users, 'users_disetujui_aktivitas');
/** Alias untuk nama pelaku override status (bisa berbeda dari penyetuju approve). */
const usersOverride = alias(users, 'users_override_aktivitas');

export const STATUS_AKTIVITAS = ['draft', 'diajukan', 'disetujui', 'ditolak', 'selesai'] as const;
export type StatusAktivitas = (typeof STATUS_AKTIVITAS)[number];

export interface AktivitasInput {
  judul: string;
  jenisId: number;
  periodeId?: string | null;
  programStudiId?: number | null;
  lokasi?: string | null;
  institusi?: string | null;
  tanggalMulai?: string | null;
  tanggalSelesai?: string | null;
  sks?: number | null;
  deskripsi?: string | null;
}

export interface AktivitasListFilter {
  status?: StatusAktivitas;
  programStudiId?: number;
  periodeId?: string;
  jenisId?: number;
  search?: string;
  /** Batasi ke mahasiswa tertentu (dipakai mahasiswa melihat kegiatannya sendiri). */
  mahasiswaId?: number;
  page?: number;
  limit?: number;
}

export interface AktivitasAnggotaInput {
  mahasiswaId: number;
  peran?: 'ketua' | 'anggota';
}

export interface AktivitasPembimbingInput {
  dosenId: number;
  kategori?: 'pembimbing' | 'pendamping';
}

export interface AktivitasKonversiInput {
  mataKuliahId: number;
  sksDiakui: number;
}

export interface AktivitasDetail {
  id: number;
  judul: string;
  jenisId: number;
  jenisNama: string | null;
  periodeId: string | null;
  programStudiId: number | null;
  prodiNama: string | null;
  lokasi: string | null;
  institusi: string | null;
  tanggalMulai: string | null;
  tanggalSelesai: string | null;
  sks: number;
  status: StatusAktivitas;
  deskripsi: string | null;
  idPddikti: string | null;
  dibuatOlehNama: string | null;
  disetujuiOlehNama: string | null;
  disetujuiAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  anggota: Array<{
    id: number;
    mahasiswaId: number;
    nim: string;
    nama: string;
    peran: string;
  }>;
  pembimbing: Array<{
    id: number;
    dosenId: number;
    dosenNama: string | null;
    dosenNip: string | null;
    kategori: string;
  }>;
  konversi: Array<{
    id: number;
    mataKuliahId: number;
    mataKuliahKode: string | null;
    mataKuliahNama: string | null;
    sksDiakui: number;
  }>;
  /** Baris bimbingan (kategori MAGANG) yang dibuat otomatis dari aktivitas ini. */
  bimbinganTertaut: Array<{ id: number; mahasiswaId: number; periodeId: string }>;
  /** Jejak perubahan status manual (override) oleh admin/prodi/kaprodi. */
  riwayatStatus: StatusLogItem[];
}

export interface StatusLogItem {
  id: number;
  dariStatus: StatusAktivitas | null;
  keStatus: StatusAktivitas;
  alasan: string;
  olehNama: string | null;
  createdAt: Date;
}

export interface OverrideStatusInput {
  status: StatusAktivitas;
  alasan: string;
}

export class AktivitasMbkmService {
  // ── Master jenis ────────────────────────────────────────────────────────────
  static async listJenis() {
    return await db
      .select()
      .from(jenisAktivitasMbkm)
      .where(eq(jenisAktivitasMbkm.isAktif, true))
      .orderBy(asc(jenisAktivitasMbkm.nama));
  }

  // ── Create / update ─────────────────────────────────────────────────────────
  static async create(input: AktivitasInput, createdById: number) {
    AktivitasMbkmService.validateTanggal(input);
    const [row] = await db
      .insert(aktivitasMbkm)
      .values({
        judul: input.judul.trim(),
        jenisId: input.jenisId,
        periodeId: input.periodeId ?? null,
        programStudiId: input.programStudiId ?? null,
        lokasi: input.lokasi?.trim() || null,
        institusi: input.institusi?.trim() || null,
        tanggalMulai: input.tanggalMulai ?? null,
        tanggalSelesai: input.tanggalSelesai ?? null,
        sks: Math.max(0, Math.floor(input.sks ?? 0)),
        deskripsi: input.deskripsi?.trim() || null,
        status: 'draft',
        createdById,
      })
      .returning();
    return row;
  }

  static async update(id: number, input: AktivitasInput, scopedProdiIds?: number[] | null) {
    const existing = await AktivitasMbkmService.loadOwned(id, scopedProdiIds);
    if (!existing) throw new Error('Data aktivitas tidak ditemukan.');
    if (existing.status !== 'draft') {
      throw new Error('Hanya aktivitas berstatus draft yang dapat diubah.');
    }
    AktivitasMbkmService.validateTanggal(input);
    const [row] = await db
      .update(aktivitasMbkm)
      .set({
        judul: input.judul.trim(),
        jenisId: input.jenisId,
        periodeId: input.periodeId ?? null,
        programStudiId: input.programStudiId ?? null,
        lokasi: input.lokasi?.trim() || null,
        institusi: input.institusi?.trim() || null,
        tanggalMulai: input.tanggalMulai ?? null,
        tanggalSelesai: input.tanggalSelesai ?? null,
        sks: Math.max(0, Math.floor(input.sks ?? 0)),
        deskripsi: input.deskripsi?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(aktivitasMbkm.id, id))
      .returning();
    return row;
  }

  private static validateTanggal(input: AktivitasInput): void {
    if (input.tanggalMulai && input.tanggalSelesai && input.tanggalSelesai < input.tanggalMulai) {
      throw new Error('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
    }
  }

  /** Aktivitas boleh diubah/dihapus hanya bila belum punya bimbingan tertaut (kredit BKD). */
  private static async loadOwned(id: number, scopedProdiIds?: number[] | null) {
    const [row] = await db
      .select({ id: aktivitasMbkm.id, status: aktivitasMbkm.status, prodiId: aktivitasMbkm.programStudiId })
      .from(aktivitasMbkm)
      .where(eq(aktivitasMbkm.id, id))
      .limit(1);
    if (!row) return null;
    if (scopedProdiIds && !scopedProdiIds.includes(row.prodiId ?? -1)) {
      throw new Error('Aktivitas berada di luar cakupan program studi Anda.');
    }
    return row;
  }

  static async remove(id: number, scopedProdiIds?: number[] | null) {
    const existing = await AktivitasMbkmService.loadOwned(id, scopedProdiIds);
    if (!existing) throw new Error('Data aktivitas tidak ditemukan.');
    const [tertaut] = await db
      .select({ id: bimbingan.id })
      .from(bimbingan)
      .where(and(eq(bimbingan.aktivitasMbkmId, id), eq(bimbingan.statusBkd, true)))
      .limit(1);
    if (tertaut) {
      throw new Error('Aktivitas sudah memiliki bimbingan terkait yang tercatat di BKD; hapus tidak diizinkan.');
    }
    await db.delete(aktivitasMbkm).where(eq(aktivitasMbkm.id, id));
    return { deleted: 1 };
  }

  // ── Anggota / pembimbing / konversi ───────────────────────────────────────
  static async addAnggota(aktivitasId: number, input: AktivitasAnggotaInput) {
    const [mhs] = await db
      .select({ id: mahasiswa.id })
      .from(mahasiswa)
      .where(eq(mahasiswa.id, input.mahasiswaId))
      .limit(1);
    if (!mhs) throw new Error('Mahasiswa tidak ditemukan.');
    const [row] = await db
      .insert(anggotaAktivitasMbkm)
      .values({
        aktivitasId,
        mahasiswaId: input.mahasiswaId,
        peran: input.peran ?? 'anggota',
      })
      .onConflictDoNothing()
      .returning();
    return row ?? null;
  }

  static async removeAnggota(aktivitasId: number, anggotaId: number) {
    const rows = await db
      .delete(anggotaAktivitasMbkm)
      .where(and(eq(anggotaAktivitasMbkm.id, anggotaId), eq(anggotaAktivitasMbkm.aktivitasId, aktivitasId)))
      .returning();
    if (rows.length === 0) throw new Error('Anggota tidak ditemukan pada aktivitas ini.');
    return { deleted: rows.length };
  }

  static async addPembimbing(aktivitasId: number, input: AktivitasPembimbingInput) {
    const [dsn] = await db.select({ id: dosen.id }).from(dosen).where(eq(dosen.id, input.dosenId)).limit(1);
    if (!dsn) throw new Error('Dosen pembimbing tidak ditemukan.');
    const [row] = await db
      .insert(bimbinganAktivitasMbkm)
      .values({ aktivitasId, dosenId: input.dosenId, kategori: input.kategori ?? 'pembimbing' })
      .onConflictDoNothing()
      .returning();
    return row ?? null;
  }

  static async removePembimbing(aktivitasId: number, pembimbingId: number) {
    const rows = await db
      .delete(bimbinganAktivitasMbkm)
      .where(and(eq(bimbinganAktivitasMbkm.id, pembimbingId), eq(bimbinganAktivitasMbkm.aktivitasId, aktivitasId)))
      .returning();
    if (rows.length === 0) throw new Error('Pembimbing tidak ditemukan pada aktivitas ini.');
    return { deleted: rows.length };
  }

  /**
   * Rekognisi SKS ke mata kuliah. Total SKS yang diakui untuk satu aktivitas
   * tidak boleh melebihi SKS aktivitas (aturan Dikti) dan tiap MK hanya sekali.
   */
  static async addKonversi(aktivitasId: number, input: AktivitasKonversiInput) {
    const [aktivitas] = await db
      .select({ id: aktivitasMbkm.id, sks: aktivitasMbkm.sks, status: aktivitasMbkm.status })
      .from(aktivitasMbkm)
      .where(eq(aktivitasMbkm.id, aktivitasId))
      .limit(1);
    if (!aktivitas) throw new Error('Aktivitas tidak ditemukan.');
    if (aktivitas.status === 'draft' || aktivitas.status === 'diajukan') {
      throw new Error('Konversi SKS hanya dapat ditambahkan pada aktivitas yang telah disetujui.');
    }
    const [mk] = await db
      .select({ id: mataKuliah.id })
      .from(mataKuliah)
      .where(eq(mataKuliah.id, input.mataKuliahId))
      .limit(1);
    if (!mk) throw new Error('Mata kuliah tidak ditemukan.');
    if (input.sksDiakui <= 0) throw new Error('SKS diakui harus lebih besar dari nol.');

    const existing = await db
      .select({ total: sql<number>`COALESCE(SUM(${konversiAktivitasMbkm.sksDiakui}), 0)` })
      .from(konversiAktivitasMbkm)
      .where(eq(konversiAktivitasMbkm.aktivitasId, aktivitasId));
    const total = Number(existing[0]?.total ?? 0);
    if (total + input.sksDiakui > aktivitas.sks) {
      throw new Error(`Total SKS diakui (${total + input.sksDiakui}) melebihi SKS aktivitas (${aktivitas.sks}).`);
    }
    const [row] = await db
      .insert(konversiAktivitasMbkm)
      .values({ aktivitasId, mataKuliahId: input.mataKuliahId, sksDiakui: input.sksDiakui })
      .onConflictDoNothing()
      .returning();
    return row ?? null;
  }

  static async removeKonversi(aktivitasId: number, konversiId: number) {
    const rows = await db
      .delete(konversiAktivitasMbkm)
      .where(and(eq(konversiAktivitasMbkm.id, konversiId), eq(konversiAktivitasMbkm.aktivitasId, aktivitasId)))
      .returning();
    if (rows.length === 0) throw new Error('Konversi tidak ditemukan pada aktivitas ini.');
    return { deleted: rows.length };
  }

  // ── Workflow ───────────────────────────────────────────────────────────────
  /**
   * Ajukan aktivitas ke verifikasi. Syarat: judul, jenis, periode, SKS > 0,
   * minimal satu anggota, dan minimal satu pembimbing.
   */
  static async ajukan(id: number, scopedProdiIds?: number[] | null) {
    const existing = await AktivitasMbkmService.loadOwned(id, scopedProdiIds);
    if (!existing) throw new Error('Data aktivitas tidak ditemukan.');
    if (existing.status !== 'draft') throw new Error('Hanya aktivitas draft yang dapat diajukan.');

    const [detail] = await AktivitasMbkmService.composeItems([id], { includeHistory: false });
    if (!detail) throw new Error('Data aktivitas tidak ditemukan.');
    if (!detail.periodeId) throw new Error('Periode akademik wajib diisi sebelum mengajukan.');
    if (detail.sks <= 0) throw new Error('SKS wajib lebih besar dari nol sebelum mengajukan.');
    if (detail.anggota.length === 0) throw new Error('Minimal satu anggota mahasiswa wajib ditambahkan.');
    if (detail.pembimbing.length === 0) throw new Error('Minimal satu dosen pembimbing wajib ditambahkan.');

    const [row] = await db
      .update(aktivitasMbkm)
      .set({ status: 'diajukan', updatedAt: new Date() })
      .where(eq(aktivitasMbkm.id, id))
      .returning();
    return row;
  }

  /**
   * Setujui aktivitas. Saat disetujui, sistem membuat baris bimbingan kategori
   * `MAGANG` untuk tiap (pembimbing × anggota) bila belum ada, sehingga sesi
   * bimbingan PKL otomatis tercatat dan ter-kredit BKD lewat alur yang sama
   * dengan bimbingan manual (logika BKD tidak diubah). Idempoten: menjalankan
   * approve ulang tidak menghasilkan baris ganda.
   */
  static async setujui(id: number, disetujuiOlehId: number, scopedProdiIds?: number[] | null) {
    const existing = await AktivitasMbkmService.loadOwned(id, scopedProdiIds);
    if (!existing) throw new Error('Data aktivitas tidak ditemukan.');
    if (existing.status === 'selesai') throw new Error('Aktivitas yang sudah selesai tidak dapat disetujui ulang.');
    if (existing.status !== 'diajukan') throw new Error('Hanya aktivitas berstatus diajukan yang dapat disetujui.');

    const [detail] = await AktivitasMbkmService.composeItems([id], { includeHistory: false });
    if (!detail) throw new Error('Data aktivitas tidak ditemukan.');
    if (detail.anggota.length === 0 || detail.pembimbing.length === 0) {
      throw new Error('Aktivitas harus memiliki minimal satu anggota dan satu pembimbing.');
    }

    const linked = await AktivitasMbkmService.linkBimbing(detail);
    const [row] = await db
      .update(aktivitasMbkm)
      .set({ status: 'disetujui', disetujuiOlehId, disetujuiAt: new Date(), updatedAt: new Date() })
      .where(eq(aktivitasMbkm.id, id))
      .returning();
    return { row, bimbinganDibuat: linked.created, bimbinganDilewati: linked.skipped };
  }

  static async tolak(id: number, scopedProdiIds?: number[] | null) {
    const existing = await AktivitasMbkmService.loadOwned(id, scopedProdiIds);
    if (!existing) throw new Error('Data aktivitas tidak ditemukan.');
    if (existing.status !== 'diajukan') throw new Error('Hanya aktivitas berstatus diajukan yang dapat ditolak.');
    const [row] = await db
      .update(aktivitasMbkm)
      .set({ status: 'ditolak', updatedAt: new Date() })
      .where(eq(aktivitasMbkm.id, id))
      .returning();
    return row;
  }

  /**
   * Override status aktivitas di luar alur normal. Hanya untuk koreksi data di
   * lapangan (mis. pengajuan tersesat atau persetujuan keliru), dan setiap
   * override wajib menyertakan alasan yang tersimpan permanen.
   *
   * Perbedaan dari alur normal:
   * - Melompat ke `disetujui` TIDAK mensyaratkan periode/anggota/pembimbing,
   *   tetapi tetap menjalankan `linkBimbingan` agar bimbingan PKL tercipta dan
   *   ter-kredit BKD sama seperti approve normal.
   * - Turun ke status non-`disetujui`/`selesai` (draft/diajukan/ditolak)
   *   MEMUTUS tautan `bimbingan.aktivitas_mbkm_id` pada baris terkait. Baris
   *   bimbingan, sesi, dan kredit BKD-nya tetap ada sebagai riwayat — hanya
   *   klaim "dihasilkan oleh aktivitas ini" yang dicabut, supaya tidak terjadi
   *   tautan yatim yang menyesatkan saat aktivitas di-override lagi nanti.
   * - Beralih ke `disetujui` juga menstempel `disetujuiOlehId/At`; turun dari
   *   `disetujui`/`selesai` membersihkannya supaya kolom tidak menyesatkan.
   */
  static async overrideStatus(
    id: number,
    input: OverrideStatusInput,
    olehUserId: number,
    scopedProdiIds?: number[] | null,
  ) {
    const existing = await AktivitasMbkmService.loadOwned(id, scopedProdiIds);
    if (!existing) throw new Error('Data aktivitas tidak ditemukan.');
    if (existing.status === input.status) {
      throw new Error(`Status aktivitas sudah '${input.status}'. Pilih status yang berbeda.`);
    }
    const alasan = input.alasan.trim();
    if (alasan.length < 10) throw new Error('Alasan override minimal 10 karakter.');
    if (alasan.length > 500) throw new Error('Alasan override maksimal 500 karakter.');

    const detail = await AktivitasMbkmService.composeItems([id], { includeHistory: false }).then((rows) => rows[0]);
    if (!detail) throw new Error('Data aktivitas tidak ditemukan.');

    const dariStatus = detail.status;
    const menujuDisetujui = input.status === 'disetujui' || input.status === 'selesai';

    // Penautan bimbingan dijalankan DI LUAR transaksi: `linkBimbingan` memakai
    // pool `db` sendiri (sama seperti `setujui`), jadi memanggilnya di dalam
    // `db.transaction` akan memakai koneksi kedua dan berisiko lock. Tabrakan
    // tidak mungkin karena tautan hanya ditulis bila `aktivitas_mbkm_id` masih
    // NULL, dan operasi ini idempoten.
    let bimbinganDibuat = 0;
    let bimbinganDilewati = 0;
    if (input.status === 'disetujui') {
      const linked = await AktivitasMbkmService.linkBimbing(detail);
      bimbinganDibuat = linked.created;
      bimbinganDilewati = linked.skipped;
    }

    return await db.transaction(async (tx) => {
      let bimbinganDiputus = 0;

      // Turun ke draft/diajukan/ditolak → putus tautan bimbingan PKL.
      if (!menujuDisetujui) {
        const diputus = await tx
          .update(bimbingan)
          .set({ aktivitasMbkmId: null, updatedAt: new Date() })
          .where(eq(bimbingan.aktivitasMbkmId, id))
          .returning({ id: bimbingan.id });
        bimbinganDiputus = diputus.length;
      }

      const [row] = await tx
        .update(aktivitasMbkm)
        .set({
          status: input.status,
          // Stempel persetujuan hanya relevan bila berstatus disetujui/selesai;
          // di bawah itu dibersihkan agar tidak tampak sudah pernah disetujui.
          disetujuiOlehId: menujuDisetujui ? olehUserId : null,
          disetujuiAt: menujuDisetujui ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(aktivitasMbkm.id, id))
        .returning();

      await tx.insert(aktivitasMbkmStatusLog).values({
        aktivitasId: id,
        dariStatus,
        keStatus: input.status,
        alasan,
        olehUserId,
      });

      return {
        row,
        bimbinganDibuat,
        bimbinganDilewati,
        bimbinganDiputus,
      };
    });
  }

  static async setSelesai(id: number, scopedProdiIds?: number[] | null) {
    const existing = await AktivitasMbkmService.loadOwned(id, scopedProdiIds);
    if (!existing) throw new Error('Data aktivitas tidak ditemukan.');
    if (existing.status !== 'disetujui') {
      throw new Error('Hanya aktivitas berstatus disetujui yang dapat ditandai selesai.');
    }
    const [row] = await db
      .update(aktivitasMbkm)
      .set({ status: 'selesai', updatedAt: new Date() })
      .where(eq(aktivitasMbkm.id, id))
      .returning();
    return row;
  }

  private static async linkBimbing(detail: AktivitasDetail) {
    if (!detail.periodeId) return { created: 0, skipped: 0 };

    // Periode bimbingan mengikuti periode aktivitas bila periode tersebut bukan
    // periode aktif — getOrCreate hanya membuat baris pada periode aktif.
    const [aktif] = await db
      .select({ id: periodeAkademik.id })
      .from(periodeAkademik)
      .where(eq(periodeAkademik.aktif, true))
      .limit(1);

    const { BimbinganService } = await import('./bimbingan.service');
    let created = 0;
    let skipped = 0;

    for (const pb of detail.pembimbing) {
      if (!pb.dosenId) continue;
      for (const ag of detail.anggota) {
        const targetPeriode = detail.periodeId === aktif?.id ? detail.periodeId : undefined;
        const before = await AktivitasMbkmService.countBimbingan(ag.mahasiswaId, 'MAGANG', targetPeriode);
        const bimb = await BimbinganService.getOrCreateBimbingan(ag.mahasiswaId, targetPeriode, 'MAGANG');
        await db
          .update(bimbingan)
          .set({ aktivitasMbkmId: detail.id, updatedAt: new Date() })
          .where(and(eq(bimbingan.id, bimb.id), isNullAktivitas()));
        const after = await AktivitasMbkmService.countBimbingan(ag.mahasiswaId, 'MAGANG', targetPeriode);
        if (after > before) created += 1;
        else skipped += 1;
      }
    }
    return { created, skipped };
  }

  private static async countBimbingan(mahasiswaId: number, kategori: string, periodeId?: string) {
    const conds = [eq(bimbingan.mahasiswaId, mahasiswaId), eq(bimbingan.kategori, kategori)];
    if (periodeId) conds.push(eq(bimbingan.periodeId, periodeId));
    const [row] = await db
      .select({ value: count() })
      .from(bimbingan)
      .where(and(...conds));
    return Number(row?.value ?? 0);
  }

  // ── Read ───────────────────────────────────────────────────────────────────
  static async list(filter: AktivitasListFilter, scopedProdiIds?: number[] | null) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(200, Math.max(1, filter.limit ?? 25));
    const offset = (page - 1) * limit;

    const conds = [];
    if (filter.status) conds.push(eq(aktivitasMbkm.status, filter.status));
    if (filter.programStudiId) conds.push(eq(aktivitasMbkm.programStudiId, filter.programStudiId));
    if (scopedProdiIds) {
      if (scopedProdiIds.length === 0) {
        return { data: [] as AktivitasDetail[], total: 0, page, limit, totalPages: 0 };
      }
      conds.push(inArray(aktivitasMbkm.programStudiId, scopedProdiIds));
    }
    if (filter.periodeId) conds.push(eq(aktivitasMbkm.periodeId, filter.periodeId));
    if (filter.jenisId) conds.push(eq(aktivitasMbkm.jenisId, filter.jenisId));
    if (filter.search?.trim()) {
      const q = `%${filter.search.trim()}%`;
      conds.push(sql`${aktivitasMbkm.judul} ILIKE ${q}`);
    }
    if (filter.mahasiswaId) {
      const anggota = db
        .select({ aktivitasId: anggotaAktivitasMbkm.aktivitasId })
        .from(anggotaAktivitasMbkm)
        .where(eq(anggotaAktivitasMbkm.mahasiswaId, filter.mahasiswaId));
      conds.push(sql`${aktivitasMbkm.id} IN ${anggota}`);
    }
    const whereSql = conds.length ? and(...conds) : undefined;

    const [rows, totalRows] = await Promise.all([
      db
        .select({ id: aktivitasMbkm.id })
        .from(aktivitasMbkm)
        .where(whereSql)
        .orderBy(desc(aktivitasMbkm.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(aktivitasMbkm).where(whereSql),
    ]);

    const items = await AktivitasMbkmService.composeItems(
      rows.map((r) => r.id),
      { includeHistory: false },
    );
    const total = Number(totalRows[0]?.value ?? 0);
    return { data: items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  static async getById(id: number) {
    // Detail membaca `riwayatStatus` (dipakai modal detail & endpoint status-log),
    // jadi riwayat harus ikut di-compose di sini.
    const [row] = await AktivitasMbkmService.composeItems([id], { includeHistory: true });
    if (!row) throw new Error('Data aktivitas tidak ditemukan.');
    return row;
  }

  /**
   * Susun detail lengkap (anggota, pembimbing, konversi, bimbingan tertaut).
   * `includeHistory` mengontrol pengambilan `riwayatStatus`: daftar aktivitas
   * tidak menampilkannya, jadi query status-log (beserta join `users`) dilewati
   * agar tidak membebani endpoint list dengan tabel yang tidak dibutuhkan.
   */
  static async composeItems(ids: number[], opts: { includeHistory: boolean }): Promise<AktivitasDetail[]> {
    if (ids.length === 0) return [];

    const heads = await db
      .select({
        id: aktivitasMbkm.id,
        judul: aktivitasMbkm.judul,
        jenisId: aktivitasMbkm.jenisId,
        jenisNama: sql<string | null>`${jenisAktivitasMbkm.nama}`,
        periodeId: aktivitasMbkm.periodeId,
        programStudiId: aktivitasMbkm.programStudiId,
        prodiNama: sql<string | null>`${programStudi.nama}`,
        lokasi: aktivitasMbkm.lokasi,
        institusi: aktivitasMbkm.institusi,
        tanggalMulai: aktivitasMbkm.tanggalMulai,
        tanggalSelesai: aktivitasMbkm.tanggalSelesai,
        sks: aktivitasMbkm.sks,
        status: aktivitasMbkm.status,
        deskripsi: aktivitasMbkm.deskripsi,
        idPddikti: aktivitasMbkm.idPddikti,
        dibuatOlehNama: sql<string | null>`${users.nama}`,
        disetujuiOlehNama: sql<string | null>`${usersDisetujui.nama}`,
        disetujuiAt: aktivitasMbkm.disetujuiAt,
        createdAt: aktivitasMbkm.createdAt,
        updatedAt: aktivitasMbkm.updatedAt,
      })
      .from(aktivitasMbkm)
      .leftJoin(jenisAktivitasMbkm, eq(aktivitasMbkm.jenisId, jenisAktivitasMbkm.id))
      .leftJoin(programStudi, eq(aktivitasMbkm.programStudiId, programStudi.id))
      .leftJoin(users, eq(aktivitasMbkm.createdById, users.id))
      .leftJoin(usersDisetujui, eq(aktivitasMbkm.disetujuiOlehId, usersDisetujui.id))
      .where(inArray(aktivitasMbkm.id, ids));

    const anggotaRows = await db
      .select({
        aktivitasId: anggotaAktivitasMbkm.aktivitasId,
        id: anggotaAktivitasMbkm.id,
        mahasiswaId: anggotaAktivitasMbkm.mahasiswaId,
        peran: anggotaAktivitasMbkm.peran,
        nim: mahasiswa.nim,
        nama: mahasiswa.nama,
      })
      .from(anggotaAktivitasMbkm)
      .innerJoin(mahasiswa, eq(anggotaAktivitasMbkm.mahasiswaId, mahasiswa.id))
      .where(inArray(anggotaAktivitasMbkm.aktivitasId, ids));

    const pembimbingRows = await db
      .select({
        aktivitasId: bimbinganAktivitasMbkm.aktivitasId,
        id: bimbinganAktivitasMbkm.id,
        dosenId: bimbinganAktivitasMbkm.dosenId,
        kategori: bimbinganAktivitasMbkm.kategori,
        dosenNama: sql<string | null>`${dosen.nama}`,
        dosenNip: sql<string | null>`${dosen.nip}`,
      })
      .from(bimbinganAktivitasMbkm)
      .leftJoin(dosen, eq(bimbinganAktivitasMbkm.dosenId, dosen.id))
      .where(inArray(bimbinganAktivitasMbkm.aktivitasId, ids));

    const konversiRows = await db
      .select({
        aktivitasId: konversiAktivitasMbkm.aktivitasId,
        id: konversiAktivitasMbkm.id,
        mataKuliahId: konversiAktivitasMbkm.mataKuliahId,
        sksDiakui: konversiAktivitasMbkm.sksDiakui,
        kode: sql<string | null>`${mataKuliah.kode}`,
        nama: sql<string | null>`${mataKuliah.nama}`,
      })
      .from(konversiAktivitasMbkm)
      .leftJoin(mataKuliah, eq(konversiAktivitasMbkm.mataKuliahId, mataKuliah.id))
      .where(inArray(konversiAktivitasMbkm.aktivitasId, ids));

    const bimbinganRows = await db
      .select({
        aktivitasId: bimbingan.aktivitasMbkmId,
        id: bimbingan.id,
        mahasiswaId: bimbingan.mahasiswaId,
        periodeId: bimbingan.periodeId,
      })
      .from(bimbingan)
      .where(and(inArray(bimbingan.aktivitasMbkmId, ids), isNotNull(bimbingan.aktivitasMbkmId)));

    const statusLogRows = opts.includeHistory
      ? await db
          .select({
            aktivitasId: aktivitasMbkmStatusLog.aktivitasId,
            id: aktivitasMbkmStatusLog.id,
            dariStatus: aktivitasMbkmStatusLog.dariStatus,
            keStatus: aktivitasMbkmStatusLog.keStatus,
            alasan: aktivitasMbkmStatusLog.alasan,
            olehNama: sql<string | null>`${usersOverride.nama}`,
            createdAt: aktivitasMbkmStatusLog.createdAt,
          })
          .from(aktivitasMbkmStatusLog)
          .leftJoin(usersOverride, eq(aktivitasMbkmStatusLog.olehUserId, usersOverride.id))
          .where(inArray(aktivitasMbkmStatusLog.aktivitasId, ids))
          .orderBy(desc(aktivitasMbkmStatusLog.createdAt))
      : [];

    return heads.map((h) => ({
      id: h.id,
      judul: h.judul,
      jenisId: h.jenisId,
      jenisNama: h.jenisNama,
      periodeId: h.periodeId,
      programStudiId: h.programStudiId,
      prodiNama: h.prodiNama,
      lokasi: h.lokasi,
      institusi: h.institusi,
      tanggalMulai: h.tanggalMulai,
      tanggalSelesai: h.tanggalSelesai,
      sks: h.sks,
      status: h.status as StatusAktivitas,
      deskripsi: h.deskripsi,
      idPddikti: h.idPddikti,
      dibuatOlehNama: h.dibuatOlehNama,
      disetujuiOlehNama: h.disetujuiOlehNama,
      disetujuiAt: h.disetujuiAt,
      createdAt: h.createdAt,
      updatedAt: h.updatedAt,
      anggota: anggotaRows.filter((a) => a.aktivitasId === h.id),
      pembimbing: pembimbingRows.filter((p) => p.aktivitasId === h.id),
      konversi: konversiRows
        .filter((k) => k.aktivitasId === h.id)
        .map((k) => ({
          id: k.id,
          mataKuliahId: k.mataKuliahId,
          mataKuliahKode: k.kode,
          mataKuliahNama: k.nama,
          sksDiakui: k.sksDiakui,
        })),
      bimbinganTertaut: bimbinganRows.filter((b) => b.aktivitasId === h.id),
      riwayatStatus: statusLogRows
        .filter((s) => s.aktivitasId === h.id)
        .map((s) => ({
          id: s.id,
          dariStatus: (s.dariStatus as StatusAktivitas | null) ?? null,
          keStatus: s.keStatus as StatusAktivitas,
          alasan: s.alasan,
          olehNama: s.olehNama,
          createdAt: s.createdAt,
        })),
    }));
  }

  /**
   * Tarik rincian detail (anggota, pembimbing, rekognisi konversi) dari WS Neo Feeder
   * khusus untuk satu aktivitas MBKM yang sudah memiliki idPddikti.
   */
  static async syncFeederDetails(
    id: number,
    scopedProdiIds?: number[] | null,
  ): Promise<{ anggota: number; pembimbing: number; konversi: number }> {
    const detail = await AktivitasMbkmService.getById(id);
    if (scopedProdiIds && detail.programStudiId && !scopedProdiIds.includes(detail.programStudiId)) {
      throw new Error('Akses ditolak. Aktivitas berada di luar program studi yang diizinkan.');
    }
    if (!detail.idPddikti) {
      throw new Error('Aktivitas MBKM belum tertaut ke PDDIKTI (idPddikti kosong).');
    }
    const { FeederPullService } = await import('./feeder-pull.service');
    const { SystemParameterService } = await import('./system-parameter.service');
    const config = await SystemParameterService.getFeederConfig();
    return await FeederPullService.syncAktivitasDetails(config, detail.idPddikti, id);
  }
}

/** Helper: kondisi `aktivitas_mbkm_id IS NULL` agar tautan tidak menimpa baris yang sudah tertaut. */
function isNullAktivitas() {
  return sql`${bimbingan.aktivitasMbkmId} IS NULL`;
}
