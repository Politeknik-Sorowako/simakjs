import { and, asc, eq, sql } from 'drizzle-orm';
import {
  bap,
  bapPraktikum,
  kelasKuliah,
  ketidakhadiranMahasiswa,
  mahasiswa,
  mataKuliah,
  presensi,
  presensiApel,
  presensiPraktikum,
  sesiApel,
  users,
} from '../models/schema';
import { db } from '../utils/db';
import { SystemParameterService } from './system-parameter.service';

export type KetidakhadiranSumber = 'BAP' | 'APEL' | 'MANUAL' | 'PRAKTIKUM';
export type KetidakhadiranStatusKonfirmasi = 'SAKIT' | 'IZIN' | 'ALPA' | 'TERLAMBAT' | 'HADIR';

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface HealedSource {
  mahasiswaId: number;
  tanggal: string;
  durasiMenit: number;
}

const STATUS_KONFIRMASI: KetidakhadiranStatusKonfirmasi[] = ['SAKIT', 'IZIN', 'ALPA', 'TERLAMBAT', 'HADIR'];

/** Status yang dihitung sebagai beban kompensasi terverifikasi pada cap harian. */
const STATUS_TERHITUNG_CAP = ['SAKIT', 'IZIN', 'ALPA', 'TERLAMBAT'];

interface VerifyInput {
  sumber: KetidakhadiranSumber;
  sumberId: number;
  statusKonfirmasi: KetidakhadiranStatusKonfirmasi;
  durasiMenit?: number;
  keterangan?: string;
  adminUserId: number;
}

export class VerifikasiUnknownService {
  /**
   * Verifikasi status UNKNOWN pada tabel terpusat ketidakhadiran.
   * Menjalankan seluruh proses dalam SATU transaksi:
   *  1. Membuat/memperbarui baris ketidakhadiran (menjadi terverifikasi).
   *  2. Sinkron status & keterangan ke tabel sumber (presensi BAP / presensi_apel).
   *  3. Menerapkan batas DURASI_HARIAN_MENIT per hari.
   *  - Anulir: durasiMenit = 0 (denda dihapus, tetap tercatat status).
   *  - Koreksi: memanggil ulang dengan sumber/sumberId yang sama akan memperbarui baris + sumber.
   */
  static async verify(input: VerifyInput) {
    if (!STATUS_KONFIRMASI.includes(input.statusKonfirmasi)) {
      throw new Error('Status konfirmasi harus SAKIT, IZIN, ALPA, TERLAMBAT, atau HADIR');
    }

    const adminUserId = Number(input.adminUserId) > 0 ? input.adminUserId : null;

    try {
      return await VerifikasiUnknownService._executeVerify(input, adminUserId);
    } catch (e: unknown) {
      if (adminUserId !== null && isVerifiedByFkViolation(e)) {
        return await VerifikasiUnknownService._executeVerify(input, null);
      }
      throw e;
    }
  }

  /**
   * Self-healing: bila baris `ketidakhadiran_mahasiswa` belum ada (mis. orphan
   * akibat copy BAP / re-save presensi yang tidak tersinkron), bentuk ulang baris
   * terpusat dari tabel sumber (presensi/presensi_praktikum/presensi_apel) di
   * dalam transaksi yang sama agar admin tidak terhalang saat anulir/koreksi.
   */
  private static async _healMissingAbsence(tx: DbTx, input: VerifyInput, adminUserId: number | null) {
    const source = await VerifikasiUnknownService._resolveSourceForHeal(tx, input.sumber, input.sumberId);

    if (!source) {
      if (input.sumber === 'MANUAL') {
        throw new Error('Data ketidakhadiran tidak ditemukan');
      }
      throw new Error(
        `Data ketidakhadiran tidak ditemukan dan sumber presensi ${input.sumber} #${input.sumberId} tidak ada. ` +
          'Kemungkinan data presensi sumber telah dihapus atau di-input ulang.',
      );
    }

    await tx
      .insert(ketidakhadiranMahasiswa)
      .values({
        mahasiswaId: source.mahasiswaId,
        tanggal: source.tanggal,
        sumber: input.sumber,
        sumberId: input.sumberId,
        status: 'UNKNOWN',
        durasiMenit: Math.max(Number(source.durasiMenit) || 0, 0),
        isVerified: false,
        createdBy: adminUserId,
      })
      .onConflictDoNothing({ target: [ketidakhadiranMahasiswa.sumber, ketidakhadiranMahasiswa.sumberId] });

    const [healed] = await tx
      .select()
      .from(ketidakhadiranMahasiswa)
      .where(
        and(eq(ketidakhadiranMahasiswa.sumber, input.sumber), eq(ketidakhadiranMahasiswa.sumberId, input.sumberId)),
      );

    if (!healed) {
      throw new Error('Data ketidakhadiran tidak ditemukan');
    }

    console.warn(
      `[self-heal] Baris ketidakhadiran hilang dibentuk ulang: sumber=${input.sumber} sumberId=${input.sumberId} ` +
        `mahasiswaId=${source.mahasiswaId} tanggal=${source.tanggal}`,
    );

    return healed;
  }

  private static async _resolveSourceForHeal(
    tx: DbTx,
    sumber: KetidakhadiranSumber,
    sumberId: number,
  ): Promise<HealedSource | null> {
    if (sumber === 'BAP') {
      const [row] = await tx
        .select({
          mahasiswaId: presensi.mahasiswaId,
          tanggal: bap.tanggal,
          durasiMenit: bap.durasiMenit,
        })
        .from(presensi)
        .innerJoin(bap, eq(presensi.bapId, bap.id))
        .where(eq(presensi.id, sumberId));
      return row ?? null;
    }

    if (sumber === 'APEL') {
      const [row] = await tx
        .select({
          mahasiswaId: presensiApel.mahasiswaId,
          tanggal: sesiApel.tanggal,
          durasiMenit: presensiApel.menitTerlambat,
        })
        .from(presensiApel)
        .innerJoin(sesiApel, eq(presensiApel.sesiApelId, sesiApel.id))
        .where(eq(presensiApel.id, sumberId));
      if (!row) return null;
      return { mahasiswaId: row.mahasiswaId, tanggal: row.tanggal, durasiMenit: row.durasiMenit ?? 0 };
    }

    if (sumber === 'PRAKTIKUM') {
      const [row] = await tx
        .select({
          mahasiswaId: presensiPraktikum.mahasiswaId,
          tanggal: bapPraktikum.tanggal,
          durasiMenit: presensiPraktikum.durasiMangkir,
        })
        .from(presensiPraktikum)
        .innerJoin(bapPraktikum, eq(presensiPraktikum.bapPraktikumId, bapPraktikum.id))
        .where(eq(presensiPraktikum.id, sumberId));
      return row ?? null;
    }

    return null;
  }

  private static async _executeVerify(input: VerifyInput, adminUserId: number | null) {
    return await db.transaction(async (tx) => {
      let [absence] = await tx
        .select()
        .from(ketidakhadiranMahasiswa)
        .where(
          and(eq(ketidakhadiranMahasiswa.sumber, input.sumber), eq(ketidakhadiranMahasiswa.sumberId, input.sumberId)),
        );

      if (!absence) {
        absence = await VerifikasiUnknownService._healMissingAbsence(tx, input, adminUserId);
      }

      if (absence.sumber === 'MANUAL') {
        throw new Error('Data dengan sumber MANUAL tidak dapat diverifikasi melalui alur ini');
      }

      const durasi = input.durasiMenit ?? absence.durasiMenit;
      if (durasi < 0) {
        throw new Error('Durasi tidak boleh negatif');
      }

      const lockKey = `kompen_${absence.mahasiswaId}_${absence.tanggal}`;
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);

      // HADIR = mahasiswa ternyata hadir -> bukan ketidakhadiran. Pertahankan baris
      // terpusat dengan status UNKNOWN + is_verified=true + durasi 0 agar (a) tidak masuk
      // rekap kompensasi (UNKNOWN bukan kelas mangkir/ringan) dan (b) tetap bisa dikoreksi
      // lewat endpoint ini bila admin salah konfirmasi. Tandai sumber asal sebagai hadir.
      if (input.statusKonfirmasi === 'HADIR') {
        const note = input.keterangan?.trim() || '';
        const terkonfirmasi = `[terkonfirmasi] hadir${note ? ` — ${note}` : ''}`;

        if (absence.sumber === 'BAP' && absence.sumberId != null) {
          const [bapRow] = await tx
            .select({ keteranganAdmin: presensi.keteranganAdmin })
            .from(presensi)
            .where(eq(presensi.id, absence.sumberId));
          const prev = bapRow?.keteranganAdmin || '';
          await tx
            .update(presensi)
            .set({
              status: 'hadir' as 'hadir',
              durasiMangkir: 0,
              keteranganAdmin: prev ? `${prev} | ${terkonfirmasi}` : terkonfirmasi,
              resolvedBy: adminUserId,
              resolvedAt: new Date(),
            })
            .where(eq(presensi.id, absence.sumberId));
        } else if (absence.sumber === 'APEL' && absence.sumberId != null) {
          const [apelRow] = await tx
            .select({ verificationNote: presensiApel.verificationNote })
            .from(presensiApel)
            .where(eq(presensiApel.id, absence.sumberId));
          const prev = apelRow?.verificationNote || '';
          await tx
            .update(presensiApel)
            .set({
              status: 'hadir' as 'hadir',
              verifiedStatus: 'hadir' as 'hadir',
              menitTerlambat: 0,
              verificationNote: prev ? `${prev} | ${terkonfirmasi}` : terkonfirmasi,
              verifiedBy: adminUserId,
              verifiedAt: new Date(),
            })
            .where(eq(presensiApel.id, absence.sumberId));
        } else if (absence.sumber === 'PRAKTIKUM' && absence.sumberId != null) {
          const [prakRow] = await tx
            .select({ keteranganAdmin: presensiPraktikum.keteranganAdmin })
            .from(presensiPraktikum)
            .where(eq(presensiPraktikum.id, absence.sumberId));
          const prev = prakRow?.keteranganAdmin || '';
          await tx
            .update(presensiPraktikum)
            .set({
              status: 'hadir' as 'hadir',
              durasiMangkir: 0,
              keteranganAdmin: prev ? `${prev} | ${terkonfirmasi}` : terkonfirmasi,
              resolvedBy: adminUserId,
              resolvedAt: new Date(),
            })
            .where(eq(presensiPraktikum.id, absence.sumberId));
        }

        await tx
          .update(ketidakhadiranMahasiswa)
          .set({
            status: 'UNKNOWN',
            durasiMenit: 0,
            keterangan: absence.keterangan,
            isVerified: true,
            verifiedBy: adminUserId,
            verifiedAt: new Date(),
          })
          .where(eq(ketidakhadiranMahasiswa.id, absence.id));

        return { ...absence, status: 'HADIR', isVerified: true, durasiMenit: 0, verifiedBy: adminUserId };
      }

      if (durasi > 0) {
        const maksHarian = await SystemParameterService.getNumber('DURASI_HARIAN_MENIT');
        // Cap hanya menghitung baris yang SUDAH terverifikasi dan berstatus kelas
        // ketidakhadiran (SAKIT/IZIN/ALPA/TERLAMBAT). Baris UNKNOWN yang belum
        // terverifikasi tidak boleh menghabiskan kuota harian.
        const [totalRow] = await tx
          .select({ total: sql<number>`COALESCE(SUM(${ketidakhadiranMahasiswa.durasiMenit}), 0)` })
          .from(ketidakhadiranMahasiswa)
          .where(
            and(
              eq(ketidakhadiranMahasiswa.mahasiswaId, absence.mahasiswaId),
              eq(ketidakhadiranMahasiswa.tanggal, absence.tanggal),
              eq(ketidakhadiranMahasiswa.isVerified, true),
              sql`${ketidakhadiranMahasiswa.status} IN ('SAKIT', 'IZIN', 'ALPA', 'TERLAMBAT')`,
              sql`${ketidakhadiranMahasiswa.id} != ${absence.id}`,
            ),
          );
        const totalTerverifikasi = Number(totalRow?.total || 0);
        const sisaKuota = Math.max(maksHarian - totalTerverifikasi, 0);
        // Koreksi turun (durasi baru <= durasi lama) tidak menambah beban harian,
        // jadi tetap diizinkan meski kuota sudah penuh.
        const isKoreksiTurun = durasi <= Number(absence.durasiMenit || 0);
        if (!isKoreksiTurun && durasi > sisaKuota) {
          throw new Error(
            `Total durasi terverifikasi pada tanggal ${absence.tanggal} adalah ${totalTerverifikasi} menit. ` +
              `Durasi diminta ${durasi} menit melebihi sisa kuota ${sisaKuota} menit (maks ${maksHarian} menit/hari).`,
          );
        }
      }

      const note = input.keterangan?.trim() || '';
      const combinedKeterangan = [absence.keterangan, note].filter((k) => k && k.length > 0).join('\n');

      const [updatedAbsence] = await tx
        .update(ketidakhadiranMahasiswa)
        .set({
          status: input.statusKonfirmasi,
          durasiMenit: durasi,
          keterangan: combinedKeterangan || null,
          isVerified: true,
          verifiedBy: adminUserId,
          verifiedAt: new Date(),
        })
        .where(eq(ketidakhadiranMahasiswa.id, absence.id))
        .returning();

      const lowerStatus = input.statusKonfirmasi.toLowerCase();

      if (absence.sumber === 'BAP' && absence.sumberId != null) {
        const [bapRow] = await tx
          .select({
            bapId: presensi.bapId,
            keteranganAdmin: presensi.keteranganAdmin,
            kelasKuliahId: bap.kelasKuliahId,
          })
          .from(presensi)
          .innerJoin(bap, eq(presensi.bapId, bap.id))
          .where(eq(presensi.id, absence.sumberId));

        const [mataKuliahRow] = bapRow?.kelasKuliahId
          ? await tx
              .select({ nama: mataKuliah.nama })
              .from(kelasKuliah)
              .innerJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
              .where(eq(kelasKuliah.id, bapRow.kelasKuliahId))
          : [];
        const mataKuliahNama = mataKuliahRow?.nama || '';

        const terkonfirmasi = `[terkonfirmasi] ${lowerStatus}${note ? ` — ${note}` : ''}`;
        const prev = bapRow?.keteranganAdmin || '';
        const keteranganAdmin = prev ? `${prev} | ${terkonfirmasi}` : terkonfirmasi;

        await tx
          .update(presensi)
          .set({
            status: lowerStatus as 'sakit' | 'izin' | 'alpa' | 'terlambat',
            durasiMangkir: durasi,
            keteranganAdmin,
            resolvedBy: adminUserId,
            resolvedAt: new Date(),
          })
          .where(eq(presensi.id, absence.sumberId));
      } else if (absence.sumber === 'APEL' && absence.sumberId != null) {
        const [apelRow] = await tx
          .select({ verificationNote: presensiApel.verificationNote })
          .from(presensiApel)
          .where(eq(presensiApel.id, absence.sumberId));

        const terkonfirmasi = `[terkonfirmasi] ${lowerStatus}${note ? ` — ${note}` : ''}`;
        const prev = apelRow?.verificationNote || '';
        const verificationNote = prev ? `${prev} | ${terkonfirmasi}` : terkonfirmasi;

        await tx
          .update(presensiApel)
          .set({
            status: lowerStatus as 'sakit' | 'izin' | 'alpa' | 'terlambat',
            verifiedStatus: lowerStatus as 'sakit' | 'izin' | 'alpa' | 'terlambat',
            menitTerlambat: durasi,
            verificationNote,
            verifiedBy: adminUserId,
            verifiedAt: new Date(),
          })
          .where(eq(presensiApel.id, absence.sumberId));
      } else if (absence.sumber === 'PRAKTIKUM' && absence.sumberId != null) {
        const [prakRow] = await tx
          .select({ keteranganAdmin: presensiPraktikum.keteranganAdmin })
          .from(presensiPraktikum)
          .where(eq(presensiPraktikum.id, absence.sumberId));

        const terkonfirmasi = `[terkonfirmasi] ${lowerStatus}${note ? ` — ${note}` : ''}`;
        const prev = prakRow?.keteranganAdmin || '';
        const keteranganAdmin = prev ? `${prev} | ${terkonfirmasi}` : terkonfirmasi;

        await tx
          .update(presensiPraktikum)
          .set({
            status: lowerStatus as 'sakit' | 'izin' | 'alpa' | 'terlambat',
            durasiMangkir: durasi,
            keteranganAdmin,
            resolvedBy: adminUserId,
            resolvedAt: new Date(),
          })
          .where(eq(presensiPraktikum.id, absence.sumberId));
      }

      return updatedAbsence;
    });
  }

  static async getList(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const rows = await db
      .select({
        id: ketidakhadiranMahasiswa.id,
        mahasiswaId: ketidakhadiranMahasiswa.mahasiswaId,
        nim: mahasiswa.nim,
        nama: mahasiswa.nama,
        tanggal: ketidakhadiranMahasiswa.tanggal,
        sumber: ketidakhadiranMahasiswa.sumber,
        sumberId: ketidakhadiranMahasiswa.sumberId,
        status: ketidakhadiranMahasiswa.status,
        durasiMenit: ketidakhadiranMahasiswa.durasiMenit,
        keterangan: ketidakhadiranMahasiswa.keterangan,
        isVerified: ketidakhadiranMahasiswa.isVerified,
        verifiedBy: ketidakhadiranMahasiswa.verifiedBy,
        verifiedByName: users.nama,
        verifiedAt: ketidakhadiranMahasiswa.verifiedAt,
      })
      .from(ketidakhadiranMahasiswa)
      .innerJoin(mahasiswa, eq(ketidakhadiranMahasiswa.mahasiswaId, mahasiswa.id))
      .leftJoin(users, eq(ketidakhadiranMahasiswa.verifiedBy, users.id))
      .where(eq(ketidakhadiranMahasiswa.isVerified, false))
      .orderBy(ketidakhadiranMahasiswa.tanggal)
      .limit(limit)
      .offset(offset);

    return rows;
  }

  /**
   * Rekap ketidakhadiran per mahasiswa per hari (single source of truth untuk
   * kuota DURASI_HARIAN_MENIT). Dipakai modal verifikasi agar admin melihat
   * total terverifikasi & sisa kuota sebelum menyimpan.
   */
  static async getRekapHarian(mahasiswaId: number, tanggal: string) {
    const rows = await db
      .select({
        id: ketidakhadiranMahasiswa.id,
        mahasiswaId: ketidakhadiranMahasiswa.mahasiswaId,
        tanggal: ketidakhadiranMahasiswa.tanggal,
        sumber: ketidakhadiranMahasiswa.sumber,
        sumberId: ketidakhadiranMahasiswa.sumberId,
        status: ketidakhadiranMahasiswa.status,
        durasiMenit: ketidakhadiranMahasiswa.durasiMenit,
        keterangan: ketidakhadiranMahasiswa.keterangan,
        isVerified: ketidakhadiranMahasiswa.isVerified,
      })
      .from(ketidakhadiranMahasiswa)
      .where(and(eq(ketidakhadiranMahasiswa.mahasiswaId, mahasiswaId), eq(ketidakhadiranMahasiswa.tanggal, tanggal)))
      .orderBy(asc(ketidakhadiranMahasiswa.id));

    const totalTerverifikasi = rows
      .filter((r) => r.isVerified && STATUS_TERHITUNG_CAP.includes(r.status))
      .reduce((sum, r) => sum + Number(r.durasiMenit || 0), 0);
    const maksHarian = await SystemParameterService.getNumber('DURASI_HARIAN_MENIT');

    return {
      mahasiswaId,
      tanggal,
      maksHarian,
      totalTerverifikasi,
      sisaKuota: Math.max(maksHarian - totalTerverifikasi, 0),
      rows,
    };
  }
}

function isVerifiedByFkViolation(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const err = e as Record<string, unknown>;
  const msg = e instanceof Error ? e.message : String(e);
  const causeRaw = err.cause as unknown;
  const causeMsg =
    typeof causeRaw === 'string'
      ? causeRaw
      : causeRaw instanceof Error
        ? causeRaw.message
        : (causeRaw as Record<string, unknown> | undefined)?.message
          ? String((causeRaw as Record<string, unknown>).message)
          : '';
  const code =
    (causeRaw as Record<string, unknown> | undefined)?.code ??
    err.code ??
    (e as unknown as Record<string, unknown>)?.code;
  if (code === '23503') return true;
  const combined = `${msg} ${causeMsg}`.toLowerCase();
  return (
    combined.includes('ketidakhadiran_mahasiswa_verified_by_fkey') ||
    (combined.includes('violates foreign key') && combined.includes('verified_by'))
  );
}
