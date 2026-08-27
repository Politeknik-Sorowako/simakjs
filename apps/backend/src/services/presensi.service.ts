import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { and, count, desc, eq, ilike, inArray, isNotNull, ne, or, type SQL, sql } from 'drizzle-orm';
import {
  bap,
  bapPraktikum,
  dosen,
  dosenPengajarKelas,
  kelasKuliah,
  kelompokApel,
  kelompokApelAnggota,
  ketidakhadiranMahasiswa,
  kompensasiBayar,
  kompensasiManual,
  mahasiswa,
  mataKuliah,
  presensi,
  presensiApel,
  presensiPraktikum,
  programStudi,
  sesiApel,
  users,
} from '../models/schema';
import { db } from '../utils/db';
import { hasRole } from '../utils/role';
import type { UserPayload } from '../utils/types';
import { SystemParameterService } from './system-parameter.service';

const SURAT_UPLOAD_DIR = 'uploads/surat-izin-sakit';
const ALLOWED_SURAT_EXT = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp']);

export function getSuratUploadDir(): string {
  return process.env.SURAT_UPLOAD_DIR || SURAT_UPLOAD_DIR;
}

export class PresensiService {
  static async getMahasiswaByEmail(email: string) {
    const [mhs] = await db.select().from(mahasiswa).where(eq(mahasiswa.email, email)).limit(1);
    return mhs || null;
  }

  static async uploadSuratIzin(input: {
    presensiId: number;
    mahasiswaId: number;
    jenis: 'sakit' | 'izin';
    keterangan?: string | null;
    file: File;
  }) {
    const { presensiId, mahasiswaId, jenis, keterangan, file } = input;

    const [row] = await db.select().from(presensi).where(eq(presensi.id, presensiId));
    if (!row) throw new Error('Data presensi tidak ditemukan');
    if (row.mahasiswaId !== mahasiswaId) {
      throw new Error('Akses ditolak. Anda hanya dapat mengunggah surat untuk presensi Anda sendiri.');
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_SURAT_EXT.has(ext)) {
      throw new Error('Format berkas tidak didukung. Gunakan PDF, JPG, JPEG, PNG, atau WebP.');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Ukuran berkas maksimal 5MB');
    }

    await mkdir(getSuratUploadDir(), { recursive: true });
    const now = new Date();
    const timestamp =
      `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}` +
      `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const filename = `surat_${jenis}_m${mahasiswaId}_p${presensiId}_${timestamp}.${ext}`;
    const fullPath = join(getSuratUploadDir(), filename);
    await Bun.write(fullPath, file);

    const [updated] = await db
      .update(presensi)
      .set({
        lampiranEvidens: filename,
        keterangan: keterangan || row.keterangan,
      })
      .where(eq(presensi.id, presensiId))
      .returning();
    return updated || null;
  }

  static async getMahasiswaPresensiList(mahasiswaId: number, periodeId?: string) {
    const conditions: SQL<unknown>[] = [eq(presensi.mahasiswaId, mahasiswaId)];
    if (periodeId) conditions.push(eq(kelasKuliah.periodeId, periodeId));
    const whereClause = and(...conditions);

    const rows = await db
      .select({
        id: presensi.id,
        bapId: presensi.bapId,
        mahasiswaId: presensi.mahasiswaId,
        status: presensi.status,
        durasiMangkir: presensi.durasiMangkir,
        keterangan: presensi.keterangan,
        lampiranEvidens: presensi.lampiranEvidens,
        keteranganAdmin: presensi.keteranganAdmin,
        resolvedAt: presensi.resolvedAt,
        resolvedByName: users.nama,
        isVerified: ketidakhadiranMahasiswa.isVerified,
        createdAt: presensi.createdAt,
        bapTanggal: bap.tanggal,
        bapPertemuan: bap.pertemuanKe,
        bapMateri: bap.materi,
        kelasKuliahId: kelasKuliah.id,
        namaKelas: kelasKuliah.namaKelas,
        periodeId: kelasKuliah.periodeId,
        mataKuliahKode: mataKuliah.kode,
        mataKuliahNama: mataKuliah.nama,
        dosenNama: dosen.nama,
      })
      .from(presensi)
      .innerJoin(mahasiswa, eq(presensi.mahasiswaId, mahasiswa.id))
      .innerJoin(bap, eq(presensi.bapId, bap.id))
      .leftJoin(kelasKuliah, eq(bap.kelasKuliahId, kelasKuliah.id))
      .leftJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
      .leftJoin(dosen, eq(bap.dosenId, dosen.id))
      .leftJoin(users, eq(presensi.resolvedBy, users.id))
      .leftJoin(
        ketidakhadiranMahasiswa,
        and(eq(ketidakhadiranMahasiswa.sumber, 'BAP'), eq(ketidakhadiranMahasiswa.sumberId, presensi.id)),
      )
      .where(whereClause)
      .orderBy(bap.tanggal, bap.pertemuanKe);

    return rows;
  }

  static async canAccessLampiran(user: UserPayload, filename: string): Promise<boolean> {
    if (hasRole(user, ['admin', 'super_admin', 'prodi'])) return true;
    if (hasRole(user, ['mahasiswa'])) {
      const mhs = await this.getMahasiswaByEmail(user.email);
      if (!mhs) return false;
      const rows = await db
        .select({ id: presensi.id })
        .from(presensi)
        .where(and(eq(presensi.mahasiswaId, mhs.id), eq(presensi.lampiranEvidens, filename)))
        .limit(1);
      return rows.length > 0;
    }
    return false;
  }
  static async saveBulkPresensi(
    bapId: number,
    presensiList: Array<{ mahasiswaId: number; status: string; durasiMangkir?: number; keterangan?: string | null }>,
    adminUserId?: number,
  ) {
    const [foundBap] = await db.select().from(bap).where(eq(bap.id, bapId));
    if (!foundBap) {
      throw new Error('BAP tidak ditemukan');
    }

    // Track previously-unknown records so resolved entries remain visible for audit.
    let previousUnknownIds = new Set<number>();
    if (adminUserId) {
      const previousUnknown = await db
        .select({ mahasiswaId: presensi.mahasiswaId })
        .from(presensi)
        .where(and(eq(presensi.bapId, bapId), eq(presensi.status, 'unknown')));
      previousUnknownIds = new Set(previousUnknown.map((r) => r.mahasiswaId));
    }

    const itemsToInsert = presensiList.map((item) => {
      let durMangkir = item.durasiMangkir || 0;
      const status = item.status;

      if (status === 'alpa' || status === 'sakit' || status === 'izin' || status === 'unknown') {
        durMangkir = foundBap.durasiMenit;
      } else if (status === 'telat' || status === 'terlambat') {
        durMangkir = Math.min(item.durasiMangkir || 0, foundBap.durasiMenit);
      } else if (status === 'hadir') {
        durMangkir = 0;
      }

      const wasUnknown = adminUserId ? previousUnknownIds.has(item.mahasiswaId) && status !== 'unknown' : false;

      return {
        bapId,
        mahasiswaId: item.mahasiswaId,
        status: status as 'hadir' | 'sakit' | 'izin' | 'telat' | 'alpa' | 'terlambat' | 'unknown',
        durasiMangkir: durMangkir,
        keterangan: item.keterangan || null,
        resolvedBy: wasUnknown ? adminUserId : null,
        resolvedAt: wasUnknown ? new Date() : null,
      };
    });

    await db.transaction(async (tx) => {
      await tx.delete(presensi).where(eq(presensi.bapId, bapId));
      let inserted: Array<{ id: number; mahasiswaId: number; status: string; durasiMangkir: number }> = [];
      if (itemsToInsert.length > 0) {
        inserted = await tx.insert(presensi).values(itemsToInsert).returning({
          id: presensi.id,
          mahasiswaId: presensi.mahasiswaId,
          status: presensi.status,
          durasiMangkir: presensi.durasiMangkir,
        });
      }

      // Sinkron ke tabel terpusat ketidakhadiran (single source of truth).
      const absentRows = inserted.filter((row) => row.status !== 'hadir');
      if (absentRows.length > 0) {
        const ketidakhadiranRows = absentRows.map((row) => ({
          mahasiswaId: row.mahasiswaId,
          tanggal: foundBap.tanggal,
          sumber: 'BAP' as const,
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

    return { message: 'Presensi berhasil disimpan' };
  }

  static async getPresensiByBap(bapId: number) {
    const rows = await db
      .select({
        id: presensi.id,
        mahasiswaId: presensi.mahasiswaId,
        mahasiswaNim: mahasiswa.nim,
        mahasiswaNama: mahasiswa.nama,
        status: presensi.status,
        durasiMangkir: presensi.durasiMangkir,
        keterangan: presensi.keterangan,
        lampiranEvidens: presensi.lampiranEvidens,
        keteranganAdmin: presensi.keteranganAdmin,
        resolvedAt: presensi.resolvedAt,
        isVerified: ketidakhadiranMahasiswa.isVerified,
        verifiedAt: ketidakhadiranMahasiswa.verifiedAt,
        verifiedByName: users.nama,
      })
      .from(presensi)
      .innerJoin(mahasiswa, eq(presensi.mahasiswaId, mahasiswa.id))
      .leftJoin(
        ketidakhadiranMahasiswa,
        and(eq(ketidakhadiranMahasiswa.sumber, 'BAP'), eq(ketidakhadiranMahasiswa.sumberId, presensi.id)),
      )
      .leftJoin(users, eq(ketidakhadiranMahasiswa.verifiedBy, users.id))
      .where(eq(presensi.bapId, bapId));
    return rows;
  }

  // --- ADMIN/PRODI RESOLUTION OF UNKNOWN STATUS ---
  static async getUnknownPresensi(
    page = 1,
    limit = 20,
    search?: string,
    prodiIds?: number[],
    statusFilter?: 'belum' | 'sudah',
  ) {
    let baseCondition: SQL<unknown>;
    if (statusFilter === 'belum') {
      baseCondition = eq(presensi.status, 'unknown');
    } else if (statusFilter === 'sudah') {
      baseCondition = isNotNull(presensi.resolvedAt);
    } else {
      baseCondition = or(eq(presensi.status, 'unknown'), isNotNull(presensi.resolvedAt))!;
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
      .from(presensi)
      .innerJoin(mahasiswa, eq(presensi.mahasiswaId, mahasiswa.id))
      .where(whereClause);

    const total = totalResult?.total || 0;

    const rows = await db
      .select({
        id: presensi.id,
        bapId: presensi.bapId,
        mahasiswaId: presensi.mahasiswaId,
        nim: mahasiswa.nim,
        nama: mahasiswa.nama,
        programStudiId: mahasiswa.programStudiId,
        prodiNama: programStudi.nama,
        status: presensi.status,
        durasiMangkir: presensi.durasiMangkir,
        keterangan: presensi.keterangan,
        lampiranEvidens: presensi.lampiranEvidens,
        keteranganAdmin: presensi.keteranganAdmin,
        resolvedAt: presensi.resolvedAt,
        resolvedBy: presensi.resolvedBy,
        resolvedByName: users.nama,
        createdAt: presensi.createdAt,
        bapTanggal: bap.tanggal,
        bapPertemuan: bap.pertemuanKe,
        bapMateri: bap.materi,
        kelasKuliahId: kelasKuliah.id,
        namaKelas: kelasKuliah.namaKelas,
        periodeId: kelasKuliah.periodeId,
        mataKuliahKode: mataKuliah.kode,
        mataKuliahNama: mataKuliah.nama,
        dosenNama: dosen.nama,
      })
      .from(presensi)
      .innerJoin(mahasiswa, eq(presensi.mahasiswaId, mahasiswa.id))
      .innerJoin(bap, eq(presensi.bapId, bap.id))
      .leftJoin(kelasKuliah, eq(bap.kelasKuliahId, kelasKuliah.id))
      .leftJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
      .leftJoin(dosen, eq(bap.dosenId, dosen.id))
      .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id))
      .leftJoin(users, eq(presensi.resolvedBy, users.id))
      .where(whereClause)
      .limit(limit)
      .offset((page - 1) * limit)
      .orderBy(bap.tanggal);

    const totalPages = Math.ceil(total / limit);
    return { data: rows, meta: { total, page, limit, totalPages } };
  }

  static async resolveUnknownPresensi(
    presensiId: number,
    newStatus: 'sakit' | 'izin' | 'alpa',
    adminUserId: number,
    keteranganAdmin?: string,
    lampiranEvidens?: string,
    isAnulir?: boolean,
  ) {
    const [row] = await db.select().from(presensi).where(eq(presensi.id, presensiId));
    if (!row) {
      throw new Error('Data presensi tidak ditemukan');
    }
    if (!isAnulir && !['sakit', 'izin', 'alpa'].includes(newStatus)) {
      throw new Error('Status tujuan tidak valid; harus salah satu dari sakit, izin, atau alpa');
    }
    if (isAnulir && !keteranganAdmin?.trim()) {
      throw new Error('Keterangan wajib diisi saat menganulir presensi.');
    }

    const [bapRow] = await db.select().from(bap).where(eq(bap.id, row.bapId));
    let durasiMangkir = row.durasiMangkir;
    if (bapRow && !isAnulir) {
      durasiMangkir = bapRow.durasiMenit;
    }
    if (isAnulir) {
      durasiMangkir = 0;
    }

    const [updated] = await db
      .update(presensi)
      .set({
        status: isAnulir ? 'hadir' : newStatus,
        durasiMangkir,
        keteranganAdmin: keteranganAdmin || null,
        lampiranEvidens: lampiranEvidens || null,
        resolvedBy: adminUserId,
        resolvedAt: new Date(),
      })
      .where(eq(presensi.id, presensiId))
      .returning();
    return updated || null;
  }

  static async calculateKompensasiMinutes(status: string, durasiMangkir: number): Promise<number> {
    switch (status) {
      case 'alpa':
      case 'telat':
      case 'terlambat': {
        const pengali = await SystemParameterService.getNumber('PENGALI_DENDA_MANGKIR');
        return durasiMangkir * pengali;
      }
      case 'sakit':
      case 'izin': {
        const pengali = await SystemParameterService.getNumber('PENGALI_DENDA_IZIN_SAKIT');
        return durasiMangkir * pengali;
      }
      case 'hadir':
      case 'unknown': // Belum dikonfirmasi admin, jangan hitung kompensasi
      default:
        return 0;
    }
  }

  static async getKompensasiDetail(mahasiswaId: number) {
    const [mhs] = await db
      .select({
        id: mahasiswa.id,
        nim: mahasiswa.nim,
        nama: mahasiswa.nama,
        email: mahasiswa.email,
        programStudiId: mahasiswa.programStudiId,
      })
      .from(mahasiswa)
      .where(eq(mahasiswa.id, mahasiswaId));

    if (!mhs) {
      throw new Error('Mahasiswa tidak ditemukan');
    }

    const allPresensi = await db
      .select({
        id: ketidakhadiranMahasiswa.id,
        bapId: sql<number>`NULL`,
        status: sql<string>`LOWER(${ketidakhadiranMahasiswa.status}::text)`,
        durasiMangkir: ketidakhadiranMahasiswa.durasiMenit,
        keteranganAdmin: ketidakhadiranMahasiswa.keterangan,
        resolvedBy: ketidakhadiranMahasiswa.verifiedBy,
        resolvedAt: ketidakhadiranMahasiswa.verifiedAt,
        createdAt: ketidakhadiranMahasiswa.createdAt,
        bapPertemuan: sql<number | null>`CASE
          WHEN ${ketidakhadiranMahasiswa.sumber} = 'BAP' THEN ${bap.pertemuanKe}
          WHEN ${ketidakhadiranMahasiswa.sumber} = 'PRAKTIKUM' THEN ${bapPraktikum.sesiKe}
          ELSE NULL END`,
        bapMateri: sql<string | null>`CASE
          WHEN ${ketidakhadiranMahasiswa.sumber} = 'MANUAL' THEN 'Kompensasi Manual'
          WHEN ${ketidakhadiranMahasiswa.sumber} = 'APEL' THEN 'Presensi Apel'
          WHEN ${ketidakhadiranMahasiswa.sumber} = 'BAP' THEN ${bap.materi}
          WHEN ${ketidakhadiranMahasiswa.sumber} = 'PRAKTIKUM' THEN ${bapPraktikum.materi}
          ELSE NULL END`,
        bapTanggal: ketidakhadiranMahasiswa.tanggal,
        sumber: sql<
          'perkuliahan' | 'apel' | 'manual'
        >`CASE WHEN ${ketidakhadiranMahasiswa.sumber} = 'BAP' THEN 'perkuliahan' WHEN ${ketidakhadiranMahasiswa.sumber} = 'APEL' THEN 'apel' ELSE 'manual' END`,
      })
      .from(ketidakhadiranMahasiswa)
      .leftJoin(
        presensi,
        and(eq(ketidakhadiranMahasiswa.sumberId, presensi.id), eq(ketidakhadiranMahasiswa.sumber, 'BAP')),
      )
      .leftJoin(bap, eq(presensi.bapId, bap.id))
      .leftJoin(
        presensiApel,
        and(eq(ketidakhadiranMahasiswa.sumberId, presensiApel.id), eq(ketidakhadiranMahasiswa.sumber, 'APEL')),
      )
      .leftJoin(sesiApel, eq(presensiApel.sesiApelId, sesiApel.id))
      .leftJoin(
        presensiPraktikum,
        and(
          eq(ketidakhadiranMahasiswa.sumberId, presensiPraktikum.id),
          eq(ketidakhadiranMahasiswa.sumber, 'PRAKTIKUM'),
        ),
      )
      .leftJoin(bapPraktikum, eq(presensiPraktikum.bapPraktikumId, bapPraktikum.id))
      .where(
        and(
          eq(ketidakhadiranMahasiswa.mahasiswaId, mahasiswaId),
          ne(ketidakhadiranMahasiswa.status, 'UNKNOWN'),
          eq(ketidakhadiranMahasiswa.isVerified, true),
        ),
      )
      .orderBy(desc(ketidakhadiranMahasiswa.tanggal), desc(ketidakhadiranMahasiswa.id));

    const pengaliMangkir = await SystemParameterService.getNumber('PENGALI_DENDA_MANGKIR');
    const pengaliIzinSakit = await SystemParameterService.getNumber('PENGALI_DENDA_IZIN_SAKIT');
    const maksHarian = await SystemParameterService.getNumber('DURASI_HARIAN_MENIT');

    // Raw minutes per item (BEFORE multiplier), split by multiplier class to mirror the
    // daily DURASI_HARIAN_MENIT (480) cap applied in getLaporanKompensasi.
    const rawByDay = new Map<string, { mangkir: number; ringan: number }>();
    const rawPerItem = allPresensi.map((p) => {
      let rawMangkir = 0;
      let rawRingan = 0;
      if (p.sumber === 'manual') {
        // RUSAK tidak masuk kelas mangkir: poin dihitung terpisah (= durasi) tanpa
        // pengali dan tanpa proporsional scaling harian.
        if (['alpa', 'terlambat'].includes(p.status)) {
          rawMangkir = p.durasiMangkir;
        } else if (['sakit', 'izin'].includes(p.status)) {
          rawRingan = p.durasiMangkir;
        }
      } else {
        const effectiveStatus = p.status;
        if (['alpa', 'telat', 'terlambat'].includes(effectiveStatus)) {
          rawMangkir = p.durasiMangkir;
        } else if (['sakit', 'izin'].includes(effectiveStatus)) {
          rawRingan = p.durasiMangkir;
        }
      }
      const dayKey = String(p.bapTanggal);
      const day = rawByDay.get(dayKey) || { mangkir: 0, ringan: 0 };
      day.mangkir += rawMangkir;
      day.ringan += rawRingan;
      rawByDay.set(dayKey, day);
      return { ...p, rawMangkir, rawRingan, dayKey };
    });

    // Per-day proportional scale factor matching the report's cap math.
    const dayScale = new Map<string, number>();
    for (const [dayKey, day] of rawByDay) {
      const totalRaw = day.mangkir + day.ringan;
      dayScale.set(dayKey, totalRaw > maksHarian ? maksHarian / totalRaw : 1);
    }

    const mapped = rawPerItem.map((p) => {
      const factor = dayScale.get(p.dayKey) || 1;
      let poinKompensasi: number;
      if (p.sumber === 'manual' && p.status === 'rusak') {
        // Poin RUSAK = durasi mentah (tanpa pengali & tanpa proporsional cap).
        poinKompensasi = p.durasiMangkir;
      } else {
        poinKompensasi = (p.rawMangkir * pengaliMangkir + p.rawRingan * pengaliIzinSakit) * factor;
      }
      const { rawMangkir: _rm, rawRingan: _rr, dayKey: _dk, ...rest } = p;
      return { ...rest, poinKompensasi };
    });
    const historyKompensasi = mapped.filter((p) => p.poinKompensasi > 0);

    const totalKompensasi = historyKompensasi.reduce((sum, item) => sum + item.poinKompensasi, 0);

    const payments = await db
      .select()
      .from(kompensasiBayar)
      .where(eq(kompensasiBayar.mahasiswaId, mahasiswaId))
      .orderBy(desc(kompensasiBayar.tanggal), desc(kompensasiBayar.id));

    const totalDibayar = payments.reduce((sum, p) => sum + p.jumlahMenit, 0);
    const sisaKompensasi = Math.max(0, totalKompensasi - totalDibayar);

    return {
      mahasiswa: mhs,
      historyKompensasi,
      payments,
      summary: {
        totalKompensasi,
        totalDibayar,
        sisaKompensasi,
      },
    };
  }

  static async getLaporanKompensasi(
    page = 1,
    limit = 20,
    search?: string,
    prodiId?: number,
    sortBy = 'sisa',
    sortOrder = 'desc',
    statusLunas?: string,
    exportAll = false,
  ) {
    const offset = (page - 1) * limit;
    const pengaliMangkir = await SystemParameterService.getNumber('PENGALI_DENDA_MANGKIR');
    const pengaliIzinSakit = await SystemParameterService.getNumber('PENGALI_DENDA_IZIN_SAKIT');
    const maksHarian = await SystemParameterService.getNumber('DURASI_HARIAN_MENIT');

    // Raw minutes per student per day (BEFORE multiplier), split by multiplier class.
    // - rawMangkir  : ALPA/TERLAMBAT -> multiplied by PENGALI_DENDA_MANGKIR
    // - rawRingan   : SAKIT/IZIN      -> multiplied by PENGALI_DENDA_IZIN_SAKIT
    // RUSAK (manual, kerusakan fasilitas) dihitung terpisah: poin = durasi, tanpa cap.
    // Single source of truth: tabel terpusat ketidakhadiran (hanya yang sudah terverifikasi).
    const sourceRawSubquery = db.$with('source_raw').as(
      db
        .select({
          mahasiswaId: ketidakhadiranMahasiswa.mahasiswaId,
          tanggal: ketidakhadiranMahasiswa.tanggal,
          rawMangkir: sql<number>`CASE WHEN status IN ('ALPA', 'TERLAMBAT') THEN durasi_menit ELSE 0 END`.as(
            'raw_mangkir',
          ),
          rawRingan: sql<number>`CASE WHEN status IN ('SAKIT', 'IZIN') THEN durasi_menit ELSE 0 END`.as('raw_ringan'),
        })
        .from(ketidakhadiranMahasiswa)
        .where(sql`is_verified = true`),
    );

    // Aggregate per student per day (raw minutes before multiplier, split by class).
    const dailyRawSubquery = db.$with('daily_raw').as(
      db
        .select({
          mahasiswaId: sourceRawSubquery.mahasiswaId,
          rawMangkir: sql<number>`SUM(raw_mangkir)`.as('raw_mangkir'),
          rawRingan: sql<number>`SUM(raw_ringan)`.as('raw_ringan'),
        })
        .from(sourceRawSubquery)
        .groupBy(sourceRawSubquery.mahasiswaId, sourceRawSubquery.tanggal),
    );

    // Cap combined raw at DURASI_HARIAN_MENIT (480) per day, then apply multipliers.
    const presensiAggSubquery = db.$with('presensi_mangkir').as(
      db
        .select({
          mahasiswaId: dailyRawSubquery.mahasiswaId,
          poin: sql<number>`SUM(CASE
              WHEN (raw_mangkir + raw_ringan) <= ${maksHarian}
                THEN raw_mangkir * ${pengaliMangkir} + raw_ringan * ${pengaliIzinSakit}
                ELSE (raw_mangkir * ${pengaliMangkir} + raw_ringan * ${pengaliIzinSakit}) * (${maksHarian}::numeric / NULLIF(raw_mangkir + raw_ringan, 0))
              END)`.as('poin'),
        })
        .from(dailyRawSubquery)
        .groupBy(dailyRawSubquery.mahasiswaId),
    );

    // Poin RUSAK (kerusakan fasilitas, sumber MANUAL) = durasi mentah, tanpa pengali
    // dan tanpa proporsional cap harian.
    const rusakPoinSubquery = db.$with('rusak_poin').as(
      db
        .select({
          mahasiswaId: ketidakhadiranMahasiswa.mahasiswaId,
          poinRusak: sql<number>`SUM(durasi_menit)`.as('poin_rusak'),
        })
        .from(ketidakhadiranMahasiswa)
        .where(sql`is_verified = true AND sumber = 'MANUAL' AND status = 'RUSAK'`)
        .groupBy(ketidakhadiranMahasiswa.mahasiswaId),
    );

    const bayarAggSubquery = db.$with('bayar_mangkir').as(
      db
        .select({
          mahasiswaId: kompensasiBayar.mahasiswaId,
          totalDibayar: sql<number>`COALESCE(SUM(${kompensasiBayar.jumlahMenit}), 0)`.as('total_dibayar'),
        })
        .from(kompensasiBayar)
        .groupBy(kompensasiBayar.mahasiswaId),
    );

    const totalKompensasiSql = sql<number>`COALESCE(presensi_mangkir.poin, 0) + COALESCE(rusak_poin.poin_rusak, 0)`;
    const totalDibayarSql = sql<number>`COALESCE(bayar_mangkir.total_dibayar, 0)`;
    const sisaKompensasiSql = sql<number>`GREATEST(0, COALESCE(presensi_mangkir.poin, 0) + COALESCE(rusak_poin.poin_rusak, 0) - COALESCE(bayar_mangkir.total_dibayar, 0))`;

    const conditions: SQL<unknown>[] = [sql`${totalKompensasiSql} > 0`];
    if (search) {
      const orCondition = or(ilike(mahasiswa.nama, `%${search}%`), ilike(mahasiswa.nim, `%${search}%`));
      if (orCondition) conditions.push(orCondition);
    }
    if (prodiId) {
      conditions.push(eq(mahasiswa.programStudiId, prodiId));
    }
    if (statusLunas === 'belum_lunas') {
      conditions.push(sql`${sisaKompensasiSql} > 0`);
    } else if (statusLunas === 'lunas') {
      conditions.push(sql`${sisaKompensasiSql} <= 0`);
    }
    const whereClause = and(...conditions);

    let orderClause = sql`${sisaKompensasiSql} DESC`;
    if (sortBy === 'total') {
      orderClause = sortOrder === 'asc' ? sql`${totalKompensasiSql} ASC` : sql`${totalKompensasiSql} DESC`;
    } else if (sortBy === 'nama') {
      orderClause = sortOrder === 'desc' ? sql`${mahasiswa.nama} DESC` : sql`${mahasiswa.nama} ASC`;
    } else if (sortBy === 'nim') {
      orderClause = sortOrder === 'desc' ? sql`${mahasiswa.nim} DESC` : sql`${mahasiswa.nim} ASC`;
    } else if (sortBy === 'sisa') {
      orderClause = sortOrder === 'asc' ? sql`${sisaKompensasiSql} ASC` : sql`${sisaKompensasiSql} DESC`;
    }

    const baseQuery = db
      .with(sourceRawSubquery, dailyRawSubquery, presensiAggSubquery, rusakPoinSubquery, bayarAggSubquery)
      .select({
        id: mahasiswa.id,
        nim: mahasiswa.nim,
        nama: mahasiswa.nama,
        prodiNama: sql<string>`${programStudi.nama}`.as('nama_prodi'),
        totalKompensasi: totalKompensasiSql.as('total_kompensasi'),
        totalDibayar: totalDibayarSql.as('total_dibayar'),
        sisaKompensasi: sisaKompensasiSql.as('sisa_kompensasi'),
      })
      .from(mahasiswa)
      .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id))
      .leftJoin(presensiAggSubquery, eq(sql`presensi_mangkir.mahasiswa_id`, mahasiswa.id))
      .leftJoin(rusakPoinSubquery, eq(sql`rusak_poin.mahasiswa_id`, mahasiswa.id))
      .leftJoin(bayarAggSubquery, eq(sql`bayar_mangkir.mahasiswa_id`, mahasiswa.id))
      .where(whereClause)
      .orderBy(orderClause);

    let listMahasiswa: Awaited<typeof baseQuery>;
    let total = 0;
    try {
      listMahasiswa = exportAll ? await baseQuery : await baseQuery.limit(limit).offset(offset);

      const [totalResult] = await db
        .with(sourceRawSubquery, dailyRawSubquery, presensiAggSubquery, rusakPoinSubquery, bayarAggSubquery)
        .select({ total: sql<number>`count(*)` })
        .from(mahasiswa)
        .leftJoin(presensiAggSubquery, eq(sql`presensi_mangkir.mahasiswa_id`, mahasiswa.id))
        .leftJoin(rusakPoinSubquery, eq(sql`rusak_poin.mahasiswa_id`, mahasiswa.id))
        .leftJoin(bayarAggSubquery, eq(sql`bayar_mangkir.mahasiswa_id`, mahasiswa.id))
        .where(whereClause);
      total = Number(totalResult?.total || 0);
    } catch (e: unknown) {
      const cause = (e as Error & { cause?: unknown }).cause;
      const causeMsg = cause instanceof Error && cause.message ? cause.message.split('\n')[0] : 'Unknown error';
      console.error('[PresensiService.getLaporanKompensasi] Query failed', {
        filter: { page, limit, search, prodiId, sortBy, sortOrder, statusLunas, exportAll },
        dbError: causeMsg,
        error: e,
      });
      throw new Error('Gagal memuat laporan kompensasi.');
    }

    const data = listMahasiswa.map((mhs) => ({
      ...mhs,
      totalKompensasi: Number(mhs.totalKompensasi),
      totalDibayar: Number(mhs.totalDibayar),
      sisaKompensasi: Number(mhs.sisaKompensasi),
    }));

    const totalPages = Math.ceil(total / limit);

    return { data, meta: { total, page, limit: exportAll ? total : limit, totalPages } };
  }

  static async getLaporanKompensasiStats() {
    const pengaliMangkir = await SystemParameterService.getNumber('PENGALI_DENDA_MANGKIR');
    const pengaliIzinSakit = await SystemParameterService.getNumber('PENGALI_DENDA_IZIN_SAKIT');
    const maksHarian = await SystemParameterService.getNumber('DURASI_HARIAN_MENIT');

    const sourceRawSubquery = db.$with('source_raw').as(
      db
        .select({
          mahasiswaId: ketidakhadiranMahasiswa.mahasiswaId,
          tanggal: ketidakhadiranMahasiswa.tanggal,
          rawMangkir: sql<number>`CASE WHEN status IN ('ALPA', 'TERLAMBAT') THEN durasi_menit ELSE 0 END`.as(
            'raw_mangkir',
          ),
          rawRingan: sql<number>`CASE WHEN status IN ('SAKIT', 'IZIN') THEN durasi_menit ELSE 0 END`.as('raw_ringan'),
        })
        .from(ketidakhadiranMahasiswa)
        .where(sql`is_verified = true`),
    );

    const dailyRawSubquery = db.$with('daily_raw').as(
      db
        .select({
          mahasiswaId: sourceRawSubquery.mahasiswaId,
          rawMangkir: sql<number>`SUM(raw_mangkir)`.as('raw_mangkir'),
          rawRingan: sql<number>`SUM(raw_ringan)`.as('raw_ringan'),
        })
        .from(sourceRawSubquery)
        .groupBy(sourceRawSubquery.mahasiswaId, sourceRawSubquery.tanggal),
    );

    const presensiAggSubquery = db.$with('presensi_mangkir').as(
      db
        .select({
          mahasiswaId: dailyRawSubquery.mahasiswaId,
          poin: sql<number>`SUM(CASE
              WHEN (raw_mangkir + raw_ringan) <= ${maksHarian}
                THEN raw_mangkir * ${pengaliMangkir} + raw_ringan * ${pengaliIzinSakit}
                ELSE (raw_mangkir * ${pengaliMangkir} + raw_ringan * ${pengaliIzinSakit}) * (${maksHarian}::numeric / NULLIF(raw_mangkir + raw_ringan, 0))
              END)`.as('poin'),
        })
        .from(dailyRawSubquery)
        .groupBy(dailyRawSubquery.mahasiswaId),
    );

    // Poin RUSAK (kerusakan fasilitas, sumber MANUAL) = durasi mentah, tanpa pengali
    // dan tanpa proporsional cap harian.
    const rusakPoinSubquery = db.$with('rusak_poin').as(
      db
        .select({
          mahasiswaId: ketidakhadiranMahasiswa.mahasiswaId,
          poinRusak: sql<number>`SUM(durasi_menit)`.as('poin_rusak'),
        })
        .from(ketidakhadiranMahasiswa)
        .where(sql`is_verified = true AND sumber = 'MANUAL' AND status = 'RUSAK'`)
        .groupBy(ketidakhadiranMahasiswa.mahasiswaId),
    );

    const totalKompensasiExpr = sql<number>`COALESCE(presensi_mangkir.poin, 0) + COALESCE(rusak_poin.poin_rusak, 0)`;

    const perMhs = await db
      .with(sourceRawSubquery, dailyRawSubquery, presensiAggSubquery, rusakPoinSubquery)
      .select({
        id: mahasiswa.id,
        nama: mahasiswa.nama,
        nim: mahasiswa.nim,
        prodiNama: programStudi.nama,
        totalKompensasi: totalKompensasiExpr,
      })
      .from(mahasiswa)
      .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id))
      .leftJoin(presensiAggSubquery, eq(sql`presensi_mangkir.mahasiswa_id`, mahasiswa.id))
      .leftJoin(rusakPoinSubquery, eq(sql`rusak_poin.mahasiswa_id`, mahasiswa.id))
      .where(sql`(COALESCE(presensi_mangkir.poin, 0) + COALESCE(rusak_poin.poin_rusak, 0)) > 0`);

    const paymentsAgg = await db
      .select({
        mahasiswaId: kompensasiBayar.mahasiswaId,
        totalDibayar: sql<number>`COALESCE(SUM(${kompensasiBayar.jumlahMenit}), 0)`,
      })
      .from(kompensasiBayar)
      .groupBy(kompensasiBayar.mahasiswaId);

    const mapPayments = new Map<number, number>(paymentsAgg.map((p) => [p.mahasiswaId, Number(p.totalDibayar)]));

    let totalKomp = 0;
    let totalDby = 0;
    const prodiMap = new Map<
      string,
      {
        prodiNama: string;
        jumlahMahasiswa: number;
        totalKompensasi: number;
        totalDibayar: number;
        sisaKompensasi: number;
      }
    >();

    const mhsAgg = perMhs.map((mhs) => {
      const tk = Number(mhs.totalKompensasi);
      const td = mapPayments.get(mhs.id) || 0;
      const sisa = Math.max(0, tk - td);

      totalKomp += tk;
      totalDby += td;

      const prodi = mhs.prodiNama || 'Tanpa Prodi';
      const existing = prodiMap.get(prodi) || {
        prodiNama: prodi,
        jumlahMahasiswa: 0,
        totalKompensasi: 0,
        totalDibayar: 0,
        sisaKompensasi: 0,
      };
      existing.jumlahMahasiswa++;
      existing.totalKompensasi += tk;
      existing.totalDibayar += td;
      existing.sisaKompensasi += sisa;
      prodiMap.set(prodi, existing);

      return {
        id: mhs.id,
        nama: mhs.nama,
        nim: mhs.nim,
        prodiNama: prodi,
        totalKompensasi: tk,
        totalDibayar: td,
        sisaKompensasi: sisa,
      };
    });

    const rekapProdi = [...prodiMap.values()].sort((a, b) => b.sisaKompensasi - a.sisaKompensasi);

    const top10 = mhsAgg
      .filter((m) => m.sisaKompensasi > 0)
      .sort((a, b) => b.sisaKompensasi - a.sisaKompensasi)
      .slice(0, 10);

    return {
      summary: {
        totalMahasiswa: perMhs.length,
        totalKompensasi: totalKomp,
        totalDibayar: totalDby,
        totalSisa: Math.max(0, totalKomp - totalDby),
      },
      rekapProdi,
      top10,
    };
  }

  static async bayarKompensasi(data: {
    mahasiswaId: number;
    jumlahMenit: number;
    tanggal: string;
    keterangan: string;
    petugasId?: number;
  }) {
    const [newPayment] = await db.insert(kompensasiBayar).values(data).returning();
    return newPayment;
  }

  static async updateKompensasiBayar(
    id: number,
    data: Partial<{
      jumlahMenit: number;
      tanggal: string;
      keterangan: string;
    }>,
  ) {
    const [updated] = await db.update(kompensasiBayar).set(data).where(eq(kompensasiBayar.id, id)).returning();
    return updated || null;
  }

  static async getRekapKehadiran(kelasKuliahId: number) {
    const kelasInfo = await db.query.kelasKuliah.findFirst({
      where: eq(kelasKuliah.id, kelasKuliahId),
      with: { mataKuliah: true, periodeAkademik: true },
    });

    const [totalPertemuan] = await db.select({ count: count() }).from(bap).where(eq(bap.kelasKuliahId, kelasKuliahId));

    const pengajar = await db
      .select({ dosen: { id: dosen.id, nama: dosen.nama, nip: dosen.nip } })
      .from(dosenPengajarKelas)
      .leftJoin(dosen, eq(dosenPengajarKelas.dosenId, dosen.id))
      .where(eq(dosenPengajarKelas.kelasKuliahId, kelasKuliahId));

    const bapList = await db.select({ id: bap.id }).from(bap).where(eq(bap.kelasKuliahId, kelasKuliahId));
    const bapIds = bapList.map((b) => b.id);

    if (bapIds.length === 0) {
      return { kelas: kelasInfo, totalPertemuan: 0, dosenPengajar: pengajar, mahasiswa: [] };
    }

    const presensiSummary = await db
      .select({
        mahasiswaId: presensi.mahasiswaId,
        nim: mahasiswa.nim,
        nama: mahasiswa.nama,
        hadir: sql<number>`COALESCE(SUM(CASE WHEN ${presensi.status} = 'hadir' THEN 1 ELSE 0 END), 0)`,
        sakit: sql<number>`COALESCE(SUM(CASE WHEN ${presensi.status} = 'sakit' THEN 1 ELSE 0 END), 0)`,
        izin: sql<number>`COALESCE(SUM(CASE WHEN ${presensi.status} = 'izin' THEN 1 ELSE 0 END), 0)`,
        alpa: sql<number>`COALESCE(SUM(CASE WHEN ${presensi.status} = 'alpa' THEN 1 ELSE 0 END), 0)`,
        telat: sql<number>`COALESCE(SUM(CASE WHEN ${presensi.status} = 'telat' THEN 1 ELSE 0 END), 0)`,
      })
      .from(presensi)
      .innerJoin(mahasiswa, eq(presensi.mahasiswaId, mahasiswa.id))
      .where(sql`${presensi.bapId} IN (${sql.join(bapIds, sql`, `)})`)
      .groupBy(presensi.mahasiswaId, mahasiswa.nim, mahasiswa.nama)
      .orderBy(mahasiswa.nama);

    const pt = totalPertemuan?.count || 0;

    return {
      kelas: kelasInfo,
      totalPertemuan: pt,
      dosenPengajar: pengajar,
      mahasiswa: presensiSummary.map((m) => ({
        mahasiswaId: m.mahasiswaId,
        nim: m.nim,
        nama: m.nama,
        hadir: Number(m.hadir),
        sakit: Number(m.sakit),
        izin: Number(m.izin),
        alpa: Number(m.alpa),
        telat: Number(m.telat),
        totalKehadiran: Number(m.hadir) + Number(m.sakit) + Number(m.izin),
        persentaseHadir: pt > 0 ? Math.round(((Number(m.hadir) + Number(m.sakit) + Number(m.izin)) / pt) * 100) : 0,
      })),
    };
  }

  static async getRekapKehadiranMahasiswa(mahasiswaId: number, periodeId?: string) {
    const mhsInfo = await db.query.mahasiswa.findFirst({
      where: eq(mahasiswa.id, mahasiswaId),
      with: { programStudi: true },
    });

    const kelasConditions: SQL<unknown>[] = [];
    if (periodeId) kelasConditions.push(eq(kelasKuliah.periodeId, periodeId));
    const kelasWhere = kelasConditions.length > 0 ? and(...kelasConditions) : undefined;

    const kelasList = await db.query.kelasKuliah.findMany({
      where: kelasWhere,
      with: { mataKuliah: true },
    });

    const hasil = [];
    for (const k of kelasList) {
      const bapList = await db.select({ id: bap.id }).from(bap).where(eq(bap.kelasKuliahId, k.id));
      const bapIds = bapList.map((b) => b.id);

      if (bapIds.length === 0) {
        hasil.push({
          kelasKuliahId: k.id,
          namaMataKuliah: k.mataKuliah?.nama || k.namaKelas,
          totalPertemuan: 0,
          hadir: 0,
          sakit: 0,
          izin: 0,
          alpa: 0,
          telat: 0,
          persentaseHadir: 0,
        });
        continue;
      }

      const [p] = await db
        .select({
          hadir: sql<number>`COALESCE(SUM(CASE WHEN ${presensi.status} = 'hadir' THEN 1 ELSE 0 END), 0)`,
          sakit: sql<number>`COALESCE(SUM(CASE WHEN ${presensi.status} = 'sakit' THEN 1 ELSE 0 END), 0)`,
          izin: sql<number>`COALESCE(SUM(CASE WHEN ${presensi.status} = 'izin' THEN 1 ELSE 0 END), 0)`,
          alpa: sql<number>`COALESCE(SUM(CASE WHEN ${presensi.status} = 'alpa' THEN 1 ELSE 0 END), 0)`,
          telat: sql<number>`COALESCE(SUM(CASE WHEN ${presensi.status} = 'telat' THEN 1 ELSE 0 END), 0)`,
        })
        .from(presensi)
        .where(and(eq(presensi.mahasiswaId, mahasiswaId), sql`${presensi.bapId} IN (${sql.join(bapIds, sql`, `)})`));

      const pt = bapIds.length;
      hasil.push({
        kelasKuliahId: k.id,
        namaMataKuliah: k.mataKuliah?.nama || k.namaKelas,
        totalPertemuan: pt,
        hadir: Number(p?.hadir || 0),
        sakit: Number(p?.sakit || 0),
        izin: Number(p?.izin || 0),
        alpa: Number(p?.alpa || 0),
        telat: Number(p?.telat || 0),
        persentaseHadir:
          pt > 0 ? Math.round(((Number(p?.hadir || 0) + Number(p?.sakit || 0) + Number(p?.izin || 0)) / pt) * 100) : 0,
      });
    }

    const rataHadir = hasil.reduce((s, h) => s + h.persentaseHadir, 0) / (hasil.length || 1);

    return {
      mahasiswa: mhsInfo,
      detail: hasil,
      summary: { totalKelas: hasil.length, rataPersentaseHadir: Math.round(rataHadir) },
    };
  }
}
