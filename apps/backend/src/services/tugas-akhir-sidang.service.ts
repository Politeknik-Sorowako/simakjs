import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import {
  dosen,
  mahasiswa,
  periodeAkademik,
  programStudi,
  tugasAkhir,
  tugasAkhirAnggota,
  tugasAkhirNilaiDetail,
  tugasAkhirPembimbing,
  tugasAkhirPenguji,
  tugasAkhirRubrikKriteria,
  tugasAkhirSidang,
  tugasAkhirStatusLog,
  users,
} from '../models/schema';
import { db } from '../utils/db';
import { hasRole } from '../utils/role';
import type { UserPayload } from '../utils/types';

export interface DaftarSidangInput {
  jenisSidang: 'proposal' | 'kemajuan' | 'akhir';
  berkasProposalUrl?: string | null;
  buktiBebasKompensasiUrl?: string | null;
  buktiPlagiasiUrl?: string | null;
  catatanMahasiswa?: string | null;
}

export interface PengujiPlottingInput {
  dosenId: number;
  peranPenguji: 'ketua_penguji' | 'sekretaris' | 'penguji_1' | 'penguji_2' | 'pembimbing_1' | 'pembimbing_2';
}

export interface JadwalSidangInput {
  tanggalSidang: string;
  jamMulai: string;
  jamSelesai: string;
  ruangan: string;
  timPenguji: PengujiPlottingInput[];
}

export interface InputNilaiSidangInput {
  nilaiList: {
    kriteriaId: number;
    mahasiswaId: number;
    nilai: number;
  }[];
  catatanRevisi?: string | null;
}

export interface FinalisasiSidangInput {
  statusHasil: 'lulus_tanpa_revisi' | 'lulus_dengan_revisi' | 'sidang_ulang' | 'tidak_lulus';
  batasWaktuRevisi?: string | null;
  catatanSidang?: string | null;
}

export class TugasAkhirSidangService {
  /**
   * Mengambil daftar sidang untuk tugas akhir tertentu
   */
  static async getSidangList(taId: number) {
    const sidangs = await db
      .select({
        id: tugasAkhirSidang.id,
        tugasAkhirId: tugasAkhirSidang.tugasAkhirId,
        jenisSidang: tugasAkhirSidang.jenisSidang,
        periodeId: tugasAkhirSidang.periodeId,
        tanggalPengajuan: tugasAkhirSidang.tanggalPengajuan,
        status: tugasAkhirSidang.status,
        berkasSyarat: tugasAkhirSidang.berkasSyarat,
        tanggalSidang: tugasAkhirSidang.tanggalSidang,
        jamMulai: tugasAkhirSidang.jamMulai,
        jamSelesai: tugasAkhirSidang.jamSelesai,
        ruangan: tugasAkhirSidang.ruangan,
        statusHasil: tugasAkhirSidang.statusHasil,
        nilaiAkhirAngka: tugasAkhirSidang.nilaiAkhirAngka,
        nilaiAkhirHuruf: tugasAkhirSidang.nilaiAkhirHuruf,
        batasWaktuRevisi: tugasAkhirSidang.batasWaktuRevisi,
        statusRevisi: tugasAkhirSidang.statusRevisi,
        catatanSidang: tugasAkhirSidang.catatanSidang,
        createdAt: tugasAkhirSidang.createdAt,
      })
      .from(tugasAkhirSidang)
      .where(eq(tugasAkhirSidang.tugasAkhirId, taId))
      .orderBy(desc(tugasAkhirSidang.createdAt));

    const sidangIds = sidangs.map((s) => s.id);
    let pengujiList: {
      id: number;
      sidangId: number;
      dosenId: number;
      peranPenguji: string;
      kehadiran: boolean;
      nilaiTotal: string | null;
      catatanRevisi: string | null;
      dosenNama: string | null;
      dosenNip: string | null;
    }[] = [];

    if (sidangIds.length > 0) {
      pengujiList = await db
        .select({
          id: tugasAkhirPenguji.id,
          sidangId: tugasAkhirPenguji.sidangId,
          dosenId: tugasAkhirPenguji.dosenId,
          peranPenguji: tugasAkhirPenguji.peranPenguji,
          kehadiran: tugasAkhirPenguji.kehadiran,
          nilaiTotal: tugasAkhirPenguji.nilaiTotal,
          catatanRevisi: tugasAkhirPenguji.catatanRevisi,
          dosenNama: dosen.nama,
          dosenNip: dosen.nip,
        })
        .from(tugasAkhirPenguji)
        .leftJoin(dosen, eq(tugasAkhirPenguji.dosenId, dosen.id))
        .where(inArray(tugasAkhirPenguji.sidangId, sidangIds))
        .orderBy(asc(tugasAkhirPenguji.id));
    }

    return sidangs.map((s) => ({
      ...s,
      timPenguji: pengujiList.filter((p) => p.sidangId === s.id),
    }));
  }

  /**
   * Pendaftaran sidang proposal / akhir oleh mahasiswa / staf
   */
  static async daftarSidang(taId: number, input: DaftarSidangInput, user: UserPayload) {
    const [ta] = await db.select().from(tugasAkhir).where(eq(tugasAkhir.id, taId)).limit(1);
    if (!ta) throw new Error('Data tugas akhir tidak ditemukan.');

    const isStaff = hasRole(user, ['super_admin', 'admin', 'prodi', 'kaprodi', 'lppm']);

    // Cek syarat ACC pembimbing jika diajukan oleh mahasiswa
    if (!isStaff) {
      const pembimbingRows = await db
        .select()
        .from(tugasAkhirPembimbing)
        .where(eq(tugasAkhirPembimbing.tugasAkhirId, taId));

      if (pembimbingRows.length === 0) {
        throw new Error('Dosen pembimbing belum ditetapkan untuk tugas akhir ini.');
      }

      if (input.jenisSidang === 'proposal') {
        const belumAcc = pembimbingRows.some((p) => !p.accSidangProposal);
        if (belumAcc) {
          throw new Error('Pendaftaran sidang proposal memerlukan persetujuan ACC dari seluruh dosen pembimbing.');
        }
      } else if (input.jenisSidang === 'akhir') {
        const belumAcc = pembimbingRows.some((p) => !p.accSidangAkhir);
        if (belumAcc) {
          throw new Error('Pendaftaran sidang akhir memerlukan persetujuan ACC dari seluruh dosen pembimbing.');
        }
      }
    }

    return await db.transaction(async (tx) => {
      const nowStr = new Date().toISOString().split('T')[0];

      const [newSidang] = await tx
        .insert(tugasAkhirSidang)
        .values({
          tugasAkhirId: taId,
          jenisSidang: input.jenisSidang,
          periodeId: ta.periodeId,
          tanggalPengajuan: nowStr,
          status: 'diajukan',
          berkasSyarat: {
            berkasProposalUrl: input.berkasProposalUrl || null,
            buktiBebasKompensasiUrl: input.buktiBebasKompensasiUrl || null,
            buktiPlagiasiUrl: input.buktiPlagiasiUrl || null,
            catatanMahasiswa: input.catatanMahasiswa || null,
          },
        })
        .returning();

      // Update status TA
      const nextTaStatus = input.jenisSidang === 'proposal' ? 'sempro_diajukan' : 'sidang_diajukan';
      await tx.update(tugasAkhir).set({ status: nextTaStatus }).where(eq(tugasAkhir.id, taId));

      await tx.insert(tugasAkhirStatusLog).values({
        tugasAkhirId: taId,
        dariStatus: ta.status,
        keStatus: nextTaStatus,
        alasan: `Pengajuan pendaftaran ${input.jenisSidang === 'proposal' ? 'Seminar Proposal' : 'Sidang Akhir'}`,
        olehUserId: user.id,
      });

      return newSidang;
    });
  }

  /**
   * Penjadwalan & Plotting Tim Penguji oleh Kaprodi / Pengelola Prodi
   */
  static async jadwalkanSidang(taId: number, sidangId: number, input: JadwalSidangInput, user: UserPayload) {
    const isStaff = hasRole(user, ['super_admin', 'admin', 'prodi', 'kaprodi', 'lppm']);
    if (!isStaff) {
      throw new Error('Akses ditolak. Hanya pengelola prodi yang berhak menjadwalkan sidang.');
    }

    const [sidang] = await db
      .select()
      .from(tugasAkhirSidang)
      .where(and(eq(tugasAkhirSidang.id, sidangId), eq(tugasAkhirSidang.tugasAkhirId, taId)))
      .limit(1);

    if (!sidang) throw new Error('Data sidang tidak ditemukan.');

    const [ta] = await db.select().from(tugasAkhir).where(eq(tugasAkhir.id, taId)).limit(1);

    return await db.transaction(async (tx) => {
      // 1. Update sidang info
      const [updatedSidang] = await tx
        .update(tugasAkhirSidang)
        .set({
          tanggalSidang: input.tanggalSidang,
          jamMulai: input.jamMulai,
          jamSelesai: input.jamSelesai,
          ruangan: input.ruangan.trim(),
          status: 'dijadwalkan',
        })
        .where(eq(tugasAkhirSidang.id, sidangId))
        .returning();

      // 2. Bersihkan & pasang tim penguji
      await tx.delete(tugasAkhirPenguji).where(eq(tugasAkhirPenguji.sidangId, sidangId));

      for (const p of input.timPenguji) {
        await tx.insert(tugasAkhirPenguji).values({
          sidangId,
          dosenId: p.dosenId,
          peranPenguji: p.peranPenguji,
          kehadiran: false,
        });
      }

      // 3. Update status TA
      const nextTaStatus = sidang.jenisSidang === 'proposal' ? 'sempro_dijadwalkan' : 'sidang_dijadwalkan';
      await tx.update(tugasAkhir).set({ status: nextTaStatus }).where(eq(tugasAkhir.id, taId));

      await tx.insert(tugasAkhirStatusLog).values({
        tugasAkhirId: taId,
        dariStatus: ta.status,
        keStatus: nextTaStatus,
        alasan: `Penjadwalan ${sidang.jenisSidang}: Ruang ${input.ruangan}, Tanggal ${input.tanggalSidang} (${input.jamMulai}-${input.jamSelesai})`,
        olehUserId: user.id,
      });

      return updatedSidang;
    });
  }

  /**
   * Mengambil kriteria rubrik penilaian untuk prodi & jenis sidang
   */
  static async getRubrikKriteria(taId: number, jenisSidang: string) {
    const [ta] = await db.select().from(tugasAkhir).where(eq(tugasAkhir.id, taId)).limit(1);
    if (!ta) throw new Error('Data tugas akhir tidak ditemukan.');

    let kriteria = await db
      .select()
      .from(tugasAkhirRubrikKriteria)
      .where(
        and(
          eq(tugasAkhirRubrikKriteria.programStudiId, ta.programStudiId),
          eq(tugasAkhirRubrikKriteria.jenisSidang, jenisSidang),
          eq(tugasAkhirRubrikKriteria.isAktif, true),
        ),
      )
      .orderBy(asc(tugasAkhirRubrikKriteria.urutan));

    // Jika prodi belum punya rubrik custom, sediakan rubrik standar vokasi
    if (kriteria.length === 0) {
      if (jenisSidang === 'proposal') {
        return [
          { id: 1, kode: 'K1', nama: 'Sistematika & Kerapian Dokumen Proposal', bobot: 20, isIndividu: false },
          { id: 2, kode: 'K2', nama: 'Urgensi Masalah & Relevansi Vokasi', bobot: 25, isIndividu: false },
          { id: 3, kode: 'K3', nama: 'Ketepatan Metodologi & Rancangan Desain', bobot: 25, isIndividu: false },
          { id: 4, kode: 'K4', nama: 'Presentasi & Penguasaan Materi Ilmiah', bobot: 30, isIndividu: true },
        ];
      }
      return [
        { id: 5, kode: 'K5', nama: 'Fungsionalitas & Realisasi Prototipe / Produk', bobot: 35, isIndividu: false },
        { id: 6, kode: 'K6', nama: 'Kualitas Analisis & Pembahasan Data Pengujian', bobot: 25, isIndividu: false },
        { id: 7, kode: 'K7', nama: 'Format Laporan & Luaran Publikasi/HAKI', bobot: 15, isIndividu: false },
        { id: 8, kode: 'K8', nama: 'Penguasaan Individu & Tanya Jawab Komprehensif', bobot: 25, isIndividu: true },
      ];
    }

    return kriteria;
  }

  /**
   * Dosen Penguji menginput nilai kriteria & catatan revisi
   */
  static async inputNilaiPenguji(taId: number, sidangId: number, input: InputNilaiSidangInput, user: UserPayload) {
    const isStaff = hasRole(user, ['super_admin', 'admin', 'prodi', 'kaprodi', 'lppm']);
    const isDosen = hasRole(user, ['dosen']);

    if (!isStaff && !isDosen) {
      throw new Error('Akses ditolak. Hanya dosen penguji atau prodi yang dapat mengisi nilai sidang.');
    }

    let pengujiRow: { id: number; dosenId: number } | null = null;

    if (!isStaff && isDosen) {
      const [d] = await db.select({ id: dosen.id }).from(dosen).where(eq(dosen.email, user.email)).limit(1);
      if (!d) throw new Error('Profil dosen tidak ditemukan.');

      const [foundPenguji] = await db
        .select({ id: tugasAkhirPenguji.id, dosenId: tugasAkhirPenguji.dosenId })
        .from(tugasAkhirPenguji)
        .where(and(eq(tugasAkhirPenguji.sidangId, sidangId), eq(tugasAkhirPenguji.dosenId, d.id)))
        .limit(1);

      if (!foundPenguji) {
        throw new Error('Anda tidak terdaftar sebagai tim penguji pada sidang ini.');
      }
      pengujiRow = foundPenguji;
    } else {
      // Staf pengelola: ambil penguji pertama
      const [firstP] = await db
        .select({ id: tugasAkhirPenguji.id, dosenId: tugasAkhirPenguji.dosenId })
        .from(tugasAkhirPenguji)
        .where(eq(tugasAkhirPenguji.sidangId, sidangId))
        .limit(1);
      pengujiRow = firstP || null;
    }

    if (!pengujiRow) {
      throw new Error('Entitas tim penguji tidak ditemukan.');
    }

    return await db.transaction(async (tx) => {
      // Hitung total nilai rata-rata dari input
      let sumNilai = 0;
      for (const item of input.nilaiList) {
        sumNilai += Number(item.nilai);
      }
      const avgNilai = input.nilaiList.length > 0 ? (sumNilai / input.nilaiList.length).toFixed(2) : '0';

      await tx
        .update(tugasAkhirPenguji)
        .set({
          kehadiran: true,
          nilaiTotal: avgNilai,
          catatanRevisi: input.catatanRevisi !== undefined ? input.catatanRevisi?.trim() : undefined,
        })
        .where(eq(tugasAkhirPenguji.id, pengujiRow!.id));

      return {
        message: 'Nilai ujian dan catatan penguji berhasil disimpan.',
        nilaiTotal: avgNilai,
      };
    });
  }

  /**
   * Finalisasi Sidang & Penentuan Hasil (Lulus / Sidang Ulang) oleh Kaprodi / Tim Penguji
   */
  static async finalisasiSidang(taId: number, sidangId: number, input: FinalisasiSidangInput, user: UserPayload) {
    const isStaff = hasRole(user, ['super_admin', 'admin', 'prodi', 'kaprodi', 'lppm']);
    if (!isStaff) {
      throw new Error('Akses ditolak. Hanya kaprodi atau staf pengelola yang berwenang memfinalisasi sidang.');
    }

    const [sidang] = await db
      .select()
      .from(tugasAkhirSidang)
      .where(and(eq(tugasAkhirSidang.id, sidangId), eq(tugasAkhirSidang.tugasAkhirId, taId)))
      .limit(1);

    if (!sidang) throw new Error('Data sidang tidak ditemukan.');

    const [ta] = await db.select().from(tugasAkhir).where(eq(tugasAkhir.id, taId)).limit(1);

    return await db.transaction(async (tx) => {
      // Ambil seluruh nilai penguji
      const pengujiRows = await tx.select().from(tugasAkhirPenguji).where(eq(tugasAkhirPenguji.sidangId, sidangId));

      let totalNilai = 0;
      let count = 0;
      for (const p of pengujiRows) {
        if (p.nilaiTotal) {
          totalNilai += Number(p.nilaiTotal);
          count++;
        }
      }

      const finalAngka = count > 0 ? (totalNilai / count).toFixed(2) : '0.00';
      const num = Number(finalAngka);
      let huruf = 'E';
      if (num >= 85) huruf = 'A';
      else if (num >= 80) huruf = 'A-';
      else if (num >= 75) huruf = 'B+';
      else if (num >= 70) huruf = 'B';
      else if (num >= 65) huruf = 'B-';
      else if (num >= 60) huruf = 'C+';
      else if (num >= 55) huruf = 'C';
      else if (num >= 40) huruf = 'D';

      const isLulus = ['lulus_tanpa_revisi', 'lulus_dengan_revisi'].includes(input.statusHasil);

      // 1. Update Sidang
      const [finalizedSidang] = await tx
        .update(tugasAkhirSidang)
        .set({
          status: 'selesai',
          statusHasil: input.statusHasil,
          nilaiAkhirAngka: finalAngka,
          nilaiAkhirHuruf: huruf,
          batasWaktuRevisi: input.batasWaktuRevisi || null,
          statusRevisi: input.statusHasil === 'lulus_dengan_revisi' ? 'belum_selesai' : 'tuntas',
          catatanSidang: input.catatanSidang?.trim() || null,
        })
        .where(eq(tugasAkhirSidang.id, sidangId))
        .returning();

      // 2. Update status TA
      let nextTaStatus = ta.status;
      if (sidang.jenisSidang === 'proposal') {
        nextTaStatus = isLulus ? 'sempro_selesai' : 'bimbingan';
      } else {
        nextTaStatus = isLulus ? (input.statusHasil === 'lulus_dengan_revisi' ? 'revisi' : 'lulus') : 'bimbingan';
      }

      await tx.update(tugasAkhir).set({ status: nextTaStatus }).where(eq(tugasAkhir.id, taId));

      await tx.insert(tugasAkhirStatusLog).values({
        tugasAkhirId: taId,
        dariStatus: ta.status,
        keStatus: nextTaStatus,
        alasan: `Hasil ${sidang.jenisSidang}: ${input.statusHasil} (Nilai: ${finalAngka} / ${huruf})`,
        olehUserId: user.id,
      });

      return finalizedSidang;
    });
  }
}
