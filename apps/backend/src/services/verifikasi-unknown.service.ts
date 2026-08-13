import { and, eq, sql } from 'drizzle-orm';
import {
  bap,
  kelasKuliah,
  ketidakhadiranMahasiswa,
  mahasiswa,
  mataKuliah,
  presensi,
  presensiApel,
  sesiApel,
  users,
} from '../models/schema';
import { db } from '../utils/db';
import { SystemParameterService } from './system-parameter.service';

export type KetidakhadiranSumber = 'BAP' | 'APEL' | 'MANUAL';
export type KetidakhadiranStatusKonfirmasi = 'SAKIT' | 'IZIN' | 'ALPA' | 'HADIR';

const STATUS_KONFIRMASI: KetidakhadiranStatusKonfirmasi[] = ['SAKIT', 'IZIN', 'ALPA', 'HADIR'];

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
      throw new Error('Status konfirmasi harus SAKIT, IZIN, ALPA, atau HADIR');
    }

    return await db.transaction(async (tx) => {
      const [absence] = await tx
        .select()
        .from(ketidakhadiranMahasiswa)
        .where(
          and(eq(ketidakhadiranMahasiswa.sumber, input.sumber), eq(ketidakhadiranMahasiswa.sumberId, input.sumberId)),
        );

      if (!absence) {
        throw new Error('Data ketidakhadiran tidak ditemukan');
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

      // HADIR = mahasiswa ternyata hadir -> bukan ketidakhadiran. Hapus baris terpusat
      // dan tandai sumber asal sebagai hadir agar tidak masuk rekap kompensasi.
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
              resolvedBy: input.adminUserId,
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
              verifiedBy: input.adminUserId,
              verifiedAt: new Date(),
            })
            .where(eq(presensiApel.id, absence.sumberId));
        }

        await tx.delete(ketidakhadiranMahasiswa).where(eq(ketidakhadiranMahasiswa.id, absence.id));
        return { ...absence, status: 'HADIR', isVerified: true, durasiMenit: 0, verifiedBy: input.adminUserId };
      }

      if (durasi > 0) {
        const maksHarian = await SystemParameterService.getNumber('DURASI_HARIAN_MENIT');
        const [totalRow] = await tx
          .select({ total: sql<number>`COALESCE(SUM(${ketidakhadiranMahasiswa.durasiMenit}), 0)` })
          .from(ketidakhadiranMahasiswa)
          .where(
            and(
              eq(ketidakhadiranMahasiswa.mahasiswaId, absence.mahasiswaId),
              eq(ketidakhadiranMahasiswa.tanggal, absence.tanggal),
              sql`${ketidakhadiranMahasiswa.id} != ${absence.id}`,
            ),
          );
        const totalHariIni = Number(totalRow?.total || 0);
        if (totalHariIni + durasi > maksHarian) {
          throw new Error(
            `Total durasi ketidakhadiran pada tanggal ${absence.tanggal} akan melebihi batas ${maksHarian} menit/hari.`,
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
          verifiedBy: input.adminUserId,
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
            status: lowerStatus as 'sakit' | 'izin' | 'alpa',
            durasiMangkir: durasi,
            keteranganAdmin,
            resolvedBy: input.adminUserId,
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
            status: lowerStatus as 'sakit' | 'izin' | 'alpa',
            verifiedStatus: lowerStatus as 'sakit' | 'izin' | 'alpa',
            menitTerlambat: durasi,
            verificationNote,
            verifiedBy: input.adminUserId,
            verifiedAt: new Date(),
          })
          .where(eq(presensiApel.id, absence.sumberId));
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
      .where(eq(ketidakhadiranMahasiswa.status, 'UNKNOWN'))
      .orderBy(ketidakhadiranMahasiswa.tanggal)
      .limit(limit)
      .offset(offset);

    return rows;
  }
}
