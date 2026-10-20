import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import {
  dosen,
  mahasiswa,
  pengajuanYudisium,
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
      statusAccRevisi: boolean;
      accRevisiAt: Date | null;
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
          statusAccRevisi: tugasAkhirPenguji.statusAccRevisi,
          accRevisiAt: tugasAkhirPenguji.accRevisiAt,
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
   * Konversi Nilai Skala 0 - 10 ke Huruf Mutu Resmi BPA Politeknik Sorowako
   */
  static konversiNilaiBpa(nilai: number): { huruf: string; indeks: number; keterangan: string } {
    if (nilai >= 8.5) return { huruf: 'A', indeks: 4.0, keterangan: 'Sangat Istimewa (Lulus)' };
    if (nilai >= 8.0) return { huruf: 'A-', indeks: 3.7, keterangan: 'Istimewa (Lulus)' };
    if (nilai >= 7.5) return { huruf: 'B+', indeks: 3.3, keterangan: 'Sangat Baik (Lulus)' };
    if (nilai >= 7.0) return { huruf: 'B', indeks: 3.0, keterangan: 'Baik (Lulus)' };
    if (nilai >= 6.3) return { huruf: 'B-', indeks: 2.7, keterangan: 'Cukup Baik (Lulus)' };
    if (nilai >= 5.7) return { huruf: 'C+', indeks: 2.3, keterangan: 'Lebih dari Cukup (Lulus Bersyarat)' };
    if (nilai >= 5.1) return { huruf: 'C', indeks: 2.0, keterangan: 'Cukup (Lulus Bersyarat)' };
    if (nilai >= 4.6) return { huruf: 'D+', indeks: 1.5, keterangan: 'Kurang (Sidang Ulang)' };
    if (nilai >= 4.0) return { huruf: 'D', indeks: 1.0, keterangan: 'Sangat Kurang (Sidang Ulang)' };
    return { huruf: 'E', indeks: 0.0, keterangan: 'Gagal / Tidak Lulus' };
  }

  /**
   * Mengambil kriteria rubrik penilaian untuk prodi & jenis sidang
   * Mengakomodasi Kategori A (Pembimbingan - Individu 30%), B (Alat/Mesin - Kelompok 35%), C (Laporan - Kelompok 35%)
   */
  static async getRubrikKriteria(taId: number, jenisSidang: string) {
    const [ta] = await db.select().from(tugasAkhir).where(eq(tugasAkhir.id, taId)).limit(1);
    if (!ta) throw new Error('Data tugas akhir tidak ditemukan.');

    let kriteria: Array<typeof tugasAkhirRubrikKriteria.$inferSelect> = [];
    try {
      kriteria = await db
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
    } catch (err: unknown) {
      console.warn(
        `[TugasAkhirSidangService] Failed to load rubrik kriteria from DB, falling back to default template: ${(err as Error).message}`,
      );
      kriteria = [];
    }

    // Jika prodi belum punya rubrik custom di database, sediakan rubrik standar formulir vokasi resmi
    if (kriteria.length === 0) {
      if (jenisSidang === 'proposal') {
        return [
          {
            id: 101,
            kode: 'P.1',
            kategori: 'umum',
            nama: 'Sistematika & Kerapian Dokumen Proposal',
            bobot: 20,
            isIndividu: false,
            urutan: 1,
          },
          {
            id: 102,
            kode: 'P.2',
            kategori: 'umum',
            nama: 'Urgensi Masalah & Relevansi Vokasi',
            bobot: 25,
            isIndividu: false,
            urutan: 2,
          },
          {
            id: 103,
            kode: 'P.3',
            kategori: 'umum',
            nama: 'Ketepatan Metodologi & Rancangan Desain',
            bobot: 25,
            isIndividu: false,
            urutan: 3,
          },
          {
            id: 104,
            kode: 'P.4',
            kategori: 'umum',
            nama: 'Presentasi & Penguasaan Materi Ilmiah',
            bobot: 30,
            isIndividu: true,
            urutan: 4,
          },
        ];
      }

      if (jenisSidang === 'kemajuan') {
        return [
          {
            id: 151,
            kode: 'K.1',
            kategori: 'umum',
            nama: 'Kemajuan Pengerjaan Alat / Prototipe (Fisik / Desain)',
            bobot: 35,
            isIndividu: false,
            urutan: 1,
          },
          {
            id: 152,
            kode: 'K.2',
            kategori: 'umum',
            nama: 'Kesesuaian dengan Metodologi & Jadwal Pelaksanaan',
            bobot: 20,
            isIndividu: false,
            urutan: 2,
          },
          {
            id: 153,
            kode: 'K.3',
            kategori: 'umum',
            nama: 'Draft Naskah Laporan Kemajuan (Bab 1 s/d Bab 4)',
            bobot: 20,
            isIndividu: false,
            urutan: 3,
          },
          {
            id: 154,
            kode: 'K.4',
            kategori: 'umum',
            nama: 'Presentasi Kemajuan & Pemahaman Solusi Kendala',
            bobot: 25,
            isIndividu: true,
            urutan: 4,
          },
        ];
      }

      // Standar Sidang Akhir / Tugas Akhir Vokasi (Kategori A, B, C)
      return [
        // KATEGORI A: PEMBIMBINGAN (Individu, Total Bobot 30%)
        {
          id: 201,
          kode: 'A.1',
          kategori: 'pembimbingan',
          nama: 'Kehadiran dan Keaktifan',
          bobot: 20,
          isIndividu: true,
          urutan: 1,
        },
        {
          id: 202,
          kode: 'A.2',
          kategori: 'pembimbingan',
          nama: 'Inisiatif, Kreatifitas, Kemampuan Akademis dan Kecepatan Kerja/Tugas',
          bobot: 30,
          isIndividu: true,
          urutan: 2,
        },
        {
          id: 203,
          kode: 'A.3',
          kategori: 'pembimbingan',
          nama: 'Sikap dan Perilaku',
          bobot: 15,
          isIndividu: true,
          urutan: 3,
        },
        {
          id: 204,
          kode: 'A.4',
          kategori: 'pembimbingan',
          nama: 'Kedisiplinan',
          bobot: 15,
          isIndividu: true,
          urutan: 4,
        },
        {
          id: 205,
          kode: 'A.5',
          kategori: 'pembimbingan',
          nama: 'Kerjasama Kelompok',
          bobot: 20,
          isIndividu: true,
          urutan: 5,
        },

        // KATEGORI B: ALAT / MESIN (Kelompok, Total Bobot 35%)
        {
          id: 206,
          kode: 'B.1',
          kategori: 'alat_mesin',
          nama: 'Konstruksi alat dan tingkat kompleksitas',
          bobot: 35,
          isIndividu: false,
          urutan: 6,
        },
        {
          id: 207,
          kode: 'B.2',
          kategori: 'alat_mesin',
          nama: 'Pengoperasian dan fungsi alat/ mesin',
          bobot: 40,
          isIndividu: false,
          urutan: 7,
        },
        {
          id: 208,
          kode: 'B.3',
          kategori: 'alat_mesin',
          nama: 'Estetika dan keamanan',
          bobot: 25,
          isIndividu: false,
          urutan: 8,
        },

        // KATEGORI C: LAPORAN TUGAS AKHIR (Kelompok, Total Bobot 35%)
        {
          id: 209,
          kode: 'C.1',
          kategori: 'laporan',
          nama: 'Bagian awal (sampul, daftar isi, dll)',
          bobot: 5,
          isIndividu: false,
          urutan: 9,
        },
        {
          id: 210,
          kode: 'C.2',
          kategori: 'laporan',
          nama: 'Bab 1. Pendahuluan (latar belakang, tujuan dll)',
          bobot: 10,
          isIndividu: false,
          urutan: 10,
        },
        {
          id: 211,
          kode: 'C.3',
          kategori: 'laporan',
          nama: 'Bab 2. Tinjauan Pustaka',
          bobot: 10,
          isIndividu: false,
          urutan: 11,
        },
        {
          id: 212,
          kode: 'C.4',
          kategori: 'laporan',
          nama: 'Bab 3. Metodologi Penelitian',
          bobot: 15,
          isIndividu: false,
          urutan: 12,
        },
        {
          id: 213,
          kode: 'C.5.A',
          kategori: 'laporan',
          nama: 'Bab 4. Hasil & Pembahasan: Pemilihan dan Perhitungan Kekuatan Bahan',
          bobot: 15,
          isIndividu: false,
          urutan: 13,
        },
        {
          id: 214,
          kode: 'C.5.B',
          kategori: 'laporan',
          nama: 'Bab 4. Hasil & Pembahasan: Data Pengujian alat/ mesin',
          bobot: 10,
          isIndividu: false,
          urutan: 14,
        },
        {
          id: 215,
          kode: 'C.6',
          kategori: 'laporan',
          nama: 'Bab 5. Kesimpulan & Saran',
          bobot: 5,
          isIndividu: false,
          urutan: 15,
        },
        {
          id: 216,
          kode: 'C.7',
          kategori: 'laporan',
          nama: 'Daftar Pustaka',
          bobot: 5,
          isIndividu: false,
          urutan: 16,
        },
        {
          id: 217,
          kode: 'C.8',
          kategori: 'laporan',
          nama: 'Gambar Susunan & Gambar Bagian',
          bobot: 15,
          isIndividu: false,
          urutan: 17,
        },
        {
          id: 218,
          kode: 'C.9',
          kategori: 'laporan',
          nama: 'Pemakaian tata bahasa dan sistematika penulisan',
          bobot: 10,
          isIndividu: false,
          urutan: 18,
        },
      ];
    }

    return kriteria;
  }

  /**
   * Dosen Penguji / Pembimbing menginput nilai kriteria & catatan revisi
   * Mendukung skala 0 - 10 dan perhitungan bobot kategori (30% A + 35% B + 35% C)
   */
  static async inputNilaiPenguji(taId: number, sidangId: number, input: InputNilaiSidangInput, user: UserPayload) {
    const isStaff = hasRole(user, ['super_admin', 'admin', 'prodi', 'kaprodi', 'lppm']);
    const isDosen = hasRole(user, ['dosen']);

    if (!isStaff && !isDosen) {
      throw new Error('Akses ditolak. Hanya dosen penguji, pembimbing, atau prodi yang dapat mengisi nilai sidang.');
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

    const [sidang] = await db.select().from(tugasAkhirSidang).where(eq(tugasAkhirSidang.id, sidangId)).limit(1);
    if (!sidang) throw new Error('Sidang tidak ditemukan.');

    const kriteriaList = await this.getRubrikKriteria(taId, sidang.jenisSidang);
    const kriteriaMap = new Map(kriteriaList.map((k) => [k.id, k]));

    return await db.transaction(async (tx) => {
      // 1. Simpan detail per kriteria jika ada di DB
      // Kriteria mock (id >= 100) jika belum ada di DB dilewati untuk insert detail agar tidak melanggar foreign key
      for (const item of input.nilaiList) {
        const krit = kriteriaMap.get(item.kriteriaId);
        if (krit && 'createdAt' in krit) {
          // Kriteria resmi tersimpan di DB
          await tx
            .insert(tugasAkhirNilaiDetail)
            .values({
              pengujiId: pengujiRow!.id,
              mahasiswaId: item.mahasiswaId,
              kriteriaId: item.kriteriaId,
              nilai: String(item.nilai),
            })
            .onConflictDoUpdate({
              target: [
                tugasAkhirNilaiDetail.pengujiId,
                tugasAkhirNilaiDetail.mahasiswaId,
                tugasAkhirNilaiDetail.kriteriaId,
              ],
              set: {
                nilai: String(item.nilai),
                updatedAt: new Date(),
              },
            });
        }
      }

      // 2. Hitung nilai total penguji berbobot
      // Cek apakah rubrik memiliki kategori pembimbingan / alat / laporan
      const hasCategories = Array.from(kriteriaMap.values()).some(
        (k) => k.kategori === 'pembimbingan' || k.kategori === 'alat_mesin' || k.kategori === 'laporan',
      );

      let avgNilai = '0.00';
      if (hasCategories) {
        // Hitung Subtotal A, B, C berbobot
        let subtotalA = 0;
        let bobotA = 0;
        let subtotalB = 0;
        let bobotB = 0;
        let subtotalC = 0;
        let bobotC = 0;

        for (const item of input.nilaiList) {
          const krit = kriteriaMap.get(item.kriteriaId);
          if (!krit) continue;
          const val = Number(item.nilai);
          const weight = Number(krit.bobot) || 0;

          if (krit.kategori === 'pembimbingan') {
            subtotalA += (val * weight) / 100;
            bobotA += weight;
          } else if (krit.kategori === 'alat_mesin') {
            subtotalB += (val * weight) / 100;
            bobotB += weight;
          } else if (krit.kategori === 'laporan') {
            subtotalC += (val * weight) / 100;
            bobotC += weight;
          }
        }

        // Normalisasi jika bobot terisi
        const normA = bobotA > 0 ? (subtotalA / bobotA) * 100 : 0;
        const normB = bobotB > 0 ? (subtotalB / bobotB) * 100 : 0;
        const normC = bobotC > 0 ? (subtotalC / bobotC) * 100 : 0;

        // Formula resmi: 30% A + 35% B + 35% C
        let calculated = 0;
        if (bobotA > 0 && (bobotB > 0 || bobotC > 0)) {
          calculated = 0.3 * normA + 0.35 * normB + 0.35 * normC;
        } else if (bobotB > 0 || bobotC > 0) {
          // Jika murni penguji (hanya menilai alat & naskah laporan 50:50 dari bobot 70%)
          const sumWeightBC = (bobotB > 0 ? 0.35 : 0) + (bobotC > 0 ? 0.35 : 0);
          calculated = sumWeightBC > 0 ? (0.35 * normB + 0.35 * normC) / sumWeightBC : 0;
        } else if (bobotA > 0) {
          calculated = normA;
        }

        avgNilai = calculated.toFixed(2);
      } else {
        // Fallback rubrik proporsional sederhana
        let sumNilai = 0;
        let totalBobot = 0;
        for (const item of input.nilaiList) {
          const krit = kriteriaMap.get(item.kriteriaId);
          const weight = krit ? Number(krit.bobot) || 1 : 1;
          sumNilai += Number(item.nilai) * weight;
          totalBobot += weight;
        }
        avgNilai = totalBobot > 0 ? (sumNilai / totalBobot).toFixed(2) : '0.00';
      }

      await tx
        .update(tugasAkhirPenguji)
        .set({
          kehadiran: true,
          nilaiTotal: avgNilai,
          catatanRevisi: input.catatanRevisi !== undefined ? input.catatanRevisi?.trim() : undefined,
        })
        .where(eq(tugasAkhirPenguji.id, pengujiRow!.id));

      const mutu = TugasAkhirSidangService.konversiNilaiBpa(Number(avgNilai));

      return {
        message: 'Nilai ujian dan catatan penguji berhasil disimpan.',
        nilaiTotal: avgNilai,
        hurufMutu: mutu.huruf,
        indeksMutu: mutu.indeks,
      };
    });
  }

  /**
   * Finalisasi Sidang & Penentuan Hasil (Lulus / Sidang Ulang) oleh Kaprodi / Tim Penguji
   * Skala Nilai 0 - 10 & Konversi Huruf Mutu BPA
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
      const { huruf } = TugasAkhirSidangService.konversiNilaiBpa(num);

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

      // Sinkronisasi otomatis ke pengajuan_yudisium untuk seluruh anggota tim saat TA lulus
      if (nextTaStatus === 'lulus') {
        const anggotaList = await tx
          .select({ mahasiswaId: tugasAkhirAnggota.mahasiswaId })
          .from(tugasAkhirAnggota)
          .where(and(eq(tugasAkhirAnggota.tugasAkhirId, taId), eq(tugasAkhirAnggota.statusKonfirmasi, 'diterima')));

        for (const ang of anggotaList) {
          const [existingYudisium] = await tx
            .select({ id: pengajuanYudisium.id })
            .from(pengajuanYudisium)
            .where(eq(pengajuanYudisium.mahasiswaId, ang.mahasiswaId))
            .limit(1);

          if (existingYudisium) {
            await tx
              .update(pengajuanYudisium)
              .set({
                judulTa: ta.judul,
                updatedAt: new Date(),
              })
              .where(eq(pengajuanYudisium.id, existingYudisium.id));
          } else {
            await tx.insert(pengajuanYudisium).values({
              mahasiswaId: ang.mahasiswaId,
              judulTa: ta.judul,
              skorToefl: 450,
              bebasPerpustakaan: false,
              bebasLab: false,
              buktiPembayaranWisuda: false,
              status: 'diajukan',
            });
          }
        }
      }

      return finalizedSidang;
    });
  }

  /**
   * Rekapitulasi Nilai Sidang untuk Ekspor Excel / CSV (kompatibel dengan /input-nilai)
   */
  static async getRekapNilaiSidang(taId: number, sidangId: number) {
    const [ta] = await db
      .select({
        id: tugasAkhir.id,
        kodeTa: tugasAkhir.kodeTa,
        judul: tugasAkhir.judul,
        jenisKarya: tugasAkhir.jenisKarya,
        programStudiId: tugasAkhir.programStudiId,
        prodiNama: programStudi.nama,
        status: tugasAkhir.status,
      })
      .from(tugasAkhir)
      .leftJoin(programStudi, eq(tugasAkhir.programStudiId, programStudi.id))
      .where(eq(tugasAkhir.id, taId))
      .limit(1);

    if (!ta) throw new Error('Data tugas akhir tidak ditemukan.');

    const [sidang] = await db
      .select()
      .from(tugasAkhirSidang)
      .where(and(eq(tugasAkhirSidang.id, sidangId), eq(tugasAkhirSidang.tugasAkhirId, taId)))
      .limit(1);

    if (!sidang) throw new Error('Data sidang tidak ditemukan.');

    const anggotaList = await db
      .select({
        id: tugasAkhirAnggota.id,
        mahasiswaId: tugasAkhirAnggota.mahasiswaId,
        nim: mahasiswa.nim,
        nama: mahasiswa.nama,
        peran: tugasAkhirAnggota.peran,
      })
      .from(tugasAkhirAnggota)
      .innerJoin(mahasiswa, eq(tugasAkhirAnggota.mahasiswaId, mahasiswa.id))
      .where(eq(tugasAkhirAnggota.tugasAkhirId, taId))
      .orderBy(asc(tugasAkhirAnggota.id));

    const pengujiList = await db
      .select({
        id: tugasAkhirPenguji.id,
        dosenId: tugasAkhirPenguji.dosenId,
        dosenNama: dosen.nama,
        dosenNip: dosen.nip,
        peranPenguji: tugasAkhirPenguji.peranPenguji,
        kehadiran: tugasAkhirPenguji.kehadiran,
        nilaiTotal: tugasAkhirPenguji.nilaiTotal,
        catatanRevisi: tugasAkhirPenguji.catatanRevisi,
        statusAccRevisi: tugasAkhirPenguji.statusAccRevisi,
        accRevisiAt: tugasAkhirPenguji.accRevisiAt,
      })
      .from(tugasAkhirPenguji)
      .leftJoin(dosen, eq(tugasAkhirPenguji.dosenId, dosen.id))
      .where(eq(tugasAkhirPenguji.sidangId, sidangId))
      .orderBy(asc(tugasAkhirPenguji.id));

    const nilaiAkhirNum = Number(sidang.nilaiAkhirAngka || 0);
    const mutuBpa = TugasAkhirSidangService.konversiNilaiBpa(nilaiAkhirNum);

    // Format baris ekspor per mahasiswa (kompatibel impor CSV /input-nilai)
    const exportRows = anggotaList.map((mhs, idx) => ({
      no: idx + 1,
      nim: mhs.nim,
      nama: mhs.nama,
      peran: mhs.peran === 'ketua' ? 'Ketua Tim' : 'Anggota Tim',
      judulTa: ta.judul,
      programStudi: ta.prodiNama || '-',
      jenisSidang: sidang.jenisSidang === 'proposal' ? 'Seminar Proposal' : 'Sidang Akhir',
      tanggalSidang: sidang.tanggalSidang || '-',
      ruangan: sidang.ruangan || '-',
      nilaiAkhir: nilaiAkhirNum.toFixed(2), // Skala 0 - 10
      nilaiAkhirSkala100: (nilaiAkhirNum * 10).toFixed(2), // Skala 0 - 100
      hurufMutu: sidang.nilaiAkhirHuruf || mutuBpa.huruf,
      indeksMutu: mutuBpa.indeks.toFixed(2),
      statusHasil: (sidang.statusHasil || '').replace(/_/g, ' ').toUpperCase(),
      statusRevisi: (sidang.statusRevisi || '').replace(/_/g, ' ').toUpperCase(),
      catatanSidang: sidang.catatanSidang || '-',
    }));

    return {
      tugasAkhir: ta,
      sidang,
      timPenguji: pengujiList,
      anggotaList,
      exportRows,
    };
  }

  /**
   * Mahasiswa mengunggah naskah revisi pasca sidang
   */
  static async submitRevisiNaskah(
    taId: number,
    sidangId: number,
    input: { fileRevisiUrl: string; catatanMahasiswa?: string | null },
    user: UserPayload,
  ) {
    const [sidang] = await db
      .select()
      .from(tugasAkhirSidang)
      .where(and(eq(tugasAkhirSidang.id, sidangId), eq(tugasAkhirSidang.tugasAkhirId, taId)))
      .limit(1);

    if (!sidang) throw new Error('Data sidang tidak ditemukan.');

    const currentBerkas = (sidang.berkasSyarat as Record<string, unknown>) || {};
    const updatedBerkas = {
      ...currentBerkas,
      fileRevisiUrl: input.fileRevisiUrl.trim(),
      catatanRevisiMahasiswa: input.catatanMahasiswa?.trim() || null,
      revisiUploadedAt: new Date().toISOString(),
    };

    await db
      .update(tugasAkhirSidang)
      .set({
        berkasSyarat: updatedBerkas,
        statusRevisi: 'diverifikasi_penguji',
        updatedAt: new Date(),
      })
      .where(eq(tugasAkhirSidang.id, sidangId));

    return {
      message: 'Naskah revisi berhasil dikirim untuk diverifikasi dewan penguji.',
      berkasSyarat: updatedBerkas,
      statusRevisi: 'diverifikasi_penguji',
    };
  }

  /**
   * Dosen Penguji / Kaprodi menyetujui revisi naskah (ACC Revisi)
   */
  static async accRevisiPenguji(taId: number, sidangId: number, pengujiId: number, user: UserPayload) {
    const [penguji] = await db
      .select()
      .from(tugasAkhirPenguji)
      .where(and(eq(tugasAkhirPenguji.id, pengujiId), eq(tugasAkhirPenguji.sidangId, sidangId)))
      .limit(1);

    if (!penguji) throw new Error('Data dosen penguji sidang tidak ditemukan.');

    // Hak akses: Dosen yang bersangkutan atau Staf Prodi/Admin
    const isStaff = hasRole(user, ['super_admin', 'admin', 'prodi', 'kaprodi']);
    if (!isStaff) {
      const [dosenRow] = await db.select({ id: dosen.id }).from(dosen).where(eq(dosen.email, user.email)).limit(1);
      if (!dosenRow || dosenRow.id !== penguji.dosenId) {
        throw new Error('Akses ditolak. Anda bukan dosen penguji yang ditugaskan.');
      }
    }

    return await db.transaction(async (tx) => {
      await tx
        .update(tugasAkhirPenguji)
        .set({
          statusAccRevisi: true,
          accRevisiAt: new Date(),
        })
        .where(eq(tugasAkhirPenguji.id, pengujiId));

      // Cek apakah seluruh penguji sudah memberikan ACC Revisi
      const allPenguji = await tx.select().from(tugasAkhirPenguji).where(eq(tugasAkhirPenguji.sidangId, sidangId));

      const isAllAcc = allPenguji.every((p) => (p.id === pengujiId ? true : p.statusAccRevisi));

      let sidangUpdatedStatus = 'diverifikasi_penguji';
      if (isAllAcc) {
        sidangUpdatedStatus = 'tuntas';
        await tx
          .update(tugasAkhirSidang)
          .set({
            statusRevisi: 'tuntas',
            updatedAt: new Date(),
          })
          .where(eq(tugasAkhirSidang.id, sidangId));

        // Jika ini sidang akhir dan berstatus lulus, update status TA menjadi lulus
        const [sidangRow] = await tx.select().from(tugasAkhirSidang).where(eq(tugasAkhirSidang.id, sidangId)).limit(1);

        if (
          sidangRow &&
          sidangRow.jenisSidang === 'akhir' &&
          ['lulus_tanpa_revisi', 'lulus_dengan_revisi'].includes(sidangRow.statusHasil)
        ) {
          await tx.update(tugasAkhir).set({ status: 'lulus', updatedAt: new Date() }).where(eq(tugasAkhir.id, taId));

          await tx.insert(tugasAkhirStatusLog).values({
            tugasAkhirId: taId,
            dariStatus: 'revisi',
            keStatus: 'lulus',
            alasan: 'Seluruh dewan penguji telah menyetujui revisi naskah akhir (Revisi Tuntas).',
            olehUserId: user.id,
          });

          // Sinkronisasi otomatis ke pengajuan_yudisium untuk seluruh anggota tim
          const [taRow] = await tx.select().from(tugasAkhir).where(eq(tugasAkhir.id, taId)).limit(1);
          const anggotaList = await tx
            .select({ mahasiswaId: tugasAkhirAnggota.mahasiswaId })
            .from(tugasAkhirAnggota)
            .where(and(eq(tugasAkhirAnggota.tugasAkhirId, taId), eq(tugasAkhirAnggota.statusKonfirmasi, 'diterima')));

          for (const ang of anggotaList) {
            const [existingYudisium] = await tx
              .select({ id: pengajuanYudisium.id })
              .from(pengajuanYudisium)
              .where(eq(pengajuanYudisium.mahasiswaId, ang.mahasiswaId))
              .limit(1);

            if (existingYudisium) {
              await tx
                .update(pengajuanYudisium)
                .set({
                  judulTa: taRow?.judul || '',
                  updatedAt: new Date(),
                })
                .where(eq(pengajuanYudisium.id, existingYudisium.id));
            } else {
              await tx.insert(pengajuanYudisium).values({
                mahasiswaId: ang.mahasiswaId,
                judulTa: taRow?.judul || '',
                skorToefl: 450,
                bebasPerpustakaan: false,
                bebasLab: false,
                buktiPembayaranWisuda: false,
                status: 'diajukan',
              });
            }
          }
        }
      }

      return {
        message: isAllAcc
          ? 'Seluruh dewan penguji telah menyetujui revisi. Status revisi TUNTAS.'
          : 'Persetujuan revisi berhasil dicatat.',
        statusAccRevisi: true,
        isAllAcc,
        statusRevisi: sidangUpdatedStatus,
      };
    });
  }

  /**
   * Rekapitulasi Sidang Kolektif (Batch Export untuk Excel & CSV /input-nilai)
   * Mengumpulkan seluruh sidang yang telah memiliki jadwal / nilai pada prodi & periode terpilih
   */
  static async getRekapKolektifSidang(
    filters: {
      periodeId?: string;
      programStudiId?: number;
      jenisSidang?: 'proposal' | 'kemajuan' | 'akhir' | 'semua';
      statusHasil?: string;
    },
    user: UserPayload,
  ) {
    const isStaff = hasRole(user, ['super_admin', 'admin', 'prodi', 'kaprodi', 'lppm']);
    if (!isStaff) {
      throw new Error('Akses ditolak. Hanya staf prodi, kaprodi, dan admin yang dapat mengakses rekap kolektif.');
    }

    const conditions = [];

    if (filters.periodeId) {
      conditions.push(eq(tugasAkhirSidang.periodeId, filters.periodeId));
    }
    if (filters.programStudiId) {
      conditions.push(eq(tugasAkhir.programStudiId, filters.programStudiId));
    }
    if (filters.jenisSidang && filters.jenisSidang !== 'semua') {
      conditions.push(eq(tugasAkhirSidang.jenisSidang, filters.jenisSidang));
    }
    if (filters.statusHasil && filters.statusHasil !== 'semua') {
      conditions.push(eq(tugasAkhirSidang.statusHasil, filters.statusHasil));
    }

    const sidangs = await db
      .select({
        sidangId: tugasAkhirSidang.id,
        tugasAkhirId: tugasAkhirSidang.tugasAkhirId,
        jenisSidang: tugasAkhirSidang.jenisSidang,
        periodeId: tugasAkhirSidang.periodeId,
        tanggalSidang: tugasAkhirSidang.tanggalSidang,
        jamMulai: tugasAkhirSidang.jamMulai,
        jamSelesai: tugasAkhirSidang.jamSelesai,
        ruangan: tugasAkhirSidang.ruangan,
        statusHasil: tugasAkhirSidang.statusHasil,
        statusRevisi: tugasAkhirSidang.statusRevisi,
        nilaiAkhirAngka: tugasAkhirSidang.nilaiAkhirAngka,
        nilaiAkhirHuruf: tugasAkhirSidang.nilaiAkhirHuruf,
        catatanSidang: tugasAkhirSidang.catatanSidang,
        kodeTa: tugasAkhir.kodeTa,
        judulTa: tugasAkhir.judul,
        tipeTa: tugasAkhir.tipe,
        programStudiId: tugasAkhir.programStudiId,
        prodiNama: programStudi.nama,
        prodiKode: programStudi.kode,
      })
      .from(tugasAkhirSidang)
      .innerJoin(tugasAkhir, eq(tugasAkhirSidang.tugasAkhirId, tugasAkhir.id))
      .leftJoin(programStudi, eq(tugasAkhir.programStudiId, programStudi.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(tugasAkhirSidang.tanggalSidang), asc(tugasAkhirSidang.id));

    if (sidangs.length === 0) {
      return {
        totalSidang: 0,
        totalMahasiswa: 0,
        exportRows: [],
      };
    }

    const sidangIds = sidangs.map((s) => s.sidangId);
    const taIds = [...new Set(sidangs.map((s) => s.tugasAkhirId))];

    const anggotaList = await db
      .select({
        id: tugasAkhirAnggota.id,
        tugasAkhirId: tugasAkhirAnggota.tugasAkhirId,
        mahasiswaId: tugasAkhirAnggota.mahasiswaId,
        nim: mahasiswa.nim,
        nama: mahasiswa.nama,
        peran: tugasAkhirAnggota.peran,
      })
      .from(tugasAkhirAnggota)
      .innerJoin(mahasiswa, eq(tugasAkhirAnggota.mahasiswaId, mahasiswa.id))
      .where(inArray(tugasAkhirAnggota.tugasAkhirId, taIds))
      .orderBy(asc(tugasAkhirAnggota.id));

    const anggotaMap = new Map<number, typeof anggotaList>();
    for (const a of anggotaList) {
      if (!anggotaMap.has(a.tugasAkhirId)) {
        anggotaMap.set(a.tugasAkhirId, []);
      }
      anggotaMap.get(a.tugasAkhirId)!.push(a);
    }

    const pembimbingList = await db
      .select({
        tugasAkhirId: tugasAkhirPembimbing.tugasAkhirId,
        peran: tugasAkhirPembimbing.peran,
        dosenNama: dosen.nama,
        namaEksternal: tugasAkhirPembimbing.namaEksternal,
      })
      .from(tugasAkhirPembimbing)
      .leftJoin(dosen, eq(tugasAkhirPembimbing.dosenId, dosen.id))
      .where(inArray(tugasAkhirPembimbing.tugasAkhirId, taIds));

    const pembimbingMap = new Map<number, { p1?: string; p2?: string }>();
    for (const p of pembimbingList) {
      const nama = p.dosenNama || p.namaEksternal || '-';
      if (!pembimbingMap.has(p.tugasAkhirId)) {
        pembimbingMap.set(p.tugasAkhirId, {});
      }
      const entry = pembimbingMap.get(p.tugasAkhirId)!;
      if (p.peran === 'pembimbing_1') entry.p1 = nama;
      else if (p.peran === 'pembimbing_2') entry.p2 = nama;
    }

    const pengujiList = await db
      .select({
        sidangId: tugasAkhirPenguji.sidangId,
        dosenNama: dosen.nama,
        peranPenguji: tugasAkhirPenguji.peranPenguji,
      })
      .from(tugasAkhirPenguji)
      .leftJoin(dosen, eq(tugasAkhirPenguji.dosenId, dosen.id))
      .where(inArray(tugasAkhirPenguji.sidangId, sidangIds));

    const pengujiMap = new Map<number, string[]>();
    for (const p of pengujiList) {
      if (!pengujiMap.has(p.sidangId)) {
        pengujiMap.set(p.sidangId, []);
      }
      pengujiMap.get(p.sidangId)!.push(`${p.dosenNama || '-'} (${p.peranPenguji})`);
    }

    let counter = 1;
    const exportRows = [];

    for (const s of sidangs) {
      const mhsList = anggotaMap.get(s.tugasAkhirId) || [];
      const pembimbing = pembimbingMap.get(s.tugasAkhirId) || {};
      const penguji = (pengujiMap.get(s.sidangId) || []).join('; ');

      const nilaiAkhirNum = Number(s.nilaiAkhirAngka || 0);
      const mutuBpa = TugasAkhirSidangService.konversiNilaiBpa(nilaiAkhirNum);

      for (const mhs of mhsList) {
        exportRows.push({
          no: counter++,
          nim: mhs.nim,
          nama: mhs.nama,
          peran: mhs.peran === 'ketua' ? 'Ketua Tim' : 'Anggota Tim',
          kodeTa: s.kodeTa || '-',
          judulTa: s.judulTa,
          programStudi: s.prodiNama || '-',
          periodeId: s.periodeId || '-',
          jenisSidang: s.jenisSidang === 'proposal' ? 'Seminar Proposal' : 'Sidang Akhir',
          tanggalSidang: s.tanggalSidang || '-',
          ruangan: s.ruangan || '-',
          pembimbing1: pembimbing.p1 || '-',
          pembimbing2: pembimbing.p2 || '-',
          dewanPenguji: penguji || '-',
          nilaiAkhir: nilaiAkhirNum > 0 ? nilaiAkhirNum.toFixed(2) : '-',
          nilaiAkhirSkala100: nilaiAkhirNum > 0 ? (nilaiAkhirNum * 10).toFixed(2) : '-',
          hurufMutu: s.nilaiAkhirHuruf || (nilaiAkhirNum > 0 ? mutuBpa.huruf : '-'),
          indeksMutu: nilaiAkhirNum > 0 ? mutuBpa.indeks.toFixed(2) : '-',
          statusHasil: (s.statusHasil || '').replace(/_/g, ' ').toUpperCase(),
          statusRevisi: (s.statusRevisi || '').replace(/_/g, ' ').toUpperCase(),
          catatanSidang: s.catatanSidang || '-',
        });
      }
    }

    return {
      totalSidang: sidangs.length,
      totalMahasiswa: exportRows.length,
      exportRows,
    };
  }
}
