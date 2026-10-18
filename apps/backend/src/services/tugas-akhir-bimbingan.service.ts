import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import {
  bimbingan,
  dosen,
  mahasiswa,
  periodeAkademik,
  tugasAkhir,
  tugasAkhirAnggota,
  tugasAkhirLogbook,
  tugasAkhirPembimbing,
  tugasAkhirStatusLog,
  users,
} from '../models/schema';
import { db } from '../utils/db';
import { hasRole } from '../utils/role';
import type { UserPayload } from '../utils/types';

export interface CreateLogbookInput {
  dosenId?: number | null;
  pertemuanKe: number;
  tanggalBimbingan: string;
  topik: string;
  deskripsiKemajuan: string;
  kendala?: string | null;
  fileDraftUrl?: string | null;
}

export interface UpdateLogbookInput {
  dosenId?: number | null;
  pertemuanKe?: number;
  tanggalBimbingan?: string;
  topik?: string;
  deskripsiKemajuan?: string;
  kendala?: string | null;
  fileDraftUrl?: string | null;
}

export interface ReviewLogbookInput {
  statusBimbingan: 'disetujui' | 'perlu_revisi' | 'menunggu';
  catatanDosen?: string | null;
  fileRevisiUrl?: string | null;
}

export interface AccSidangInput {
  jenisSidang: 'proposal' | 'akhir';
  statusAcc: boolean;
  catatan?: string | null;
}

export class TugasAkhirBimbinganService {
  /**
   * Mengambil daftar logbook bimbingan untuk sebuah tugas akhir
   */
  static async getLogbooks(taId: number, user: UserPayload) {
    const [ta] = await db.select().from(tugasAkhir).where(eq(tugasAkhir.id, taId)).limit(1);
    if (!ta) throw new Error('Data tugas akhir tidak ditemukan.');

    // Verifikasi hak akses
    const isStaff = hasRole(user, ['super_admin', 'admin', 'prodi', 'kaprodi', 'lppm']);
    const isMhs = hasRole(user, ['mahasiswa']);
    const isDosen = hasRole(user, ['dosen']);

    if (isMhs) {
      const [mhs] = await db
        .select({ id: mahasiswa.id })
        .from(mahasiswa)
        .where(eq(mahasiswa.email, user.email.trim()))
        .limit(1);

      if (!mhs) throw new Error('Profil mahasiswa tidak ditemukan.');

      const [isAnggota] = await db
        .select()
        .from(tugasAkhirAnggota)
        .where(and(eq(tugasAkhirAnggota.tugasAkhirId, taId), eq(tugasAkhirAnggota.mahasiswaId, mhs.id)))
        .limit(1);

      if (!isAnggota && ta.createdById !== user.id) {
        throw new Error('Akses ditolak. Anda bukan anggota dari tugas akhir ini.');
      }
    } else if (!isStaff && isDosen) {
      const [dosenRow] = await db.select({ id: dosen.id }).from(dosen).where(eq(dosen.email, user.email)).limit(1);

      if (dosenRow) {
        const [isPembimbing] = await db
          .select()
          .from(tugasAkhirPembimbing)
          .where(and(eq(tugasAkhirPembimbing.tugasAkhirId, taId), eq(tugasAkhirPembimbing.dosenId, dosenRow.id)))
          .limit(1);

        if (!isPembimbing) {
          throw new Error('Akses ditolak. Anda bukan pembimbing dari tugas akhir ini.');
        }
      }
    }

    const rows = await db
      .select({
        id: tugasAkhirLogbook.id,
        tugasAkhirId: tugasAkhirLogbook.tugasAkhirId,
        mahasiswaId: tugasAkhirLogbook.mahasiswaId,
        dosenId: tugasAkhirLogbook.dosenId,
        pertemuanKe: tugasAkhirLogbook.pertemuanKe,
        tanggalBimbingan: tugasAkhirLogbook.tanggalBimbingan,
        topik: tugasAkhirLogbook.topik,
        deskripsiKemajuan: tugasAkhirLogbook.deskripsiKemajuan,
        kendala: tugasAkhirLogbook.kendala,
        catatanDosen: tugasAkhirLogbook.catatanDosen,
        statusBimbingan: tugasAkhirLogbook.statusBimbingan,
        fileDraftUrl: tugasAkhirLogbook.fileDraftUrl,
        fileRevisiUrl: tugasAkhirLogbook.fileRevisiUrl,
        statusBkd: tugasAkhirLogbook.statusBkd,
        createdAt: tugasAkhirLogbook.createdAt,
        updatedAt: tugasAkhirLogbook.updatedAt,
        mahasiswaNama: mahasiswa.nama,
        mahasiswaNim: mahasiswa.nim,
        dosenNama: dosen.nama,
        dosenNip: dosen.nip,
      })
      .from(tugasAkhirLogbook)
      .leftJoin(mahasiswa, eq(tugasAkhirLogbook.mahasiswaId, mahasiswa.id))
      .leftJoin(dosen, eq(tugasAkhirLogbook.dosenId, dosen.id))
      .where(eq(tugasAkhirLogbook.tugasAkhirId, taId))
      .orderBy(asc(tugasAkhirLogbook.pertemuanKe), asc(tugasAkhirLogbook.tanggalBimbingan));

    return rows;
  }

  /**
   * Menambahkan entri logbook bimbingan baru
   */
  static async createLogbook(taId: number, input: CreateLogbookInput, user: UserPayload) {
    const [ta] = await db.select().from(tugasAkhir).where(eq(tugasAkhir.id, taId)).limit(1);
    if (!ta) throw new Error('Data tugas akhir tidak ditemukan.');

    if (!['disetujui', 'bimbingan'].includes(ta.status)) {
      throw new Error('Logbook bimbingan hanya dapat dicatat setelah topik tugas akhir disetujui prodi.');
    }

    const isStaff = hasRole(user, ['super_admin', 'admin', 'prodi', 'kaprodi', 'lppm']);
    let pengisiMhsId: number | null = null;

    if (hasRole(user, ['mahasiswa'])) {
      const [mhs] = await db
        .select({ id: mahasiswa.id })
        .from(mahasiswa)
        .where(eq(mahasiswa.email, user.email.trim()))
        .limit(1);

      if (!mhs) throw new Error('Data profil mahasiswa tidak ditemukan.');
      pengisiMhsId = mhs.id;

      const [isAnggota] = await db
        .select()
        .from(tugasAkhirAnggota)
        .where(and(eq(tugasAkhirAnggota.tugasAkhirId, taId), eq(tugasAkhirAnggota.mahasiswaId, mhs.id)))
        .limit(1);

      if (!isAnggota && ta.createdById !== user.id) {
        throw new Error('Akses ditolak. Anda bukan anggota tugas akhir ini.');
      }
    } else if (isStaff) {
      // Ambil ketua TA sebagai default jika staf yang inputkan
      const [ketua] = await db
        .select({ mahasiswaId: tugasAkhirAnggota.mahasiswaId })
        .from(tugasAkhirAnggota)
        .where(and(eq(tugasAkhirAnggota.tugasAkhirId, taId), eq(tugasAkhirAnggota.peran, 'ketua')))
        .limit(1);
      pengisiMhsId = ketua?.mahasiswaId || null;
    }

    if (!pengisiMhsId) {
      throw new Error('Identitas mahasiswa pengisi logbook tidak valid.');
    }

    return await db.transaction(async (tx) => {
      // Jika status masih 'disetujui', naikkan ke 'bimbingan'
      if (ta.status === 'disetujui') {
        await tx.update(tugasAkhir).set({ status: 'bimbingan' }).where(eq(tugasAkhir.id, taId));
        await tx.insert(tugasAkhirStatusLog).values({
          tugasAkhirId: taId,
          dariStatus: 'disetujui',
          keStatus: 'bimbingan',
          alasan: 'Memulai sesi bimbingan logbook tugas akhir',
          olehUserId: user.id,
        });
      }

      const [newLogbook] = await tx
        .insert(tugasAkhirLogbook)
        .values({
          tugasAkhirId: taId,
          mahasiswaId: pengisiMhsId!,
          dosenId: input.dosenId || null,
          pertemuanKe: input.pertemuanKe,
          tanggalBimbingan: input.tanggalBimbingan,
          topik: input.topik.trim(),
          deskripsiKemajuan: input.deskripsiKemajuan.trim(),
          kendala: input.kendala?.trim() || null,
          fileDraftUrl: input.fileDraftUrl || null,
          statusBimbingan: 'menunggu',
          statusBkd: true,
        })
        .returning();

      return newLogbook;
    });
  }

  /**
   * Memperbarui entri logbook (oleh mahasiswa pengisi sebelum direview atau oleh staf)
   */
  static async updateLogbook(taId: number, logbookId: number, input: UpdateLogbookInput, user: UserPayload) {
    const [existing] = await db
      .select()
      .from(tugasAkhirLogbook)
      .where(and(eq(tugasAkhirLogbook.id, logbookId), eq(tugasAkhirLogbook.tugasAkhirId, taId)))
      .limit(1);

    if (!existing) throw new Error('Data logbook tidak ditemukan.');

    const isStaff = hasRole(user, ['super_admin', 'admin', 'prodi', 'kaprodi', 'lppm']);
    if (!isStaff && existing.statusBimbingan === 'disetujui') {
      throw new Error('Logbook yang telah disetujui dosen tidak dapat diubah.');
    }

    const [updated] = await db
      .update(tugasAkhirLogbook)
      .set({
        dosenId: input.dosenId !== undefined ? input.dosenId : existing.dosenId,
        pertemuanKe: input.pertemuanKe ?? existing.pertemuanKe,
        tanggalBimbingan: input.tanggalBimbingan ?? existing.tanggalBimbingan,
        topik: input.topik?.trim() ?? existing.topik,
        deskripsiKemajuan: input.deskripsiKemajuan?.trim() ?? existing.deskripsiKemajuan,
        kendala: input.kendala !== undefined ? input.kendala?.trim() : existing.kendala,
        fileDraftUrl: input.fileDraftUrl !== undefined ? input.fileDraftUrl : existing.fileDraftUrl,
      })
      .where(eq(tugasAkhirLogbook.id, logbookId))
      .returning();

    return updated;
  }

  /**
   * Menghapus logbook bimbingan
   */
  static async deleteLogbook(taId: number, logbookId: number, user: UserPayload) {
    const [existing] = await db
      .select()
      .from(tugasAkhirLogbook)
      .where(and(eq(tugasAkhirLogbook.id, logbookId), eq(tugasAkhirLogbook.tugasAkhirId, taId)))
      .limit(1);

    if (!existing) throw new Error('Data logbook tidak ditemukan.');

    const isStaff = hasRole(user, ['super_admin', 'admin', 'prodi', 'kaprodi', 'lppm']);
    if (!isStaff && existing.statusBimbingan === 'disetujui') {
      throw new Error('Logbook yang telah disetujui tidak dapat dihapus.');
    }

    await db.delete(tugasAkhirLogbook).where(eq(tugasAkhirLogbook.id, logbookId));
    return { success: true, message: 'Logbook bimbingan berhasil dihapus.' };
  }

  /**
   * Dosen mereview logbook bimbingan & otomatis sinkronisasi ke tabel BKD `bimbingan`
   */
  static async reviewLogbook(taId: number, logbookId: number, input: ReviewLogbookInput, user: UserPayload) {
    const [ta] = await db.select().from(tugasAkhir).where(eq(tugasAkhir.id, taId)).limit(1);
    if (!ta) throw new Error('Data tugas akhir tidak ditemukan.');

    const [logbookRow] = await db
      .select()
      .from(tugasAkhirLogbook)
      .where(and(eq(tugasAkhirLogbook.id, logbookId), eq(tugasAkhirLogbook.tugasAkhirId, taId)))
      .limit(1);

    if (!logbookRow) throw new Error('Data logbook bimbingan tidak ditemukan.');

    const isStaff = hasRole(user, ['super_admin', 'admin', 'prodi', 'kaprodi', 'lppm']);
    const isDosen = hasRole(user, ['dosen']);

    let reviewerDosenId: number | null = logbookRow.dosenId;

    if (!isStaff && isDosen) {
      const [dosenRow] = await db.select({ id: dosen.id }).from(dosen).where(eq(dosen.email, user.email)).limit(1);

      if (!dosenRow) throw new Error('Profil dosen tidak ditemukan.');

      const [isPembimbing] = await db
        .select()
        .from(tugasAkhirPembimbing)
        .where(and(eq(tugasAkhirPembimbing.tugasAkhirId, taId), eq(tugasAkhirPembimbing.dosenId, dosenRow.id)))
        .limit(1);

      if (!isPembimbing) {
        throw new Error('Akses ditolak. Anda bukan dosen pembimbing tugas akhir ini.');
      }
      reviewerDosenId = dosenRow.id;
    }

    return await db.transaction(async (tx) => {
      let bkdId = logbookRow.bimbinganId;

      // Jika disetujui dan belum ada sinkronisasi BKD, masukkan ke tabel `bimbingan` (kategori 'TA')
      if (input.statusBimbingan === 'disetujui' && reviewerDosenId) {
        let activePeriodeId = ta.periodeId;
        if (!activePeriodeId) {
          const [act] = await tx
            .select({ id: periodeAkademik.id })
            .from(periodeAkademik)
            .where(eq(periodeAkademik.aktif, true))
            .limit(1);
          activePeriodeId = act?.id || '20261';
        }

        if (bkdId) {
          await tx
            .update(bimbingan)
            .set({
              isApproved: true,
              topikBimbingan: logbookRow.topik,
              permasalahan: logbookRow.kendala || 'Sesi bimbingan tugas akhir',
              solusi: input.catatanDosen?.trim() || 'Disetujui pembimbing',
              tanggalBimbingan: logbookRow.tanggalBimbingan,
              statusBkd: true,
            })
            .where(eq(bimbingan.id, bkdId));
        } else {
          const [newBkd] = await tx
            .insert(bimbingan)
            .values({
              mahasiswaId: logbookRow.mahasiswaId,
              dosenId: reviewerDosenId,
              periodeId: activePeriodeId,
              kategori: 'TA',
              ringkasan: `Bimbingan TA (${ta.kodeTa}) Pertemuan ke-${logbookRow.pertemuanKe}`,
              topikBimbingan: logbookRow.topik,
              permasalahan: logbookRow.kendala || 'Progres tugas akhir',
              solusi: input.catatanDosen?.trim() || 'Disetujui pembimbing',
              tanggalBimbingan: logbookRow.tanggalBimbingan,
              isApproved: true,
              statusBkd: true,
            })
            .returning();
          bkdId = newBkd.id;
        }
      }

      const [updated] = await tx
        .update(tugasAkhirLogbook)
        .set({
          dosenId: reviewerDosenId || logbookRow.dosenId,
          statusBimbingan: input.statusBimbingan,
          catatanDosen: input.catatanDosen !== undefined ? input.catatanDosen?.trim() : logbookRow.catatanDosen,
          fileRevisiUrl: input.fileRevisiUrl !== undefined ? input.fileRevisiUrl : logbookRow.fileRevisiUrl,
          bimbinganId: bkdId,
        })
        .where(eq(tugasAkhirLogbook.id, logbookId))
        .returning();

      return updated;
    });
  }

  /**
   * Dosen Pembimbing memberikan ACC Kelayakan Sidang (Proposal atau Akhir)
   */
  static async berikanAccSidang(taId: number, input: AccSidangInput, user: UserPayload) {
    const [ta] = await db.select().from(tugasAkhir).where(eq(tugasAkhir.id, taId)).limit(1);
    if (!ta) throw new Error('Data tugas akhir tidak ditemukan.');

    const isStaff = hasRole(user, ['super_admin', 'admin', 'prodi', 'kaprodi', 'lppm']);
    const isDosen = hasRole(user, ['dosen']);

    if (!isStaff && !isDosen) {
      throw new Error('Akses ditolak. Hanya dosen pembimbing atau pengelola prodi yang berwenang memberikan ACC.');
    }

    let targetPembimbingId: number | null = null;

    if (!isStaff && isDosen) {
      const [dosenRow] = await db.select({ id: dosen.id }).from(dosen).where(eq(dosen.email, user.email)).limit(1);

      if (!dosenRow) throw new Error('Data profil dosen tidak ditemukan.');

      const [p] = await db
        .select()
        .from(tugasAkhirPembimbing)
        .where(and(eq(tugasAkhirPembimbing.tugasAkhirId, taId), eq(tugasAkhirPembimbing.dosenId, dosenRow.id)))
        .limit(1);

      if (!p) throw new Error('Anda tidak terdaftar sebagai dosen pembimbing pada tugas akhir ini.');
      targetPembimbingId = p.id;
    }

    return await db.transaction(async (tx) => {
      const now = new Date();

      if (targetPembimbingId) {
        // Update specific pembimbing
        if (input.jenisSidang === 'proposal') {
          await tx
            .update(tugasAkhirPembimbing)
            .set({
              accSidangProposal: input.statusAcc,
              accSidangProposalAt: input.statusAcc ? now : null,
              catatan: input.catatan?.trim() || null,
            })
            .where(eq(tugasAkhirPembimbing.id, targetPembimbingId));
        } else {
          await tx
            .update(tugasAkhirPembimbing)
            .set({
              accSidangAkhir: input.statusAcc,
              accSidangAkhirAt: input.statusAcc ? now : null,
              catatan: input.catatan?.trim() || null,
            })
            .where(eq(tugasAkhirPembimbing.id, targetPembimbingId));
        }
      } else if (isStaff) {
        // Staff override: update semua pembimbing
        if (input.jenisSidang === 'proposal') {
          await tx
            .update(tugasAkhirPembimbing)
            .set({
              accSidangProposal: input.statusAcc,
              accSidangProposalAt: input.statusAcc ? now : null,
              catatan: input.catatan?.trim() || 'ACC Sidang Proposal oleh Pengelola Prodi',
            })
            .where(eq(tugasAkhirPembimbing.tugasAkhirId, taId));
        } else {
          await tx
            .update(tugasAkhirPembimbing)
            .set({
              accSidangAkhir: input.statusAcc,
              accSidangAkhirAt: input.statusAcc ? now : null,
              catatan: input.catatan?.trim() || 'ACC Sidang Akhir oleh Pengelola Prodi',
            })
            .where(eq(tugasAkhirPembimbing.tugasAkhirId, taId));
        }
      }

      // Ambil status terkini seluruh pembimbing
      const allPembimbing = await tx
        .select()
        .from(tugasAkhirPembimbing)
        .where(eq(tugasAkhirPembimbing.tugasAkhirId, taId));

      return {
        message: `Status ACC ${input.jenisSidang === 'proposal' ? 'Sidang Proposal' : 'Sidang Akhir'} berhasil diperbarui.`,
        pembimbing: allPembimbing,
      };
    });
  }
}
