import { and, asc, count, desc, eq, ilike, inArray, or, type SQL } from 'drizzle-orm';
import {
  dosen,
  mahasiswa,
  pembimbingMahasiswa,
  periodeAkademik,
  programStudi,
  tugasAkhir,
  tugasAkhirAnggota,
  tugasAkhirPembimbing,
  tugasAkhirStatusLog,
  users,
} from '../models/schema';
import { db } from '../utils/db';
import { hasRole } from '../utils/role';
import type { UserPayload } from '../utils/types';

export interface UsulanPembimbingInput {
  peran: 'pembimbing_1' | 'pembimbing_2';
  dosenId?: number;
  namaEksternal?: string;
  instansiEksternal?: string;
  catatan?: string;
}

export interface CreateTugasAkhirInput {
  judul: string;
  judulInggris?: string | null;
  tipe: 'individu' | 'kelompok';
  jenisKarya: 'skripsi' | 'prototipe' | 'proyek_rekayasa' | 'rancang_bangun';
  bidangKajian?: string | null;
  latarBelakang?: string | null;
  rumusanMasalah?: string | null;
  tujuan?: string | null;
  metodologi?: string | null;
  mitraIndustri?: string | null;
  programStudiId?: number | null;
  periodeId?: string | null;
  fileProposalTopikUrl?: string | null;
  mahasiswaId?: number | null;
  anggotaMahasiswaIds?: number[] | null;
  usulanPembimbing?: UsulanPembimbingInput[] | null;
}

export interface UpdateTugasAkhirInput {
  judul?: string | null;
  judulInggris?: string | null;
  tipe?: 'individu' | 'kelompok';
  jenisKarya?: 'skripsi' | 'prototipe' | 'proyek_rekayasa' | 'rancang_bangun';
  bidangKajian?: string | null;
  latarBelakang?: string | null;
  rumusanMasalah?: string | null;
  tujuan?: string | null;
  metodologi?: string | null;
  mitraIndustri?: string | null;
  fileProposalTopikUrl?: string | null;
  mahasiswaId?: number | null;
  anggotaMahasiswaIds?: number[] | null;
  programStudiId?: number | null;
  usulanPembimbing?: UsulanPembimbingInput[] | null;
}

export interface ReviewTopikInput {
  status: 'disetujui' | 'ditolak' | 'revisi_proposal_topik';
  catatanProdi?: string;
  pembimbing?: UsulanPembimbingInput[];
}

export interface TugasAkhirFilter {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  programStudiId?: number;
  periodeId?: string;
  tipe?: string;
  dosenId?: number;
}

export class TugasAkhirService {
  private static async generateKodeTa(programStudiId: number): Promise<string> {
    const year = new Date().getFullYear();
    const [prodiRow] = await db
      .select({ kode: programStudi.kode })
      .from(programStudi)
      .where(eq(programStudi.id, programStudiId))
      .limit(1);
    const prodiKode = prodiRow?.kode || 'PRODI';

    const [countResult] = await db
      .select({ val: count() })
      .from(tugasAkhir)
      .where(eq(tugasAkhir.programStudiId, programStudiId));

    const seq = Number(countResult?.val || 0) + 1;
    const padded = String(seq).padStart(3, '0');
    return `TA-${year}-${prodiKode}-${padded}`;
  }

  static async create(input: CreateTugasAkhirInput, user: UserPayload) {
    let ketuaMhsId: number | null = null;
    let mhsProdiId: number | null = null;
    const isMhs = hasRole(user, ['mahasiswa']);

    if (isMhs) {
      const [mhsRow] = await db
        .select({ id: mahasiswa.id, programStudiId: mahasiswa.programStudiId })
        .from(mahasiswa)
        .where(ilike(mahasiswa.email, user.email.trim()))
        .limit(1);

      if (!mhsRow) {
        throw new Error('Data profil mahasiswa tidak ditemukan.');
      }
      ketuaMhsId = mhsRow.id;
      mhsProdiId = mhsRow.programStudiId;
    } else if (input.mahasiswaId) {
      // Didaftarkan oleh Admin / Prodi / Kaprodi / LPPM / Dosen atas nama mahasiswa
      const [mhsRow] = await db
        .select({ id: mahasiswa.id, programStudiId: mahasiswa.programStudiId })
        .from(mahasiswa)
        .where(eq(mahasiswa.id, input.mahasiswaId))
        .limit(1);

      if (!mhsRow) {
        throw new Error('Mahasiswa yang dipilih tidak ditemukan.');
      }
      ketuaMhsId = mhsRow.id;
      mhsProdiId = mhsRow.programStudiId;
    }

    const resolvedProdiId = input.programStudiId || mhsProdiId;
    if (!resolvedProdiId) {
      throw new Error('Program studi wajib ditentukan untuk tugas akhir.');
    }

    let activePeriodeId = input.periodeId;
    if (!activePeriodeId) {
      const [active] = await db
        .select({ id: periodeAkademik.id })
        .from(periodeAkademik)
        .where(eq(periodeAkademik.aktif, true))
        .limit(1);
      activePeriodeId = active?.id;
    }

    return await db.transaction(async (tx) => {
      const kodeTa = await TugasAkhirService.generateKodeTa(resolvedProdiId);

      const [newTa] = await tx
        .insert(tugasAkhir)
        .values({
          kodeTa,
          tipe: input.tipe,
          jenisKarya: input.jenisKarya,
          judul: input.judul.trim(),
          judulInggris: input.judulInggris?.trim() || null,
          bidangKajian: input.bidangKajian?.trim() || null,
          latarBelakang: input.latarBelakang?.trim() || null,
          rumusanMasalah: input.rumusanMasalah?.trim() || null,
          tujuan: input.tujuan?.trim() || null,
          metodologi: input.metodologi?.trim() || null,
          mitraIndustri: input.mitraIndustri?.trim() || null,
          programStudiId: resolvedProdiId,
          periodeId: activePeriodeId,
          status: 'diajukan',
          createdById: user.id,
          fileProposalTopikUrl: input.fileProposalTopikUrl || null,
        })
        .returning();

      // Jika diajukan oleh mahasiswa, jadikan dia Ketua
      if (ketuaMhsId) {
        await tx.insert(tugasAkhirAnggota).values({
          tugasAkhirId: newTa.id,
          mahasiswaId: ketuaMhsId,
          peran: 'ketua',
          statusKonfirmasi: 'diterima',
        });
      }

      // Jika kelompok, daftarkan anggota tambahan dengan status 'menunggu'
      if (input.tipe === 'kelompok' && input.anggotaMahasiswaIds && input.anggotaMahasiswaIds.length > 0) {
        for (const mId of input.anggotaMahasiswaIds) {
          if (mId === ketuaMhsId) continue;
          await tx
            .insert(tugasAkhirAnggota)
            .values({
              tugasAkhirId: newTa.id,
              mahasiswaId: mId,
              peran: 'anggota',
              statusKonfirmasi: 'menunggu',
            })
            .onConflictDoNothing();
        }
      }

      // Simpan usulan pembimbing jika diisi
      if (input.usulanPembimbing && input.usulanPembimbing.length > 0) {
        for (const p of input.usulanPembimbing) {
          await tx
            .insert(tugasAkhirPembimbing)
            .values({
              tugasAkhirId: newTa.id,
              dosenId: p.dosenId,
              namaEksternal: p.namaEksternal?.trim(),
              instansiEksternal: p.instansiEksternal?.trim(),
              peran: p.peran,
              statusPersetujuan: 'usulan',
              catatan: p.catatan?.trim(),
            })
            .onConflictDoNothing();
        }
      }

      // Catat log pembuatan
      await tx.insert(tugasAkhirStatusLog).values({
        tugasAkhirId: newTa.id,
        dariStatus: null,
        keStatus: 'diajukan',
        alasan: 'Pengusulan topik tugas akhir baru diajukan',
        olehUserId: user.id,
      });

      return newTa;
    });
  }

  static async update(id: number, input: UpdateTugasAkhirInput, user: UserPayload) {
    const [existing] = await db.select().from(tugasAkhir).where(eq(tugasAkhir.id, id)).limit(1);
    if (!existing) throw new Error('Data tugas akhir tidak ditemukan.');

    const isStaffEditor = hasRole(user, ['super_admin', 'admin', 'prodi', 'kaprodi', 'lppm']);
    const isOwner = existing.createdById === user.id;

    if (!isStaffEditor && !isOwner) {
      throw new Error('Akses ditolak. Anda bukan pengusul tugas akhir ini.');
    }

    if (!isStaffEditor && !['draft', 'diajukan', 'revisi_proposal_topik'].includes(existing.status)) {
      throw new Error('Topik yang sudah disetujui atau diproses tidak dapat diubah tanpa persetujuan prodi.');
    }

    return await db.transaction(async (tx) => {
      let resolvedProdiId = existing.programStudiId;
      if (isStaffEditor && input.programStudiId) {
        resolvedProdiId = input.programStudiId;
      }

      // 1. Tangani perubahan Ketua jika dilakukan oleh Staff Editor
      let currentKetuaId: number | null = null;
      const [currentKetua] = await tx
        .select({ id: tugasAkhirAnggota.id, mahasiswaId: tugasAkhirAnggota.mahasiswaId })
        .from(tugasAkhirAnggota)
        .where(and(eq(tugasAkhirAnggota.tugasAkhirId, id), eq(tugasAkhirAnggota.peran, 'ketua')))
        .limit(1);

      if (currentKetua) {
        currentKetuaId = currentKetua.mahasiswaId;
      }

      if (isStaffEditor && input.mahasiswaId && input.mahasiswaId !== currentKetuaId) {
        const [targetMhs] = await tx
          .select({ id: mahasiswa.id, programStudiId: mahasiswa.programStudiId })
          .from(mahasiswa)
          .where(eq(mahasiswa.id, input.mahasiswaId))
          .limit(1);

        if (!targetMhs) {
          throw new Error('Mahasiswa ketua pengusul tidak ditemukan.');
        }

        // Jika staf tidak eksplisit set programStudiId dan targetMhs punya programStudiId, sinkronkan
        if (!input.programStudiId && targetMhs.programStudiId) {
          resolvedProdiId = targetMhs.programStudiId;
        }

        // Hapus record lama mahasiswa baru ini dari tim jika sebelumnya ada (sebagai anggota)
        await tx
          .delete(tugasAkhirAnggota)
          .where(and(eq(tugasAkhirAnggota.tugasAkhirId, id), eq(tugasAkhirAnggota.mahasiswaId, input.mahasiswaId)));

        // Hapus ketua lama
        if (currentKetua) {
          await tx.delete(tugasAkhirAnggota).where(eq(tugasAkhirAnggota.id, currentKetua.id));
        }

        // Daftarkan ketua baru
        await tx.insert(tugasAkhirAnggota).values({
          tugasAkhirId: id,
          mahasiswaId: input.mahasiswaId,
          peran: 'ketua',
          statusKonfirmasi: 'diterima',
        });

        currentKetuaId = input.mahasiswaId;
      }

      const newTipe = input.tipe ?? existing.tipe;

      // 2. Tangani perubahan Anggota Tim jika dilakukan oleh Staff Editor
      if (isStaffEditor) {
        if (newTipe === 'individu') {
          // Hapus semua anggota non-ketua
          await tx
            .delete(tugasAkhirAnggota)
            .where(and(eq(tugasAkhirAnggota.tugasAkhirId, id), eq(tugasAkhirAnggota.peran, 'anggota')));
        } else if (input.anggotaMahasiswaIds !== undefined && input.anggotaMahasiswaIds !== null) {
          const targetAnggotaIds = input.anggotaMahasiswaIds.filter((mId) => mId !== currentKetuaId);

          const existingMembers = await tx
            .select({ id: tugasAkhirAnggota.id, mahasiswaId: tugasAkhirAnggota.mahasiswaId })
            .from(tugasAkhirAnggota)
            .where(and(eq(tugasAkhirAnggota.tugasAkhirId, id), eq(tugasAkhirAnggota.peran, 'anggota')));

          const toDelete = existingMembers.filter((m) => !targetAnggotaIds.includes(m.mahasiswaId));
          if (toDelete.length > 0) {
            await tx.delete(tugasAkhirAnggota).where(
              and(
                eq(tugasAkhirAnggota.tugasAkhirId, id),
                inArray(
                  tugasAkhirAnggota.id,
                  toDelete.map((d) => d.id),
                ),
              ),
            );
          }

          const existingMemberIds = existingMembers.map((m) => m.mahasiswaId);
          for (const mId of targetAnggotaIds) {
            if (!existingMemberIds.includes(mId)) {
              await tx
                .insert(tugasAkhirAnggota)
                .values({
                  tugasAkhirId: id,
                  mahasiswaId: mId,
                  peran: 'anggota',
                  statusKonfirmasi: 'diterima',
                })
                .onConflictDoNothing();
            }
          }
        }
      }

      const [updated] = await tx
        .update(tugasAkhir)
        .set({
          judul: input.judul?.trim() ?? existing.judul,
          judulInggris: input.judulInggris !== undefined ? input.judulInggris?.trim() : existing.judulInggris,
          tipe: newTipe,
          jenisKarya: input.jenisKarya ?? existing.jenisKarya,
          bidangKajian: input.bidangKajian !== undefined ? input.bidangKajian?.trim() : existing.bidangKajian,
          latarBelakang: input.latarBelakang !== undefined ? input.latarBelakang?.trim() : existing.latarBelakang,
          rumusanMasalah: input.rumusanMasalah !== undefined ? input.rumusanMasalah?.trim() : existing.rumusanMasalah,
          tujuan: input.tujuan !== undefined ? input.tujuan?.trim() : existing.tujuan,
          metodologi: input.metodologi !== undefined ? input.metodologi?.trim() : existing.metodologi,
          mitraIndustri: input.mitraIndustri !== undefined ? input.mitraIndustri?.trim() : existing.mitraIndustri,
          fileProposalTopikUrl: input.fileProposalTopikUrl ?? existing.fileProposalTopikUrl,
          programStudiId: resolvedProdiId,
        })
        .where(eq(tugasAkhir.id, id))
        .returning();

      // Jika usulan pembimbing diperbarui
      if (input.usulanPembimbing && input.usulanPembimbing.length > 0) {
        for (const p of input.usulanPembimbing) {
          const [existP] = await tx
            .select()
            .from(tugasAkhirPembimbing)
            .where(and(eq(tugasAkhirPembimbing.tugasAkhirId, id), eq(tugasAkhirPembimbing.peran, p.peran)))
            .limit(1);

          if (existP) {
            await tx
              .update(tugasAkhirPembimbing)
              .set({
                dosenId: p.dosenId,
                namaEksternal: p.namaEksternal?.trim() || null,
                instansiEksternal: p.instansiEksternal?.trim() || null,
                catatan: p.catatan?.trim() || null,
              })
              .where(eq(tugasAkhirPembimbing.id, existP.id));
          } else {
            await tx.insert(tugasAkhirPembimbing).values({
              tugasAkhirId: id,
              peran: p.peran,
              dosenId: p.dosenId,
              namaEksternal: p.namaEksternal?.trim() || null,
              instansiEksternal: p.instansiEksternal?.trim() || null,
              statusPersetujuan: 'usulan',
              catatan: p.catatan?.trim() || null,
            });
          }
        }
      }

      return updated;
    });
  }

  static async delete(id: number, user: UserPayload) {
    const [existing] = await db.select().from(tugasAkhir).where(eq(tugasAkhir.id, id)).limit(1);
    if (!existing) {
      throw new Error('Data tugas akhir tidak ditemukan.');
    }

    const isStaff = hasRole(user, ['super_admin', 'admin', 'prodi', 'kaprodi', 'lppm']);
    const isOwner = existing.createdById === user.id;

    if (!isStaff && !isOwner) {
      throw new Error('Akses ditolak. Anda tidak berhak menghapus tugas akhir ini.');
    }

    if (!isStaff && !['draft', 'diajukan', 'revisi_proposal_topik'].includes(existing.status)) {
      throw new Error('Tugas akhir yang sudah disetujui atau diproses tidak dapat dihapus oleh mahasiswa.');
    }

    await db.delete(tugasAkhir).where(eq(tugasAkhir.id, id));
    return { success: true, message: 'Data tugas akhir berhasil dihapus.' };
  }

  static async reviewTopik(id: number, input: ReviewTopikInput, user: UserPayload) {
    const isApprover = hasRole(user, ['super_admin', 'admin', 'prodi', 'kaprodi', 'lppm']);
    if (!isApprover) {
      throw new Error('Akses ditolak. Hanya Admin, Kaprodi, Prodi, atau LPPM yang berwenang mereview topik.');
    }

    const [existing] = await db.select().from(tugasAkhir).where(eq(tugasAkhir.id, id)).limit(1);
    if (!existing) throw new Error('Data tugas akhir tidak ditemukan.');

    return await db.transaction(async (tx) => {
      const nextStatus = input.status === 'disetujui' ? 'disetujui' : input.status;

      const [updatedTa] = await tx
        .update(tugasAkhir)
        .set({
          status: nextStatus,
          disetujuiOlehId: user.id,
          disetujuiAt: input.status === 'disetujui' ? new Date() : null,
          catatanProdi: input.catatanProdi?.trim() || null,
        })
        .where(eq(tugasAkhir.id, id))
        .returning();

      // Jika ada pembimbing yang ditetapkan dalam review
      if (input.pembimbing && input.pembimbing.length > 0) {
        for (const p of input.pembimbing) {
          // Update / insert pembimbing tugas akhir
          const [existP] = await tx
            .select()
            .from(tugasAkhirPembimbing)
            .where(and(eq(tugasAkhirPembimbing.tugasAkhirId, id), eq(tugasAkhirPembimbing.peran, p.peran)))
            .limit(1);

          if (existP) {
            await tx
              .update(tugasAkhirPembimbing)
              .set({
                dosenId: p.dosenId,
                namaEksternal: p.namaEksternal?.trim() || null,
                instansiEksternal: p.instansiEksternal?.trim() || null,
                statusPersetujuan: input.status === 'disetujui' ? 'disetujui' : 'usulan',
                catatan: p.catatan?.trim() || null,
              })
              .where(eq(tugasAkhirPembimbing.id, existP.id));
          } else {
            await tx.insert(tugasAkhirPembimbing).values({
              tugasAkhirId: id,
              peran: p.peran,
              dosenId: p.dosenId,
              namaEksternal: p.namaEksternal?.trim() || null,
              instansiEksternal: p.instansiEksternal?.trim() || null,
              statusPersetujuan: input.status === 'disetujui' ? 'disetujui' : 'usulan',
              catatan: p.catatan?.trim() || null,
            });
          }
        }
      }

      // Jika disetujui, sinkronkan penetapan pembimbing ke tabel `pembimbing_mahasiswa` untuk semua anggota aktif
      if (input.status === 'disetujui') {
        const anggotaRows = await tx
          .select({ mahasiswaId: tugasAkhirAnggota.mahasiswaId })
          .from(tugasAkhirAnggota)
          .where(
            and(
              eq(tugasAkhirAnggota.tugasAkhirId, id),
              inArray(tugasAkhirAnggota.statusKonfirmasi, ['diterima', 'menunggu']),
            ),
          );

        const pembimbingRows = await tx
          .select()
          .from(tugasAkhirPembimbing)
          .where(eq(tugasAkhirPembimbing.tugasAkhirId, id));

        for (const ang of anggotaRows) {
          for (const p of pembimbingRows) {
            const slotJenis = p.peran === 'pembimbing_1' ? 'TA_UTAMA' : 'TA_PENDAMPING';

            // Nonaktifkan pembimbing lama untuk jenis ini
            await tx
              .update(pembimbingMahasiswa)
              .set({ statusAktif: false })
              .where(
                and(
                  eq(pembimbingMahasiswa.mahasiswaId, ang.mahasiswaId),
                  eq(pembimbingMahasiswa.jenis, slotJenis),
                  eq(pembimbingMahasiswa.statusAktif, true),
                ),
              );

            // Insert penetapan pembimbing baru
            await tx.insert(pembimbingMahasiswa).values({
              mahasiswaId: ang.mahasiswaId,
              jenis: slotJenis,
              dosenId: p.dosenId,
              namaEksternal: p.namaEksternal,
              instansiEksternal: p.instansiEksternal,
              statusAktif: true,
              ditetapkanOlehId: user.id,
              catatan: `Penetapan otomatis dari persetujuan Tugas Akhir (${updatedTa.kodeTa})`,
            });
          }
        }
      }

      await tx.insert(tugasAkhirStatusLog).values({
        tugasAkhirId: id,
        dariStatus: existing.status,
        keStatus: nextStatus,
        alasan: input.catatanProdi?.trim() || `Review usulan topik: ${nextStatus}`,
        olehUserId: user.id,
      });

      return updatedTa;
    });
  }

  static async overrideStatus(id: number, keStatus: string, alasan: string, user: UserPayload) {
    const isOverrideRole = hasRole(user, ['super_admin', 'admin', 'prodi', 'kaprodi', 'lppm']);
    if (!isOverrideRole) {
      throw new Error('Akses ditolak. Hanya Admin, Prodi, Kaprodi, atau LPPM yang berwenang melakukan override.');
    }

    const [existing] = await db.select().from(tugasAkhir).where(eq(tugasAkhir.id, id)).limit(1);
    if (!existing) throw new Error('Data tugas akhir tidak ditemukan.');

    const [updated] = await db.transaction(async (tx) => {
      const [res] = await tx.update(tugasAkhir).set({ status: keStatus }).where(eq(tugasAkhir.id, id)).returning();

      await tx.insert(tugasAkhirStatusLog).values({
        tugasAkhirId: id,
        dariStatus: existing.status,
        keStatus,
        alasan: alasan.trim(),
        olehUserId: user.id,
      });

      return [res];
    });

    return updated;
  }

  static async responUndangan(taId: number, statusKonfirmasi: 'diterima' | 'ditolak', user: UserPayload) {
    const [mhsRow] = await db
      .select({ id: mahasiswa.id })
      .from(mahasiswa)
      .where(ilike(mahasiswa.email, user.email.trim()))
      .limit(1);
    if (!mhsRow) throw new Error('Data profil mahasiswa tidak ditemukan.');

    const [row] = await db
      .update(tugasAkhirAnggota)
      .set({ statusKonfirmasi })
      .where(and(eq(tugasAkhirAnggota.tugasAkhirId, taId), eq(tugasAkhirAnggota.mahasiswaId, mhsRow.id)))
      .returning();

    if (!row) throw new Error('Undangan anggota tidak ditemukan.');
    return row;
  }

  static async getById(id: number, user: UserPayload) {
    const [row] = await db.select().from(tugasAkhir).where(eq(tugasAkhir.id, id)).limit(1);
    if (!row) throw new Error('Data tugas akhir tidak ditemukan.');

    const anggota = await db
      .select({
        id: tugasAkhirAnggota.id,
        mahasiswaId: tugasAkhirAnggota.mahasiswaId,
        peran: tugasAkhirAnggota.peran,
        statusKonfirmasi: tugasAkhirAnggota.statusKonfirmasi,
        bagianPengerjaan: tugasAkhirAnggota.bagianPengerjaan,
        nama: mahasiswa.nama,
        nim: mahasiswa.nim,
      })
      .from(tugasAkhirAnggota)
      .innerJoin(mahasiswa, eq(tugasAkhirAnggota.mahasiswaId, mahasiswa.id))
      .where(eq(tugasAkhirAnggota.tugasAkhirId, id))
      .orderBy(asc(tugasAkhirAnggota.id));

    const pembimbing = await db
      .select({
        id: tugasAkhirPembimbing.id,
        peran: tugasAkhirPembimbing.peran,
        dosenId: tugasAkhirPembimbing.dosenId,
        namaEksternal: tugasAkhirPembimbing.namaEksternal,
        instansiEksternal: tugasAkhirPembimbing.instansiEksternal,
        statusPersetujuan: tugasAkhirPembimbing.statusPersetujuan,
        catatan: tugasAkhirPembimbing.catatan,
        accSidangProposal: tugasAkhirPembimbing.accSidangProposal,
        accSidangAkhir: tugasAkhirPembimbing.accSidangAkhir,
        dosenNama: dosen.nama,
        dosenNip: dosen.nip,
      })
      .from(tugasAkhirPembimbing)
      .leftJoin(dosen, eq(tugasAkhirPembimbing.dosenId, dosen.id))
      .where(eq(tugasAkhirPembimbing.tugasAkhirId, id))
      .orderBy(asc(tugasAkhirPembimbing.peran));

    const statusLog = await db
      .select({
        id: tugasAkhirStatusLog.id,
        dariStatus: tugasAkhirStatusLog.dariStatus,
        keStatus: tugasAkhirStatusLog.keStatus,
        alasan: tugasAkhirStatusLog.alasan,
        createdAt: tugasAkhirStatusLog.createdAt,
        olehNama: users.nama,
      })
      .from(tugasAkhirStatusLog)
      .leftJoin(users, eq(tugasAkhirStatusLog.olehUserId, users.id))
      .where(eq(tugasAkhirStatusLog.tugasAkhirId, id))
      .orderBy(desc(tugasAkhirStatusLog.createdAt));

    const [prodi] = await db
      .select({ id: programStudi.id, nama: programStudi.nama, kode: programStudi.kode })
      .from(programStudi)
      .where(eq(programStudi.id, row.programStudiId))
      .limit(1);

    return {
      ...row,
      programStudi: prodi || null,
      anggota,
      pembimbing,
      statusLog,
    };
  }

  static async getAll(filters: TugasAkhirFilter, user: UserPayload) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];

    if (filters.status) {
      conditions.push(eq(tugasAkhir.status, filters.status));
    }
    if (filters.programStudiId) {
      conditions.push(eq(tugasAkhir.programStudiId, filters.programStudiId));
    }
    if (filters.periodeId) {
      conditions.push(eq(tugasAkhir.periodeId, filters.periodeId));
    }
    if (filters.tipe) {
      conditions.push(eq(tugasAkhir.tipe, filters.tipe));
    }
    if (filters.search) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(or(ilike(tugasAkhir.judul, q), ilike(tugasAkhir.kodeTa, q))!);
    }

    // Role-based scoping
    const isMhs = hasRole(user, ['mahasiswa']);
    const isStaff = hasRole(user, ['super_admin', 'admin', 'prodi', 'kaprodi', 'lppm']);

    if (isMhs) {
      // Mahasiswa hanya melihat tugas akhir yang mana dia adalah pembuat atau anggotanya
      const [mhsRow] = await db
        .select({ id: mahasiswa.id })
        .from(mahasiswa)
        .where(ilike(mahasiswa.email, user.email.trim()))
        .limit(1);

      if (mhsRow) {
        const myTaIds = await db
          .select({ tugasAkhirId: tugasAkhirAnggota.tugasAkhirId })
          .from(tugasAkhirAnggota)
          .where(eq(tugasAkhirAnggota.mahasiswaId, mhsRow.id));

        const ids = myTaIds.map((r) => r.tugasAkhirId);
        if (ids.length > 0) {
          conditions.push(or(eq(tugasAkhir.createdById, user.id), inArray(tugasAkhir.id, ids))!);
        } else {
          conditions.push(eq(tugasAkhir.createdById, user.id));
        }
      } else {
        conditions.push(eq(tugasAkhir.createdById, user.id));
      }
    } else if (!isStaff && hasRole(user, ['dosen'])) {
      // Dosen murni: melihat TA di mana dia menjadi pembimbing
      const [dosenRow] = await db.select({ id: dosen.id }).from(dosen).where(eq(dosen.email, user.email)).limit(1);

      if (dosenRow) {
        const pembimbingTaIds = await db
          .select({ tugasAkhirId: tugasAkhirPembimbing.tugasAkhirId })
          .from(tugasAkhirPembimbing)
          .where(eq(tugasAkhirPembimbing.dosenId, dosenRow.id));

        const ids = pembimbingTaIds.map((r) => r.tugasAkhirId);
        if (ids.length > 0) {
          conditions.push(inArray(tugasAkhir.id, ids));
        } else {
          conditions.push(eq(tugasAkhir.id, -1)); // Return empty
        }
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countRow] = await db.select({ total: count() }).from(tugasAkhir).where(whereClause);

    const total = Number(countRow?.total || 0);

    const rows = await db
      .select({
        id: tugasAkhir.id,
        kodeTa: tugasAkhir.kodeTa,
        tipe: tugasAkhir.tipe,
        jenisKarya: tugasAkhir.jenisKarya,
        judul: tugasAkhir.judul,
        judulInggris: tugasAkhir.judulInggris,
        bidangKajian: tugasAkhir.bidangKajian,
        programStudiId: tugasAkhir.programStudiId,
        periodeId: tugasAkhir.periodeId,
        status: tugasAkhir.status,
        createdById: tugasAkhir.createdById,
        disetujuiAt: tugasAkhir.disetujuiAt,
        createdAt: tugasAkhir.createdAt,
        updatedAt: tugasAkhir.updatedAt,
        prodiNama: programStudi.nama,
        prodiKode: programStudi.kode,
        creatorNama: users.nama,
      })
      .from(tugasAkhir)
      .leftJoin(programStudi, eq(tugasAkhir.programStudiId, programStudi.id))
      .leftJoin(users, eq(tugasAkhir.createdById, users.id))
      .where(whereClause)
      .orderBy(desc(tugasAkhir.createdAt))
      .limit(limit)
      .offset(offset);

    const taIds = rows.map((r) => r.id);

    let pembimbingList: {
      id: number;
      tugasAkhirId: number;
      peran: string;
      dosenId: number | null;
      namaEksternal: string | null;
      instansiEksternal: string | null;
      statusPersetujuan: string;
      catatan: string | null;
      dosenNama: string | null;
      dosenNip: string | null;
    }[] = [];

    let anggotaList: {
      id: number;
      tugasAkhirId: number;
      mahasiswaId: number;
      peran: string;
      statusKonfirmasi: string;
      bagianPengerjaan: string | null;
      mahasiswaNama: string | null;
      mahasiswaNim: string | null;
    }[] = [];

    if (taIds.length > 0) {
      pembimbingList = await db
        .select({
          id: tugasAkhirPembimbing.id,
          tugasAkhirId: tugasAkhirPembimbing.tugasAkhirId,
          peran: tugasAkhirPembimbing.peran,
          dosenId: tugasAkhirPembimbing.dosenId,
          namaEksternal: tugasAkhirPembimbing.namaEksternal,
          instansiEksternal: tugasAkhirPembimbing.instansiEksternal,
          statusPersetujuan: tugasAkhirPembimbing.statusPersetujuan,
          catatan: tugasAkhirPembimbing.catatan,
          dosenNama: dosen.nama,
          dosenNip: dosen.nip,
        })
        .from(tugasAkhirPembimbing)
        .leftJoin(dosen, eq(tugasAkhirPembimbing.dosenId, dosen.id))
        .where(inArray(tugasAkhirPembimbing.tugasAkhirId, taIds))
        .orderBy(asc(tugasAkhirPembimbing.peran));

      anggotaList = await db
        .select({
          id: tugasAkhirAnggota.id,
          tugasAkhirId: tugasAkhirAnggota.tugasAkhirId,
          mahasiswaId: tugasAkhirAnggota.mahasiswaId,
          peran: tugasAkhirAnggota.peran,
          statusKonfirmasi: tugasAkhirAnggota.statusKonfirmasi,
          bagianPengerjaan: tugasAkhirAnggota.bagianPengerjaan,
          mahasiswaNama: mahasiswa.nama,
          mahasiswaNim: mahasiswa.nim,
        })
        .from(tugasAkhirAnggota)
        .leftJoin(mahasiswa, eq(tugasAkhirAnggota.mahasiswaId, mahasiswa.id))
        .where(inArray(tugasAkhirAnggota.tugasAkhirId, taIds))
        .orderBy(asc(tugasAkhirAnggota.id));
    }

    const pembimbingMap = new Map<number, typeof pembimbingList>();
    for (const p of pembimbingList) {
      const list = pembimbingMap.get(p.tugasAkhirId) || [];
      list.push(p);
      pembimbingMap.set(p.tugasAkhirId, list);
    }

    const anggotaMap = new Map<number, typeof anggotaList>();
    for (const a of anggotaList) {
      const list = anggotaMap.get(a.tugasAkhirId) || [];
      list.push(a);
      anggotaMap.set(a.tugasAkhirId, list);
    }

    const rowsWithDetails = rows.map((r) => ({
      ...r,
      pembimbing: pembimbingMap.get(r.id) || [],
      anggota: anggotaMap.get(r.id) || [],
    }));

    return {
      data: rowsWithDetails,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
