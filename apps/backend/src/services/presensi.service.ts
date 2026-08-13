import { and, count, eq, ilike, inArray, isNotNull, ne, or, type SQL, sql } from 'drizzle-orm';
import {
  bap,
  dosen,
  dosenPengajarKelas,
  kelasKuliah,
  kelompokApel,
  kelompokApelAnggota,
  kompensasiBayar,
  kompensasiManual,
  mahasiswa,
  mataKuliah,
  presensi,
  presensiApel,
  programStudi,
  sesiApel,
  users,
} from '../models/schema';
import { db } from '../utils/db';
import { SystemParameterService } from './system-parameter.service';

export class PresensiService {
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
      if (itemsToInsert.length > 0) {
        await tx.insert(presensi).values(itemsToInsert);
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
      })
      .from(presensi)
      .innerJoin(mahasiswa, eq(presensi.mahasiswaId, mahasiswa.id))
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

    const presensiList = await db
      .select({
        id: presensi.id,
        bapId: presensi.bapId,
        status: presensi.status,
        durasiMangkir: presensi.durasiMangkir,
        keteranganAdmin: presensi.keteranganAdmin,
        resolvedBy: presensi.resolvedBy,
        resolvedAt: presensi.resolvedAt,
        createdAt: presensi.createdAt,
        bapPertemuan: bap.pertemuanKe,
        bapMateri: bap.materi,
        bapTanggal: bap.tanggal,
        sumber: sql<'perkuliahan'>`'perkuliahan'`,
      })
      .from(presensi)
      .innerJoin(bap, eq(presensi.bapId, bap.id))
      .where(and(eq(presensi.mahasiswaId, mahasiswaId), ne(presensi.status, 'unknown')));

    const apelList = await db
      .select({
        id: presensiApel.id,
        bapId: sql<number>`NULL`,
        status: presensiApel.status,
        verifiedStatus: presensiApel.verifiedStatus,
        durasiMangkir: sql<number>`COALESCE(${presensiApel.menitTerlambat}, 0)`,
        keteranganAdmin: sql<string>`NULL`,
        resolvedBy: presensiApel.verifiedBy,
        resolvedAt: presensiApel.verifiedAt,
        createdAt: presensiApel.createdAt,
        bapPertemuan: sql<number>`NULL`,
        bapMateri: sql<string>`NULL`,
        bapTanggal: sesiApel.tanggal,
        sumber: sql<'apel'>`'apel'`,
      })
      .from(presensiApel)
      .innerJoin(sesiApel, eq(presensiApel.sesiApelId, sesiApel.id))
      .where(
        and(
          eq(presensiApel.mahasiswaId, mahasiswaId),
          or(ne(presensiApel.status, 'unknown'), isNotNull(presensiApel.verifiedStatus)),
        ),
      );

    const manualList = await db
      .select({
        id: kompensasiManual.id,
        bapId: sql<number>`NULL`,
        status: sql<string>`${kompensasiManual.jenisKompen}`,
        durasiMangkir: kompensasiManual.durasiMenit,
        createdAt: kompensasiManual.createdAt,
        bapPertemuan: sql<number>`NULL`,
        bapMateri: sql<string>`'Kompensasi Manual'`,
        bapTanggal: kompensasiManual.tanggal,
        sumber: sql<'manual'>`'manual'`,
      })
      .from(kompensasiManual)
      .where(and(eq(kompensasiManual.mahasiswaId, mahasiswaId), ne(kompensasiManual.jenisKompen, 'unknown')));

    const allPresensi = [...presensiList, ...apelList, ...manualList];

    const pengaliMangkir = await SystemParameterService.getNumber('PENGALI_DENDA_MANGKIR');
    const mapped = await Promise.all(
      allPresensi.map(async (p) => {
        let poinKompensasi: number;
        if (p.sumber === 'manual') {
          if (p.status === 'rusak') {
            poinKompensasi = p.durasiMangkir;
          } else {
            const pengali = ['alpa', 'terlambat'].includes(p.status)
              ? pengaliMangkir
              : await SystemParameterService.getNumber('PENGALI_DENDA_IZIN_SAKIT');
            poinKompensasi = p.durasiMangkir * pengali;
          }
        } else if (p.sumber === 'apel') {
          const effectiveStatus = p.verifiedStatus ?? p.status;
          poinKompensasi = await this.calculateKompensasiMinutes(effectiveStatus, p.durasiMangkir);
        } else {
          poinKompensasi = await this.calculateKompensasiMinutes(p.status, p.durasiMangkir);
        }
        return { ...p, poinKompensasi };
      }),
    );
    const historyKompensasi = mapped.filter((p) => p.poinKompensasi > 0);

    const totalKompensasi = historyKompensasi.reduce((sum, item) => sum + item.poinKompensasi, 0);

    const payments = await db.select().from(kompensasiBayar).where(eq(kompensasiBayar.mahasiswaId, mahasiswaId));

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
    // - rawMangkir  : alpa/telat/terlambat/rusak -> multiplied by PENGALI_DENDA_MANGKIR
    // - rawRingan   : sakit/izin                  -> multiplied by PENGALI_DENDA_IZIN_SAKIT
    // Unknown status is excluded from all sources.
    const sourceRawSubquery = db.$with('source_raw').as(
      db
        .select({
          mahasiswaId: presensi.mahasiswaId,
          tanggal: bap.tanggal,
          rawMangkir:
            sql<number>`CASE WHEN status::text IN ('alpa', 'telat', 'terlambat') THEN durasi_mangkir ELSE 0 END`.as(
              'raw_mangkir',
            ),
          rawRingan: sql<number>`CASE WHEN status::text IN ('sakit', 'izin') THEN durasi_mangkir ELSE 0 END`.as(
            'raw_ringan',
          ),
        })
        .from(presensi)
        .innerJoin(bap, eq(presensi.bapId, bap.id))
        .where(sql`status::text IN ('alpa', 'telat', 'terlambat', 'sakit', 'izin')`)
        .unionAll(
          db
            .select({
              mahasiswaId: presensiApel.mahasiswaId,
              tanggal: sesiApel.tanggal,
              rawMangkir:
                sql<number>`CASE WHEN COALESCE(verified_status::text, status::text) IN ('alpa', 'terlambat') THEN COALESCE(menit_terlambat, 0) ELSE 0 END`.as(
                  'raw_mangkir',
                ),
              rawRingan:
                sql<number>`CASE WHEN COALESCE(verified_status::text, status::text) IN ('sakit', 'izin') THEN COALESCE(menit_terlambat, 0) ELSE 0 END`.as(
                  'raw_ringan',
                ),
            })
            .from(presensiApel)
            .innerJoin(sesiApel, eq(presensiApel.sesiApelId, sesiApel.id))
            .where(sql`COALESCE(verified_status::text, status::text) IN ('alpa', 'terlambat', 'sakit', 'izin')`),
        )
        .unionAll(
          db
            .select({
              mahasiswaId: kompensasiManual.mahasiswaId,
              tanggal: kompensasiManual.tanggal,
              rawMangkir:
                sql<number>`CASE WHEN jenis_kompen IN ('alpa', 'terlambat', 'rusak') THEN durasi_menit ELSE 0 END`.as(
                  'raw_mangkir',
                ),
              rawRingan: sql<number>`CASE WHEN jenis_kompen IN ('sakit', 'izin') THEN durasi_menit ELSE 0 END`.as(
                'raw_ringan',
              ),
            })
            .from(kompensasiManual),
        ),
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

    const bayarAggSubquery = db.$with('bayar_mangkir').as(
      db
        .select({
          mahasiswaId: kompensasiBayar.mahasiswaId,
          totalDibayar: sql<number>`COALESCE(SUM(${kompensasiBayar.jumlahMenit}), 0)`.as('total_dibayar'),
        })
        .from(kompensasiBayar)
        .groupBy(kompensasiBayar.mahasiswaId),
    );

    const totalKompensasiSql = sql<number>`COALESCE(presensi_mangkir.poin, 0)`;
    const totalDibayarSql = sql<number>`COALESCE(bayar_mangkir.total_dibayar, 0)`;
    const sisaKompensasiSql = sql<number>`GREATEST(0, COALESCE(presensi_mangkir.poin, 0) - COALESCE(bayar_mangkir.total_dibayar, 0))`;

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
      .with(sourceRawSubquery, dailyRawSubquery, presensiAggSubquery, bayarAggSubquery)
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
      .leftJoin(bayarAggSubquery, eq(sql`bayar_mangkir.mahasiswa_id`, mahasiswa.id))
      .where(whereClause)
      .orderBy(orderClause);

    let listMahasiswa: Awaited<typeof baseQuery>;
    let total = 0;
    try {
      listMahasiswa = exportAll ? await baseQuery : await baseQuery.limit(limit).offset(offset);

      const [totalResult] = await db
        .with(sourceRawSubquery, dailyRawSubquery, presensiAggSubquery, bayarAggSubquery)
        .select({ total: sql<number>`count(*)` })
        .from(mahasiswa)
        .leftJoin(presensiAggSubquery, eq(sql`presensi_mangkir.mahasiswa_id`, mahasiswa.id))
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
          mahasiswaId: presensi.mahasiswaId,
          tanggal: bap.tanggal,
          rawMangkir:
            sql<number>`CASE WHEN status::text IN ('alpa', 'telat', 'terlambat') THEN durasi_mangkir ELSE 0 END`.as(
              'raw_mangkir',
            ),
          rawRingan: sql<number>`CASE WHEN status::text IN ('sakit', 'izin') THEN durasi_mangkir ELSE 0 END`.as(
            'raw_ringan',
          ),
        })
        .from(presensi)
        .innerJoin(bap, eq(presensi.bapId, bap.id))
        .where(sql`status::text IN ('alpa', 'telat', 'terlambat', 'sakit', 'izin')`)
        .unionAll(
          db
            .select({
              mahasiswaId: presensiApel.mahasiswaId,
              tanggal: sesiApel.tanggal,
              rawMangkir:
                sql<number>`CASE WHEN COALESCE(verified_status::text, status::text) IN ('alpa', 'terlambat') THEN COALESCE(menit_terlambat, 0) ELSE 0 END`.as(
                  'raw_mangkir',
                ),
              rawRingan:
                sql<number>`CASE WHEN COALESCE(verified_status::text, status::text) IN ('sakit', 'izin') THEN COALESCE(menit_terlambat, 0) ELSE 0 END`.as(
                  'raw_ringan',
                ),
            })
            .from(presensiApel)
            .innerJoin(sesiApel, eq(presensiApel.sesiApelId, sesiApel.id))
            .where(sql`COALESCE(verified_status::text, status::text) IN ('alpa', 'terlambat', 'sakit', 'izin')`),
        )
        .unionAll(
          db
            .select({
              mahasiswaId: kompensasiManual.mahasiswaId,
              tanggal: kompensasiManual.tanggal,
              rawMangkir:
                sql<number>`CASE WHEN jenis_kompen IN ('alpa', 'terlambat', 'rusak') THEN durasi_menit ELSE 0 END`.as(
                  'raw_mangkir',
                ),
              rawRingan: sql<number>`CASE WHEN jenis_kompen IN ('sakit', 'izin') THEN durasi_menit ELSE 0 END`.as(
                'raw_ringan',
              ),
            })
            .from(kompensasiManual),
        ),
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

    const totalKompensasiExpr = sql<number>`COALESCE(presensi_mangkir.poin, 0)`;

    const perMhs = await db
      .with(sourceRawSubquery, dailyRawSubquery, presensiAggSubquery)
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
      .where(sql`COALESCE(presensi_mangkir.poin, 0) > 0`);

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
