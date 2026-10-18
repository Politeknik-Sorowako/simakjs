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

      return finalizedSidang;
    });
  }
}
