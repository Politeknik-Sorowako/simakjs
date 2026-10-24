import { and, desc, eq } from 'drizzle-orm';
import {
  mahasiswa,
  pelanggaran,
  pelanggaranTindakLanjut,
  pelanggaranTindakLanjutPersetujuan,
  programStudi,
  users,
} from '../models/schema';
import { db } from '../utils/db';
import type { UserPayload, UserRole } from '../utils/types';
import { NotificationService } from './notification.service';
import { PelanggaranService } from './pelanggaran.service';
import { SystemParameterService } from './system-parameter.service';

export type TingkatTindakLanjut = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4';

export interface BpaTindakLanjutConfig {
  spNotifAdminEnabled: boolean;
  lv1SemesterT: number; // default 1
  lv2SemesterT: number; // default 2
  lv2AkumulasiT: number; // default 5
  lv3SemesterT: number; // default 3
  lv3AkumulasiTList: number[]; // default [6, 8]
  lv4SemesterT: number; // default 4
  lv4AkumulasiTList: number[]; // default [7, 9]
}

export interface KasusBaruEvaluasi {
  tingkat: TingkatTindakLanjut;
  pemicuTipe: 'SEMESTER' | 'AKUMULASI';
  pemicuTNilai: number;
}

/**
 * Pure function: mengevaluasi level kasus tindak lanjut yang harus dibuat
 * berdasarkan T semester dan T akumulasi mahasiswa.
 */
export function hitungKasusTindakLanjut(
  tSemester: number,
  tAkumulasi: number,
  config: BpaTindakLanjutConfig,
): KasusBaruEvaluasi[] {
  const result: KasusBaruEvaluasi[] = [];

  // Level 1: T1 semester (Coaching MHS, persetujuan Kaprodi)
  if (tSemester >= config.lv1SemesterT) {
    result.push({
      tingkat: 'LEVEL_1',
      pemicuTipe: 'SEMESTER',
      pemicuTNilai: config.lv1SemesterT,
    });
  }

  // Level 2: T2 semester ATAU T5 akumulasi (Coaching MHS, Kaprodi, Wadir 1, Wadir 3 + Pemanggilan Ortu)
  if (tSemester >= config.lv2SemesterT) {
    result.push({
      tingkat: 'LEVEL_2',
      pemicuTipe: 'SEMESTER',
      pemicuTNilai: config.lv2SemesterT,
    });
  } else if (tAkumulasi >= config.lv2AkumulasiT) {
    result.push({
      tingkat: 'LEVEL_2',
      pemicuTipe: 'AKUMULASI',
      pemicuTNilai: config.lv2AkumulasiT,
    });
  }

  // Level 3: T3 semester ATAU T6/T8 akumulasi (Coaching MHS, Kaprodi, Wadir 1, Wadir 3, Direktur)
  if (tSemester >= config.lv3SemesterT) {
    result.push({
      tingkat: 'LEVEL_3',
      pemicuTipe: 'SEMESTER',
      pemicuTNilai: config.lv3SemesterT,
    });
  } else {
    for (const t of config.lv3AkumulasiTList) {
      if (tAkumulasi >= t) {
        result.push({
          tingkat: 'LEVEL_3',
          pemicuTipe: 'AKUMULASI',
          pemicuTNilai: t,
        });
      }
    }
  }

  // Level 4: T4 semester ATAU T7/T9 akumulasi (Coaching MHS, Kaprodi, Wadir 1, Wadir 3, Direktur + Sidang Komisi)
  if (tSemester >= config.lv4SemesterT) {
    result.push({
      tingkat: 'LEVEL_4',
      pemicuTipe: 'SEMESTER',
      pemicuTNilai: config.lv4SemesterT,
    });
  } else {
    for (const t of config.lv4AkumulasiTList) {
      if (tAkumulasi >= t) {
        result.push({
          tingkat: 'LEVEL_4',
          pemicuTipe: 'AKUMULASI',
          pemicuTNilai: t,
        });
      }
    }
  }

  // Urutkan hasil agar berurutan berdasarkan pemicuTNilai ascending
  result.sort((a, b) => a.pemicuTNilai - b.pemicuTNilai);

  return result;
}

export class PelanggaranTindakLanjutService {
  /**
   * Mengambil konfigurasi dinamis parameter BPA dari SystemParameterService
   */
  static async getConfig(): Promise<BpaTindakLanjutConfig> {
    const notifAdmin = await SystemParameterService.getBoolean('SP_NOTIF_ADMIN_ENABLED');
    const lv1SemT = await SystemParameterService.getNumber('SP_LV1_SEMESTER_T');
    const lv2SemT = await SystemParameterService.getNumber('SP_LV2_SEMESTER_T');
    const lv2AkumT = await SystemParameterService.getNumber('SP_LV2_AKUMULASI_T');
    const lv3SemT = await SystemParameterService.getNumber('SP_LV3_SEMESTER_T');
    const lv3AkumRaw = (await SystemParameterService.getRaw('SP_LV3_AKUMULASI_T_LIST')) || '6,8';
    const lv4SemT = await SystemParameterService.getNumber('SP_LV4_SEMESTER_T');
    const lv4AkumRaw = (await SystemParameterService.getRaw('SP_LV4_AKUMULASI_T_LIST')) || '7,9';

    const parseList = (raw: string): number[] =>
      raw
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n > 0);

    return {
      spNotifAdminEnabled: notifAdmin,
      lv1SemesterT: lv1SemT || 1,
      lv2SemesterT: lv2SemT || 2,
      lv2AkumulasiT: lv2AkumT || 5,
      lv3SemesterT: lv3SemT || 3,
      lv3AkumulasiTList: parseList(lv3AkumRaw),
      lv4SemesterT: lv4SemT || 4,
      lv4AkumulasiTList: parseList(lv4AkumRaw),
    };
  }

  /**
   * Evaluasi eskalasi otomatis setelah pelanggaran dicatat.
   * Dipanggil dari PelanggaranService saat ada record baru.
   */
  static async evaluasiEskalasi(mahasiswaId: number, periodeId: string): Promise<number[]> {
    const [mhs] = await db
      .select({
        id: mahasiswa.id,
        nim: mahasiswa.nim,
        nama: mahasiswa.nama,
        programStudiId: mahasiswa.programStudiId,
      })
      .from(mahasiswa)
      .where(eq(mahasiswa.id, mahasiswaId));

    if (!mhs) return [];

    const mhsDetail = await PelanggaranService.getPelanggaranByMahasiswa(mahasiswaId);
    if (!mhsDetail) return [];

    const totalPoinAkumulasi = mhsDetail.totalPoin || 0;
    const tAkumulasi = Math.floor(totalPoinAkumulasi / 4);

    const semItem = mhsDetail.rekapPerSemester?.find((r) => r.periodeId === periodeId);
    const poinSemester = semItem?.poin || 0;
    const tSemester = Math.floor(poinSemester / 4);

    const config = await PelanggaranTindakLanjutService.getConfig();
    const kasusKandidat = hitungKasusTindakLanjut(tSemester, tAkumulasi, config);

    const createdIds: number[] = [];

    for (const kasus of kasusKandidat) {
      try {
        const [inserted] = await db
          .insert(pelanggaranTindakLanjut)
          .values({
            mahasiswaId,
            periodeId,
            tingkat: kasus.tingkat,
            pemicuTipe: kasus.pemicuTipe,
            pemicuTNilai: kasus.pemicuTNilai,
            status: 'MENUNGGU_FORM',
          })
          .onConflictDoNothing()
          .returning();

        if (inserted) {
          createdIds.push(inserted.id);

          // Notifikasi lonceng ke bagian Kemahasiswaan & Kaprodi untuk pengisian form & tindak lanjut
          const labelTingkat =
            kasus.tingkat === 'LEVEL_1'
              ? 'Level 1 (Coaching Mahasiswa)'
              : kasus.tingkat === 'LEVEL_2'
                ? 'Level 2 (Coaching & Pemanggilan Orang Tua)'
                : kasus.tingkat === 'LEVEL_3'
                  ? 'Level 3 (Coaching Pimpinan Direktur)'
                  : 'Level 4 (Sidang Komisi Disiplin)';

          const title = `Eskalasi Kasus Tindak Lanjut: ${labelTingkat}`;
          const message = `Mahasiswa ${mhs.nama} (${mhs.nim}) telah mencapai ambang ${kasus.pemicuTipe.toLowerCase()} T${kasus.pemicuTNilai}. Kasus ${labelTingkat} telah dibuat dan memerlukan pengisian form pembinaan.`;
          const link = `/pelanggaran/tindak-lanjut?id=${inserted.id}`;

          // Ambil ID user Kemahasiswaan dan Kaprodi terkait
          const staffIds = await NotificationService.resolveUserIdsByRoles(['kemahasiswaan', 'kaprodi'], {
            programStudiId: mhs.programStudiId,
          });

          await NotificationService.notify(staffIds, { title, message, link });
        }
      } catch (err: unknown) {
        console.error('[PelanggaranTindakLanjutService] Error inserting kasus:', err);
      }
    }

    return createdIds;
  }

  /**
   * Mengambil daftar kasus tindak lanjut dengan filter role & pagination
   */
  static async list(
    user: UserPayload,
    params: {
      status?: string;
      tingkat?: string;
      periodeId?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    // Base query
    const baseQuery = db
      .select({
        id: pelanggaranTindakLanjut.id,
        mahasiswaId: pelanggaranTindakLanjut.mahasiswaId,
        nim: mahasiswa.nim,
        namaMahasiswa: mahasiswa.nama,
        prodiNama: programStudi.nama,
        programStudiId: mahasiswa.programStudiId,
        periodeId: pelanggaranTindakLanjut.periodeId,
        tingkat: pelanggaranTindakLanjut.tingkat,
        pemicuTipe: pelanggaranTindakLanjut.pemicuTipe,
        pemicuTNilai: pelanggaranTindakLanjut.pemicuTNilai,
        status: pelanggaranTindakLanjut.status,
        formDiisiAt: pelanggaranTindakLanjut.formDiisiAt,
        createdAt: pelanggaranTindakLanjut.createdAt,
      })
      .from(pelanggaranTindakLanjut)
      .innerJoin(mahasiswa, eq(pelanggaranTindakLanjut.mahasiswaId, mahasiswa.id))
      .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id));

    // Scoping jika kaprodi / prodi non-global
    const isGlobal =
      user.role === 'admin' ||
      user.role === 'super_admin' ||
      user.role === 'direktur' ||
      user.role === 'wadir1' ||
      user.role === 'wadir3' ||
      user.role === 'kemahasiswaan';

    // Fetch items
    const rows = await baseQuery.orderBy(desc(pelanggaranTindakLanjut.createdAt)).limit(limit).offset(offset);

    return {
      data: rows,
      page,
      limit,
    };
  }

  /**
   * Mengambil detail lengkap kasus tindak lanjut beserta daftar persetujuannya
   */
  static async getById(user: UserPayload, id: number) {
    const [row] = await db
      .select({
        id: pelanggaranTindakLanjut.id,
        mahasiswaId: pelanggaranTindakLanjut.mahasiswaId,
        nim: mahasiswa.nim,
        namaMahasiswa: mahasiswa.nama,
        prodiNama: programStudi.nama,
        programStudiId: mahasiswa.programStudiId,
        periodeId: pelanggaranTindakLanjut.periodeId,
        tingkat: pelanggaranTindakLanjut.tingkat,
        pemicuTipe: pelanggaranTindakLanjut.pemicuTipe,
        pemicuTNilai: pelanggaranTindakLanjut.pemicuTNilai,
        status: pelanggaranTindakLanjut.status,
        formCoaching: pelanggaranTindakLanjut.formCoaching,
        suratPemanggilanOrtu: pelanggaranTindakLanjut.suratPemanggilanOrtu,
        beritaAcaraSidang: pelanggaranTindakLanjut.beritaAcaraSidang,
        formDiisiOleh: pelanggaranTindakLanjut.formDiisiOleh,
        formDiisiAt: pelanggaranTindakLanjut.formDiisiAt,
        alasanBatal: pelanggaranTindakLanjut.alasanBatal,
        createdAt: pelanggaranTindakLanjut.createdAt,
        updatedAt: pelanggaranTindakLanjut.updatedAt,
      })
      .from(pelanggaranTindakLanjut)
      .innerJoin(mahasiswa, eq(pelanggaranTindakLanjut.mahasiswaId, mahasiswa.id))
      .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id))
      .where(eq(pelanggaranTindakLanjut.id, id));

    if (!row) {
      throw new Error('Data kasus tindak lanjut tidak ditemukan.');
    }

    // Ambil daftar persetujuan berurutan
    const persetujuan = await db
      .select()
      .from(pelanggaranTindakLanjutPersetujuan)
      .where(eq(pelanggaranTindakLanjutPersetujuan.tindakLanjutId, id))
      .orderBy(pelanggaranTindakLanjutPersetujuan.urutan);

    return {
      ...row,
      persetujuanList: persetujuan,
    };
  }

  /**
   * Submit/simpan form pembinaan (Coaching, Pemanggilan Ortu, Sidang Komdis).
   * Dilakukan oleh Kemahasiswaan / Admin / Kaprodi.
   */
  static async submitForm(
    user: UserPayload,
    id: number,
    data: {
      formCoaching?: Record<string, unknown>;
      suratPemanggilanOrtu?: Record<string, unknown>;
      beritaAcaraSidang?: Record<string, unknown>;
    },
  ) {
    const [row] = await db.select().from(pelanggaranTindakLanjut).where(eq(pelanggaranTindakLanjut.id, id));
    if (!row) throw new Error('Kasus tidak ditemukan.');

    if (row.status === 'SELESAI' || row.status === 'DIBATALKAN') {
      throw new Error(`Tidak dapat mengubah form pada kasus berstatus ${row.status}.`);
    }

    // Tentukan approvers sesuai tingkat kasus
    let approverRoles: UserRole[] = [];
    if (row.tingkat === 'LEVEL_1') {
      approverRoles = ['kaprodi'];
    } else if (row.tingkat === 'LEVEL_2') {
      approverRoles = ['kaprodi', 'wadir1', 'wadir3'];
    } else if (row.tingkat === 'LEVEL_3' || row.tingkat === 'LEVEL_4') {
      approverRoles = ['kaprodi', 'wadir1', 'wadir3', 'direktur'];
    }

    await db.transaction(async (tx) => {
      // Update form data dan ubah status ke MENUNGGU_PERSETUJUAN
      await tx
        .update(pelanggaranTindakLanjut)
        .set({
          formCoaching: data.formCoaching ?? row.formCoaching,
          suratPemanggilanOrtu: data.suratPemanggilanOrtu ?? row.suratPemanggilanOrtu,
          beritaAcaraSidang: data.beritaAcaraSidang ?? row.beritaAcaraSidang,
          formDiisiOleh: user.id,
          formDiisiAt: new Date(),
          status: 'MENUNGGU_PERSETUJUAN',
        })
        .where(eq(pelanggaranTindakLanjut.id, id));

      // Reset / Buat baris persetujuan berurutan
      await tx
        .delete(pelanggaranTindakLanjutPersetujuan)
        .where(eq(pelanggaranTindakLanjutPersetujuan.tindakLanjutId, id));

      for (let i = 0; i < approverRoles.length; i++) {
        await tx.insert(pelanggaranTindakLanjutPersetujuan).values({
          tindakLanjutId: id,
          approverRole: approverRoles[i],
          urutan: i + 1,
          status: 'MENUNGGU',
        });
      }
    });

    // Notifikasi ke approver pertama (Kaprodi)
    const [mhs] = await db
      .select({ programStudiId: mahasiswa.programStudiId, nama: mahasiswa.nama })
      .from(mahasiswa)
      .where(eq(mahasiswa.id, row.mahasiswaId));

    const firstApproverRole = approverRoles[0];
    const candidateApprovers = await NotificationService.resolveUserIdsByRoles([firstApproverRole], {
      programStudiId: mhs?.programStudiId,
    });

    await NotificationService.notify(candidateApprovers, {
      title: 'Persetujuan Tindak Lanjut Diperlukan',
      message: `Formulir tindak lanjut ${row.tingkat} untuk mahasiswa ${mhs?.nama || ''} telah disubmit dan menunggu persetujuan Anda.`,
      link: `/pelanggaran/tindak-lanjut?id=${id}`,
    });

    return { message: 'Form berhasil disimpan dan diajukan untuk persetujuan.' };
  }

  /**
   * Memberikan persetujuan (TTE atau MANUAL) pada urutan approver aktif.
   */
  static async approve(
    user: UserPayload,
    id: number,
    input: {
      metode: 'TTE' | 'MANUAL';
      catatan?: string;
      signatureUuid?: string;
      dokumenScanUrl?: string;
    },
  ) {
    const [row] = await db.select().from(pelanggaranTindakLanjut).where(eq(pelanggaranTindakLanjut.id, id));
    if (!row) throw new Error('Kasus tidak ditemukan.');
    if (row.status !== 'MENUNGGU_PERSETUJUAN') {
      throw new Error(`Kasus tidak dalam status menunggu persetujuan (status saat ini: ${row.status}).`);
    }

    const persetujuanList = await db
      .select()
      .from(pelanggaranTindakLanjutPersetujuan)
      .where(eq(pelanggaranTindakLanjutPersetujuan.tindakLanjutId, id))
      .orderBy(pelanggaranTindakLanjutPersetujuan.urutan);

    // Cari urutan pertama yang masih 'MENUNGGU'
    const activeStep = persetujuanList.find((p) => p.status === 'MENUNGGU');
    if (!activeStep) {
      throw new Error('Semua tahapan persetujuan telah selesai.');
    }

    // Validasi apakah user memiliki role yang cocok dengan activeStep.approverRole
    const userRolesList = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role];
    const hasActiveRole =
      userRolesList.includes(activeStep.approverRole as UserRole) ||
      user.role === 'admin' ||
      user.role === 'super_admin';
    if (!hasActiveRole) {
      throw new Error(`Akses ditolak. Tahap ini memerlukan peran ${activeStep.approverRole}.`);
    }

    let isFinalStep = false;

    await db.transaction(async (tx) => {
      // Update persetujuan step aktif
      await tx
        .update(pelanggaranTindakLanjutPersetujuan)
        .set({
          status: 'DISETUJUI',
          metode: input.metode,
          approverUserId: user.id,
          approverNama: user.nama,
          catatan: input.catatan || null,
          signatureUuid: input.signatureUuid || null,
          dokumenScanUrl: input.dokumenScanUrl || null,
          decidedAt: new Date(),
        })
        .where(eq(pelanggaranTindakLanjutPersetujuan.id, activeStep.id));

      // Cek apakah ini approver terakhir
      const remaining = persetujuanList.filter((p) => p.id !== activeStep.id && p.status === 'MENUNGGU');
      if (remaining.length === 0) {
        isFinalStep = true;
        await tx.update(pelanggaranTindakLanjut).set({ status: 'SELESAI' }).where(eq(pelanggaranTindakLanjut.id, id));
      }
    });

    if (isFinalStep) {
      // Notifikasi ke Kemahasiswaan & Dosen PA bahwa tindak lanjut selesai
      const [mhs] = await db
        .select({ dosenPaId: mahasiswa.dosenPaId, nama: mahasiswa.nama })
        .from(mahasiswa)
        .where(eq(mahasiswa.id, row.mahasiswaId));

      const kemhsUsers = await NotificationService.resolveUserIdsByRoles(['kemahasiswaan']);
      const paUserId = await NotificationService.resolveDosenPaUserId(mhs?.dosenPaId ?? null);
      const recipientIds = new Set(kemhsUsers);
      if (paUserId) recipientIds.add(paUserId);

      await NotificationService.notify(recipientIds, {
        title: 'Tindak Lanjut Pelanggaran Selesai',
        message: `Seluruh rangkaian persetujuan tindak lanjut ${row.tingkat} untuk mahasiswa ${mhs?.nama || ''} telah lengkap dan disetujui.`,
        link: `/pelanggaran/tindak-lanjut?id=${id}`,
      });
    } else {
      // Notifikasi ke approver urutan berikutnya
      const nextStep = persetujuanList.find((p) => p.urutan === activeStep.urutan + 1);
      if (nextStep) {
        const nextApprovers = await NotificationService.resolveUserIdsByRoles([nextStep.approverRole as UserRole]);
        await NotificationService.notify(nextApprovers, {
          title: 'Persetujuan Tindak Lanjut Diperlukan',
          message: `Kasus tindak lanjut ${row.tingkat} telah disetujui oleh ${user.nama} (${activeStep.approverRole}) dan sekarang menunggu persetujuan Anda.`,
          link: `/pelanggaran/tindak-lanjut?id=${id}`,
        });
      }
    }

    return { message: 'Persetujuan berhasil disimpan.' };
  }

  /**
   * Menolak atau meminta revisi kasus pembinaan.
   */
  static async reject(user: UserPayload, id: number, catatan: string) {
    const [row] = await db.select().from(pelanggaranTindakLanjut).where(eq(pelanggaranTindakLanjut.id, id));
    if (!row) throw new Error('Kasus tidak ditemukan.');

    await db.transaction(async (tx) => {
      await tx.update(pelanggaranTindakLanjut).set({ status: 'REVISI' }).where(eq(pelanggaranTindakLanjut.id, id));

      await tx
        .update(pelanggaranTindakLanjutPersetujuan)
        .set({
          status: 'DITOLAK',
          catatan,
          approverUserId: user.id,
          approverNama: user.nama,
          decidedAt: new Date(),
        })
        .where(
          and(
            eq(pelanggaranTindakLanjutPersetujuan.tindakLanjutId, id),
            eq(pelanggaranTindakLanjutPersetujuan.status, 'MENUNGGU'),
          ),
        );
    });

    // Notifikasi ke pengisi form terdahulu
    if (row.formDiisiOleh) {
      await NotificationService.notify([row.formDiisiOleh], {
        title: 'Revisi Diperlukan: Tindak Lanjut Pelanggaran',
        message: `Pengajuan tindak lanjut ${row.tingkat} dikembalikan oleh ${user.nama} dengan catatan: "${catatan}". Silakan lakukan perbaikan.`,
        link: `/pelanggaran/tindak-lanjut?id=${id}`,
      });
    }

    return { message: 'Pengajuan telah dikembalikan untuk revisi.' };
  }

  /**
   * Membatalkan kasus tindak lanjut secara manual oleh Admin/Kemahasiswaan
   */
  static async batal(user: UserPayload, id: number, alasan: string) {
    const [row] = await db.select().from(pelanggaranTindakLanjut).where(eq(pelanggaranTindakLanjut.id, id));
    if (!row) throw new Error('Kasus tidak ditemukan.');

    await db
      .update(pelanggaranTindakLanjut)
      .set({
        status: 'DIBATALKAN',
        alasanBatal: alasan,
      })
      .where(eq(pelanggaranTindakLanjut.id, id));

    return { message: 'Kasus berhasil dibatalkan.' };
  }
}
