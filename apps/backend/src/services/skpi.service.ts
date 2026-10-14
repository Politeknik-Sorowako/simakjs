import { and, asc, count, desc, eq, inArray, like, or } from 'drizzle-orm';
import { kategoriKegiatanSkpi, kegiatanMahasiswaSkpi, lampiranKegiatanSkpi, mahasiswa } from '../models/schema';
import { db } from '../utils/db';
import {
  removeLampiranFile,
  SKPI_LAMPIRAN_DIR,
  SKPI_LAMPIRAN_MAX_MB,
  saveLampiranFile,
} from '../utils/lampiran-storage';
import { SystemParameterService } from './system-parameter.service';

export interface CreateKegiatanSkpiDto {
  mahasiswaId: number;
  kategoriKegiatanId: number;
  namaKegiatan: string;
  penyelenggara?: string | null;
  tanggalMulai: string;
  tanggalSelesai?: string | null;
  lokasi?: string | null;
  deskripsi?: string | null;
  nomorSertifikat?: string | null;
  createdById: number;
}

export interface UpdateKegiatanSkpiDto {
  kategoriKegiatanId?: number;
  namaKegiatan?: string;
  penyelenggara?: string | null;
  tanggalMulai?: string;
  tanggalSelesai?: string | null;
  lokasi?: string | null;
  deskripsi?: string | null;
  nomorSertifikat?: string | null;
}

export interface VerifyKegiatanSkpiDto {
  action: 'approve' | 'reject';
  catatan?: string;
  poin?: number;
}

/** Scope filter daftar rekaman — divalidasi di controller sebelum masuk service. */
export interface KegiatanScopeFilter {
  /** Batasi hanya milik satu mahasiswa (kasus mahasiswa / query eksplisit). */
  mahasiswaId?: number;
  /** Batasi mahasiswa bimbingan PA ini (kasus Dosen PA). */
  dosenPaId?: number;
  /** Batasi prodi scope; null = tanpa batas (admin global), [] = tanpa akses. */
  prodiIds?: number[] | null;
}

const kegiatanWithRelations = {
  mahasiswa: {
    with: {
      programStudi: true,
      dosenPa: true,
    },
  },
  kategori: true,
  verifiedBy: {
    columns: { id: true, nama: true },
  },
  lampiran: true,
} as const;

export class SkpiService {
  // ─── Kategori ──────────────────────────────────────────────────────────────

  static async getKategoriAll(includeInactive = false) {
    return await db.query.kategoriKegiatanSkpi.findMany({
      where: includeInactive ? undefined : eq(kategoriKegiatanSkpi.isAktif, true),
      orderBy: [desc(kategoriKegiatanSkpi.isAktif), kategoriKegiatanSkpi.nama],
    });
  }

  static async createKategori(data: { nama: string; jenis: string; poinDefault?: number; isAktif?: boolean }) {
    const existing = await db.query.kategoriKegiatanSkpi.findFirst({
      where: eq(kategoriKegiatanSkpi.nama, data.nama),
    });
    if (existing) throw new Error('Nama kategori kegiatan sudah digunakan.');

    const [created] = await db
      .insert(kategoriKegiatanSkpi)
      .values({
        nama: data.nama,
        jenis: data.jenis,
        poinDefault: data.poinDefault ?? 0,
        isAktif: data.isAktif ?? true,
      })
      .returning();
    return created;
  }

  static async updateKategori(
    id: number,
    data: { nama?: string; jenis?: string; poinDefault?: number; isAktif?: boolean },
  ) {
    const kategori = await db.query.kategoriKegiatanSkpi.findFirst({ where: eq(kategoriKegiatanSkpi.id, id) });
    if (!kategori) throw new Error('Kategori kegiatan tidak ditemukan.');

    if (data.nama && data.nama !== kategori.nama) {
      const dup = await db.query.kategoriKegiatanSkpi.findFirst({ where: eq(kategoriKegiatanSkpi.nama, data.nama) });
      if (dup) throw new Error('Nama kategori kegiatan sudah digunakan.');
    }

    const [updated] = await db
      .update(kategoriKegiatanSkpi)
      .set({
        nama: data.nama ?? kategori.nama,
        jenis: data.jenis ?? kategori.jenis,
        poinDefault: data.poinDefault ?? kategori.poinDefault,
        isAktif: data.isAktif ?? kategori.isAktif,
        updatedAt: new Date(),
      })
      .where(eq(kategoriKegiatanSkpi.id, id))
      .returning();
    return updated;
  }

  static async deleteKategori(id: number) {
    const kategori = await db.query.kategoriKegiatanSkpi.findFirst({ where: eq(kategoriKegiatanSkpi.id, id) });
    if (!kategori) throw new Error('Kategori kegiatan tidak ditemukan.');

    const [{ count: used }] = await db
      .select({ count: count() })
      .from(kegiatanMahasiswaSkpi)
      .where(eq(kegiatanMahasiswaSkpi.kategoriKegiatanId, id));
    if (used > 0) {
      throw new Error(`Kategori masih dipakai oleh ${used} rekaman kegiatan dan tidak dapat dihapus.`);
    }

    const [deleted] = await db.delete(kategoriKegiatanSkpi).where(eq(kategoriKegiatanSkpi.id, id)).returning();
    return deleted;
  }

  // ─── Rekaman Kegiatan ──────────────────────────────────────────────────────

  static async create(data: CreateKegiatanSkpiDto) {
    if (data.tanggalSelesai && data.tanggalSelesai < data.tanggalMulai) {
      throw new Error('Tanggal selesai tidak boleh sebelum tanggal mulai.');
    }

    const kategori = await db.query.kategoriKegiatanSkpi.findFirst({
      where: eq(kategoriKegiatanSkpi.id, data.kategoriKegiatanId),
    });
    if (!kategori) throw new Error('Kategori kegiatan tidak ditemukan.');
    if (!kategori.isAktif) throw new Error('Kategori kegiatan sudah tidak aktif.');

    const mhs = await db.query.mahasiswa.findFirst({
      where: eq(mahasiswa.id, data.mahasiswaId),
      columns: { id: true },
    });
    if (!mhs) throw new Error('Mahasiswa tidak ditemukan.');

    const [created] = await db
      .insert(kegiatanMahasiswaSkpi)
      .values({
        mahasiswaId: data.mahasiswaId,
        kategoriKegiatanId: data.kategoriKegiatanId,
        namaKegiatan: data.namaKegiatan,
        penyelenggara: data.penyelenggara ?? null,
        tanggalMulai: data.tanggalMulai,
        tanggalSelesai: data.tanggalSelesai ?? null,
        lokasi: data.lokasi ?? null,
        deskripsi: data.deskripsi ?? null,
        nomorSertifikat: data.nomorSertifikat ?? null,
        poin: kategori.poinDefault,
        status: 'pending',
        createdById: data.createdById,
      })
      .returning();
    return created;
  }

  static async getAll(params: {
    page?: number;
    limit?: number;
    scope?: KegiatanScopeFilter;
    status?: string;
    kategoriId?: number;
    search?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    const scope = params.scope;
    if (scope?.prodiIds && scope.prodiIds.length === 0) {
      return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    const conditions = [];
    if (scope?.mahasiswaId) conditions.push(eq(kegiatanMahasiswaSkpi.mahasiswaId, scope.mahasiswaId));
    if (scope?.dosenPaId) {
      conditions.push(
        inArray(
          kegiatanMahasiswaSkpi.mahasiswaId,
          db.select({ id: mahasiswa.id }).from(mahasiswa).where(eq(mahasiswa.dosenPaId, scope.dosenPaId)),
        ),
      );
    }
    if (scope?.prodiIds) {
      conditions.push(
        inArray(
          kegiatanMahasiswaSkpi.mahasiswaId,
          db.select({ id: mahasiswa.id }).from(mahasiswa).where(inArray(mahasiswa.programStudiId, scope.prodiIds)),
        ),
      );
    }
    if (params.status) conditions.push(eq(kegiatanMahasiswaSkpi.status, params.status));
    if (params.kategoriId) conditions.push(eq(kegiatanMahasiswaSkpi.kategoriKegiatanId, params.kategoriId));
    if (params.search) {
      conditions.push(
        or(
          like(kegiatanMahasiswaSkpi.namaKegiatan, `%${params.search}%`),
          like(kegiatanMahasiswaSkpi.penyelenggara, `%${params.search}%`),
        )!,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await db.query.kegiatanMahasiswaSkpi.findMany({
      where,
      limit,
      offset,
      orderBy: [desc(kegiatanMahasiswaSkpi.tanggalMulai), desc(kegiatanMahasiswaSkpi.id)],
      with: kegiatanWithRelations,
    });

    const [{ total }] = await db.select({ total: count() }).from(kegiatanMahasiswaSkpi).where(where);

    const totalPages = Math.ceil(total / limit);
    return { data, meta: { total, page, limit, totalPages } };
  }

  static async getById(id: number) {
    return (
      (await db.query.kegiatanMahasiswaSkpi.findFirst({
        where: eq(kegiatanMahasiswaSkpi.id, id),
        with: kegiatanWithRelations,
      })) || null
    );
  }

  // ─── Dokumen SKPI (siap cetak) ─────────────────────────────────────────────

  /**
   * Kegiatan terverifikasi milik mahasiswa — satu-satunya sumber isi dokumen
   * SKPI. Urutan deterministik (tanggalMulai lalu id) agar snapshot hash stabil.
   */
  static async getKegiatanTerverifikasi(mhsId: number) {
    return await db.query.kegiatanMahasiswaSkpi.findMany({
      where: and(eq(kegiatanMahasiswaSkpi.mahasiswaId, mhsId), eq(kegiatanMahasiswaSkpi.status, 'diverifikasi')),
      orderBy: [asc(kegiatanMahasiswaSkpi.tanggalMulai), asc(kegiatanMahasiswaSkpi.id)],
      columns: {
        id: true,
        namaKegiatan: true,
        penyelenggara: true,
        tanggalMulai: true,
        tanggalSelesai: true,
        lokasi: true,
        poin: true,
      },
      with: { kategori: { columns: { nama: true, jenis: true } } },
    });
  }

  /** Syarat penerbitan SKPI: status akademik valid + minimum kegiatan terverifikasi. */
  static async getSyaratPenerbitan(mhsId: number, jumlahTerverifikasi: number) {
    const mhs = await db.query.mahasiswa.findFirst({
      where: eq(mahasiswa.id, mhsId),
      columns: { status: true },
    });
    if (!mhs) throw new Error('Mahasiswa tidak ditemukan.');

    const statusAkademikValid = ['aktif', 'cuti', 'lulus'].includes(mhs.status);
    const minKegiatan = Math.max(1, await SystemParameterService.getNumber('skpi_min_kegiatan'));
    const jumlahTerpenuhi = jumlahTerverifikasi >= minKegiatan;
    const terpenuhi = statusAkademikValid && jumlahTerpenuhi;
    const alasan = !statusAkademikValid
      ? 'Status akademik mahasiswa tidak memenuhi syarat penerbitan SKPI.'
      : !jumlahTerpenuhi
        ? `Minimal ${minKegiatan} kegiatan terverifikasi diperlukan untuk menerbitkan SKPI.`
        : null;
    return { statusAkademikValid, minKegiatan, jumlahTerverifikasi, terpenuhi, alasan };
  }

  /** Ringkasan siap cetak: identitas + kegiatan terverifikasi + syarat penerbitan. */
  static async getDokumen(mhsId: number) {
    const mhs = await db.query.mahasiswa.findFirst({
      where: eq(mahasiswa.id, mhsId),
      columns: { id: true, nim: true, nama: true, status: true, programStudiId: true },
      with: { programStudi: { columns: { nama: true, jenjang: true } } },
    });
    if (!mhs) throw new Error('Mahasiswa tidak ditemukan.');

    const kegiatan = await SkpiService.getKegiatanTerverifikasi(mhsId);
    const totalPoin = kegiatan.reduce((sum, k) => sum + (k.poin ?? 0), 0);
    const syarat = await SkpiService.getSyaratPenerbitan(mhsId, kegiatan.length);

    return {
      mahasiswa: {
        id: mhs.id,
        nim: mhs.nim,
        nama: mhs.nama,
        status: mhs.status,
        programStudiId: mhs.programStudiId,
        prodi: mhs.programStudi?.nama ?? null,
        jenjang: mhs.programStudi?.jenjang ?? null,
      },
      kegiatan,
      totalKegiatan: kegiatan.length,
      totalPoin,
      syarat,
    };
  }

  static async update(id: number, data: UpdateKegiatanSkpiDto) {
    const kegiatan = await this.getById(id);
    if (!kegiatan) throw new Error('Rekaman kegiatan tidak ditemukan.');
    if (kegiatan.status === 'diverifikasi') {
      throw new Error('Rekaman terverifikasi tidak dapat diedit. Hubungi admin untuk koreksi.');
    }

    if (data.tanggalMulai || data.tanggalSelesai !== undefined) {
      const mulai = data.tanggalMulai ?? kegiatan.tanggalMulai;
      const selesai = data.tanggalSelesai === undefined ? kegiatan.tanggalSelesai : data.tanggalSelesai;
      if (selesai && selesai < mulai) {
        throw new Error('Tanggal selesai tidak boleh sebelum tanggal mulai.');
      }
    }

    let poin = kegiatan.poin;
    let kategoriKegiatanId = kegiatan.kategoriKegiatanId;
    if (data.kategoriKegiatanId && data.kategoriKegiatanId !== kegiatan.kategoriKegiatanId) {
      const kategori = await db.query.kategoriKegiatanSkpi.findFirst({
        where: eq(kategoriKegiatanSkpi.id, data.kategoriKegiatanId),
      });
      if (!kategori) throw new Error('Kategori kegiatan tidak ditemukan.');
      if (!kategori.isAktif) throw new Error('Kategori kegiatan sudah tidak aktif.');
      kategoriKegiatanId = data.kategoriKegiatanId;
      poin = kategori.poinDefault;
    }

    // Edit pada rekaman ditolak = resubmit: kembali ke antrean verifikasi.
    const resubmit = kegiatan.status === 'ditolak';

    const [updated] = await db
      .update(kegiatanMahasiswaSkpi)
      .set({
        kategoriKegiatanId,
        namaKegiatan: data.namaKegiatan ?? kegiatan.namaKegiatan,
        penyelenggara: data.penyelenggara === undefined ? kegiatan.penyelenggara : data.penyelenggara,
        tanggalMulai: data.tanggalMulai ?? kegiatan.tanggalMulai,
        tanggalSelesai: data.tanggalSelesai === undefined ? kegiatan.tanggalSelesai : data.tanggalSelesai,
        lokasi: data.lokasi === undefined ? kegiatan.lokasi : data.lokasi,
        deskripsi: data.deskripsi === undefined ? kegiatan.deskripsi : data.deskripsi,
        nomorSertifikat: data.nomorSertifikat === undefined ? kegiatan.nomorSertifikat : data.nomorSertifikat,
        poin,
        status: resubmit ? 'pending' : kegiatan.status,
        catatanVerifikator: resubmit ? null : kegiatan.catatanVerifikator,
        updatedAt: new Date(),
      })
      .where(eq(kegiatanMahasiswaSkpi.id, id))
      .returning();
    return updated;
  }

  static async delete(id: number, opts: { ownerMahasiswaId?: number; isAdmin?: boolean }) {
    const kegiatan = await this.getById(id);
    if (!kegiatan) throw new Error('Rekaman kegiatan tidak ditemukan.');

    if (!opts.isAdmin) {
      if (kegiatan.mahasiswaId !== opts.ownerMahasiswaId) {
        throw new Error('Anda tidak memiliki akses untuk menghapus rekaman ini.');
      }
      if (kegiatan.status === 'diverifikasi') {
        throw new Error('Rekaman terverifikasi tidak dapat dihapus.');
      }
    }

    const lampiranRows = await db.select().from(lampiranKegiatanSkpi).where(eq(lampiranKegiatanSkpi.kegiatanId, id));

    const [deleted] = await db.delete(kegiatanMahasiswaSkpi).where(eq(kegiatanMahasiswaSkpi.id, id)).returning();

    for (const row of lampiranRows) {
      await removeLampiranFile(row.storageKey, SKPI_LAMPIRAN_DIR);
    }

    return deleted;
  }

  /**
   * State machine verifikasi: pending → diverifikasi | ditolak.
   * Otorisasi (Dosen PA / staf scope) divalidasi di controller.
   */
  static async verify(id: number, verifierUserId: number, payload: VerifyKegiatanSkpiDto) {
    const kegiatan = await this.getById(id);
    if (!kegiatan) throw new Error('Rekaman kegiatan tidak ditemukan.');
    if (kegiatan.status !== 'pending') {
      throw new Error('Hanya rekaman berstatus PENDING yang dapat diverifikasi.');
    }

    if (payload.action === 'reject') {
      if (!payload.catatan?.trim()) {
        throw new Error('Catatan verifikasi wajib diisi saat menolak rekaman.');
      }
      const [updated] = await db
        .update(kegiatanMahasiswaSkpi)
        .set({
          status: 'ditolak',
          catatanVerifikator: payload.catatan.trim(),
          updatedAt: new Date(),
        })
        .where(eq(kegiatanMahasiswaSkpi.id, id))
        .returning();
      return updated;
    }

    const [updated] = await db
      .update(kegiatanMahasiswaSkpi)
      .set({
        status: 'diverifikasi',
        catatanVerifikator: payload.catatan?.trim() || null,
        poin: payload.poin ?? kegiatan.poin,
        verifiedById: verifierUserId,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(kegiatanMahasiswaSkpi.id, id))
      .returning();
    return updated;
  }

  // ─── Lampiran Sertifikat ───────────────────────────────────────────────────

  static async listLampiran(kegiatanId: number) {
    return await db.query.lampiranKegiatanSkpi.findMany({
      where: eq(lampiranKegiatanSkpi.kegiatanId, kegiatanId),
      orderBy: [desc(lampiranKegiatanSkpi.createdAt)],
    });
  }

  static async getLampiran(kegiatanId: number, lampiranId: number) {
    return (
      (await db.query.lampiranKegiatanSkpi.findFirst({
        where: and(eq(lampiranKegiatanSkpi.kegiatanId, kegiatanId), eq(lampiranKegiatanSkpi.id, lampiranId)),
      })) ?? null
    );
  }

  /** Maksimal 1 lampiran per kegiatan — lampiran lama diganti. */
  static async addLampiran(kegiatanId: number, file: File, keterangan: string | undefined, userId: number) {
    const kegiatan = await this.getById(kegiatanId);
    if (!kegiatan) throw new Error('Rekaman kegiatan tidak ditemukan.');
    if (kegiatan.status === 'diverifikasi') {
      throw new Error('Rekaman terverifikasi tidak boleh diubah lampirannya.');
    }

    // Simpan & validasi file baru lebih dulu, agar lampiran lama tidak hilang
    // bila file baru ternyata tidak valid (tipe/ukuran/magic bytes).
    const storageKey = await saveLampiranFile(file, `skpi-${kegiatanId}`, {
      dir: SKPI_LAMPIRAN_DIR,
      maxMb: SKPI_LAMPIRAN_MAX_MB,
    });

    try {
      const existing = await db
        .select()
        .from(lampiranKegiatanSkpi)
        .where(eq(lampiranKegiatanSkpi.kegiatanId, kegiatanId));
      for (const row of existing) {
        await db.delete(lampiranKegiatanSkpi).where(eq(lampiranKegiatanSkpi.id, row.id));
        await removeLampiranFile(row.storageKey, SKPI_LAMPIRAN_DIR);
      }

      const [row] = await db
        .insert(lampiranKegiatanSkpi)
        .values({
          kegiatanId,
          fileName: file.name,
          storageKey,
          mimeType: file.type || 'application/octet-stream',
          fileSize: file.size,
          keterangan: keterangan ?? null,
          uploadedById: userId,
        })
        .returning();
      return row;
    } catch (e: unknown) {
      // Bersihkan file baru bila penggantian gagal agar tidak jadi orphan.
      await removeLampiranFile(storageKey, SKPI_LAMPIRAN_DIR);
      throw e;
    }
  }

  static async removeLampiran(kegiatanId: number, lampiranId: number) {
    const kegiatan = await this.getById(kegiatanId);
    if (!kegiatan) throw new Error('Rekaman kegiatan tidak ditemukan.');
    if (kegiatan.status === 'diverifikasi') {
      throw new Error('Rekaman terverifikasi tidak boleh diubah lampirannya.');
    }

    const row = await this.getLampiran(kegiatanId, lampiranId);
    if (!row) throw new Error('Lampiran tidak ditemukan.');

    await removeLampiranFile(row.storageKey, SKPI_LAMPIRAN_DIR);
    const [deleted] = await db.delete(lampiranKegiatanSkpi).where(eq(lampiranKegiatanSkpi.id, lampiranId)).returning();
    return deleted;
  }
}
