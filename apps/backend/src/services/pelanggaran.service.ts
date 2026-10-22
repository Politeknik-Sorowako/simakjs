import { and, count, desc, eq, ilike, inArray, or, SQL, sql, sum } from 'drizzle-orm';
import {
  dosen,
  mahasiswa,
  notifications,
  pasalPelanggaran,
  pelanggaran,
  pengajuanCuti,
  periodeAkademik,
  programStudi,
  userProdiScopes,
  userRoles,
  users,
} from '../models/schema';
import { db } from '../utils/db';
import { KhsService } from './khs.service';

export function hitungPredikatTxly(totalPoin: number): string {
  if (totalPoin <= 0) return '-';
  const t = Math.floor(totalPoin / 4);
  const l = totalPoin % 4;
  if (t > 0 && l > 0) return `T${t}L${l}`;
  if (t > 0 && l === 0) return `T${t}`;
  if (t === 0 && l > 0) return `L${l}`;
  return '-';
}

export function hitungDegradasiNilaiSikap(totalPoin: number): number {
  const t = Math.floor(totalPoin / 4);
  const l = totalPoin % 4;
  // Sesuai BPA Politeknik Sorowako: Lisan = -0.25, Tertulis = -1.00
  return Number((t * 1.0 + l * 0.25).toFixed(2));
}

export type StatusPelanggaranSemester = 'Skorsing' | 'Coaching' | 'Awas' | 'Waspada' | '-';
export type StatusPelanggaranAkumulatif = 'Darurat' | 'Gawat' | 'Awas' | 'Waspada' | 'Siaga';

export function hitungStatusPelanggaranSemester(poin: number): StatusPelanggaranSemester {
  if (poin >= 16) return 'Skorsing';
  if (poin >= 8) return 'Coaching';
  if (poin >= 4) return 'Awas';
  if (poin >= 1) return 'Waspada';
  return '-';
}

export function hitungStatusPelanggaranAkumulatif(totalPoin: number): StatusPelanggaranAkumulatif {
  if (totalPoin >= 28) return 'Darurat';
  if (totalPoin >= 24) return 'Gawat';
  if (totalPoin >= 16) return 'Awas';
  if (totalPoin >= 8) return 'Waspada';
  return 'Siaga';
}

export function resolvePeriodeIdFromTanggal(tanggalStr: string): string {
  const d = new Date(tanggalStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
  // Bulan 8-12: Semester Ganjil (tahun ajaran YYYY/YYYY+1 -> kode YYYY1)
  // Bulan 1: Lanjutan Ganjil (tahun ajaran YYYY-1/YYYY -> kode (YYYY-1)1)
  // Bulan 2-7: Semester Genap (tahun ajaran YYYY-1/YYYY -> kode (YYYY-1)2)
  if (month >= 8) {
    return `${year}1`;
  }
  if (month === 1) {
    return `${year - 1}1`;
  }
  return `${year - 1}2`;
}

export function getPreviousPeriodeId(periodeId: string | null): string | null {
  if (!periodeId || periodeId.length < 5) return null;
  const year = parseInt(periodeId.slice(0, 4), 10);
  const term = periodeId.slice(4, 5);
  if (isNaN(year)) return null;
  if (term === '1') {
    return `${year - 1}2`;
  }
  return `${year}1`;
}

export class PelanggaranService {
  static async createPelanggaran(data: {
    mahasiswaId: number;
    tanggal: string;
    jenisPelanggaran?: string;
    keterangan: string;
    pasalId?: number | null;
    jenisSanksi?: number;
    pelapor?: string | null;
    dibuatOleh?: number;
    periodeId?: string | null;
  }) {
    const [mhs] = await db.select().from(mahasiswa).where(eq(mahasiswa.id, data.mahasiswaId));
    if (!mhs) {
      throw new Error('Mahasiswa tidak ditemukan.');
    }

    const rawPasalId = data.pasalId !== undefined && data.pasalId !== null ? Number(data.pasalId) : null;
    const pasalId = rawPasalId && rawPasalId > 0 ? rawPasalId : null;
    let jenisSanksi = data.jenisSanksi ?? 1;
    let jenisPelanggaran = data.jenisPelanggaran ?? '';
    let namaPasal = jenisPelanggaran;

    // Auto-fill jenis pelanggaran & jenis sanksi dari master pasal BPA bila pasal dipilih.
    if (pasalId) {
      const [pasal] = await db.select().from(pasalPelanggaran).where(eq(pasalPelanggaran.id, pasalId));
      if (!pasal) {
        throw new Error('Pasal pelanggaran tidak ditemukan.');
      }
      namaPasal = `${pasal.nomorPasal} - ${pasal.bunyiPasal}`;
      jenisPelanggaran = namaPasal.slice(0, 255);
      jenisSanksi = pasal.jenisSanksi;
    }

    if (!jenisPelanggaran) {
      throw new Error(
        'Jenis pelanggaran tidak boleh kosong. Pilih pasal BPA atau tulis jenis pelanggaran secara manual.',
      );
    }
    if (jenisSanksi !== 1 && jenisSanksi !== 4) {
      throw new Error('Jenis sanksi harus bernilai 1 (Lisan) atau 4 (Tertulis).');
    }

    let namaPelapor = data.pelapor?.trim();
    if (!namaPelapor && data.dibuatOleh) {
      const [creator] = await db.select({ nama: users.nama }).from(users).where(eq(users.id, data.dibuatOleh));
      namaPelapor = creator?.nama || 'Petugas Kedisiplinan';
    } else if (!namaPelapor) {
      namaPelapor = 'Petugas Kedisiplinan';
    }

    let targetPeriodeId = data.periodeId?.trim() || null;
    if (!targetPeriodeId) {
      if (data.tanggal) {
        targetPeriodeId = resolvePeriodeIdFromTanggal(data.tanggal);
      } else {
        const [activePeriod] = await db
          .select({ id: periodeAkademik.id })
          .from(periodeAkademik)
          .where(eq(periodeAkademik.aktif, true));
        if (activePeriod) {
          targetPeriodeId = activePeriod.id;
        }
      }
    }

    const [newPelanggaran] = await db
      .insert(pelanggaran)
      .values({
        mahasiswaId: data.mahasiswaId,
        tanggal: data.tanggal,
        jenisPelanggaran,
        keterangan: data.keterangan,
        pasalId,
        jenisSanksi,
        pelapor: namaPelapor,
        dibuatOleh: data.dibuatOleh,
        periodeId: targetPeriodeId,
      })
      .returning();

    // Trigger notifikasi peringatan pelanggaran (SP) ke Dosen PA & Kaprodi / Admin Prodi
    try {
      await this.sendPeringatanNotification({
        mahasiswa: mhs,
        pelanggaran: newPelanggaran,
        namaPasal,
        namaPelapor,
      });
    } catch (notifErr) {
      console.error('[PelanggaranService] Gagal mengirim notifikasi peringatan:', notifErr);
    }

    return newPelanggaran;
  }

  static async sendPeringatanNotification(ctx: {
    mahasiswa: Pick<typeof mahasiswa.$inferSelect, 'id' | 'nama' | 'nim' | 'dosenPaId' | 'programStudiId'>;
    pelanggaran: typeof pelanggaran.$inferSelect;
    namaPasal: string;
    namaPelapor: string;
  }) {
    const { mahasiswa: mhs, pelanggaran: pel, namaPasal, namaPelapor } = ctx;

    // Hitung total poin pelanggaran mahasiswa
    const allViolations = await db
      .select({ jenisSanksi: pelanggaran.jenisSanksi })
      .from(pelanggaran)
      .where(eq(pelanggaran.mahasiswaId, mhs.id));

    const totalPoin = allViolations.reduce((acc, v) => acc + (v.jenisSanksi || 1), 0);

    // Tentukan Tingkat Peringatan / SP sesuai ketentuan BPA
    let tingkatSp = 'Peringatan Lisan';
    if (totalPoin >= 75) {
      tingkatSp = 'Surat Peringatan 3 (SP-3 / Diberhentikan)';
    } else if (totalPoin >= 50) {
      tingkatSp = 'Surat Peringatan 2 (SP-2 / Skorsing)';
    } else if (totalPoin >= 25) {
      tingkatSp = 'Surat Peringatan 1 (SP-1)';
    } else if (pel.jenisSanksi === 4) {
      tingkatSp = 'Peringatan Tertulis';
    }

    const title = `Notifikasi Peringatan Pelanggaran - ${mhs.nama} (${mhs.nim})`;
    const message = `Telah diterbitkan ${tingkatSp} untuk mahasiswa ${mhs.nama} (NIM: ${mhs.nim}) atas pasal pelanggaran ${namaPasal}. Dilaporkan oleh: ${namaPelapor}.`;
    const link = '/pelanggaran';

    const recipientUserIds = new Set<number>();

    // 1. Dosen PA
    if (mhs.dosenPaId) {
      const [dosenRow] = await db.select({ email: dosen.email }).from(dosen).where(eq(dosen.id, mhs.dosenPaId));
      if (dosenRow?.email) {
        const [dosenUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, dosenRow.email));
        if (dosenUser) {
          recipientUserIds.add(dosenUser.id);
        }
      }
    }

    // 2. Kaprodi & Admin Prodi yang memiliki scope program studi sama
    if (mhs.programStudiId) {
      // Ambil user yang memiliki role kaprodi atau prodi (baik via multi-role user_roles maupun primary users.role)
      const prodiRoleUserIds = await db
        .selectDistinct({ userId: userRoles.userId })
        .from(userRoles)
        .where(inArray(userRoles.role, ['kaprodi', 'prodi']));

      const candidateIds = prodiRoleUserIds.map((r) => r.userId);

      const prodiStaffUsers = await db
        .select({
          id: users.id,
          role: users.role,
          isGlobalScope: users.isGlobalScope,
          prodiIds: users.prodiIds,
        })
        .from(users)
        .where(
          candidateIds.length > 0
            ? or(inArray(users.id, candidateIds), inArray(users.role, ['kaprodi', 'prodi']))
            : inArray(users.role, ['kaprodi', 'prodi']),
        );

      // Ambil data userProdiScopes untuk prodi ini
      const scopedRows = await db
        .select({ userId: userProdiScopes.userId })
        .from(userProdiScopes)
        .where(eq(userProdiScopes.programStudiId, mhs.programStudiId));

      const scopedUserIds = new Set(scopedRows.map((s) => s.userId));

      for (const u of prodiStaffUsers) {
        const isGlobal = u.isGlobalScope;
        const inProdiIds = Array.isArray(u.prodiIds) && u.prodiIds.includes(mhs.programStudiId);
        const inScopedTable = scopedUserIds.has(u.id);

        if (isGlobal || inProdiIds || inScopedTable) {
          recipientUserIds.add(u.id);
        }
      }
    }

    // Insert notifikasi ke database
    for (const userId of recipientUserIds) {
      try {
        await db.insert(notifications).values({
          userId,
          title: title.slice(0, 255),
          message,
          link,
        });
      } catch (notifErr) {
        console.error(`[PelanggaranService] Gagal membuat notifikasi untuk user ${userId}:`, notifErr);
      }
    }
  }

  static async getPelanggaranByMahasiswa(mahasiswaId: number) {
    const [mhs] = await db
      .select({
        id: mahasiswa.id,
        nim: mahasiswa.nim,
        nama: mahasiswa.nama,
        foto: mahasiswa.foto,
        angkatan: mahasiswa.angkatan,
        programStudiId: mahasiswa.programStudiId,
        prodiNama: programStudi.nama,
        jenjang: programStudi.jenjang,
        dosenPaId: mahasiswa.dosenPaId,
      })
      .from(mahasiswa)
      .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id))
      .where(eq(mahasiswa.id, mahasiswaId));

    if (!mhs) {
      throw new Error('Mahasiswa tidak ditemukan.');
    }

    const [activePeriode] = await db
      .select({ id: periodeAkademik.id })
      .from(periodeAkademik)
      .where(eq(periodeAkademik.aktif, true));
    const activePeriodeId = activePeriode?.id || null;

    const list = await db
      .select({
        id: pelanggaran.id,
        mahasiswaId: pelanggaran.mahasiswaId,
        nim: mahasiswa.nim,
        namaMahasiswa: mahasiswa.nama,
        foto: mahasiswa.foto,
        prodiNama: programStudi.nama,
        programStudiId: mahasiswa.programStudiId,
        jenjang: programStudi.jenjang,
        dosenPaId: mahasiswa.dosenPaId,
        tanggal: pelanggaran.tanggal,
        jenisPelanggaran: pelanggaran.jenisPelanggaran,
        bobotPoin: sql<number>`COALESCE(${pelanggaran.jenisSanksi}, 1)`,
        keterangan: pelanggaran.keterangan,
        pasalId: pelanggaran.pasalId,
        jenisSanksi: pelanggaran.jenisSanksi,
        pelapor: pelanggaran.pelapor,
        nomorPasal: pasalPelanggaran.nomorPasal,
        bunyiPasal: pasalPelanggaran.bunyiPasal,
        periodeId: pelanggaran.periodeId,
        createdAt: pelanggaran.createdAt,
      })
      .from(pelanggaran)
      .innerJoin(mahasiswa, eq(pelanggaran.mahasiswaId, mahasiswa.id))
      .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id))
      .leftJoin(pasalPelanggaran, eq(pelanggaran.pasalId, pasalPelanggaran.id))
      .where(eq(pelanggaran.mahasiswaId, mahasiswaId))
      .orderBy(desc(pelanggaran.tanggal));

    // Petakan semester untuk setiap pelanggaran berdasarkan periodeId & angkatan mahasiswa
    const semesterMemo = new Map<string, number | null>();
    const getSemester = async (pid: string | null) => {
      if (!pid) return null;
      if (semesterMemo.has(pid)) return semesterMemo.get(pid)!;
      const sem = await KhsService.hitungSemester(mahasiswaId, pid, mhs.angkatan);
      semesterMemo.set(pid, sem);
      return sem;
    };

    const semesterAktif = activePeriodeId ? await getSemester(activePeriodeId) : null;

    const enrichedList = [];
    // Akumulasi per periode untuk rekap per semester
    const perPeriodeMap = new Map<
      string,
      {
        periodeId: string;
        lisan: number;
        tertulis: number;
        poin: number;
      }
    >();

    const previousPeriodeId = getPreviousPeriodeId(activePeriodeId);

    for (const item of list) {
      const pid = item.periodeId || resolvePeriodeIdFromTanggal(item.tanggal);
      const sem = await getSemester(pid);
      enrichedList.push({
        ...item,
        bobotPoin: Number(item.bobotPoin),
        periodeId: pid,
        semester: sem,
      });

      const existing = perPeriodeMap.get(pid) || { periodeId: pid, lisan: 0, tertulis: 0, poin: 0 };
      if (item.jenisSanksi === 1) existing.lisan += 1;
      else if (item.jenisSanksi === 4) existing.tertulis += 1;
      existing.poin += Number(item.bobotPoin);
      perPeriodeMap.set(pid, existing);
    }

    // Hitung rentang semester 1 s.d. semester berjalan (atau semester tertinggi yang tercatat)
    let maxSemester = semesterAktif || 1;
    for (const pid of perPeriodeMap.keys()) {
      const s = await getSemester(pid);
      if (s && s > maxSemester) maxSemester = s;
    }

    const angkatanTahun = mhs.angkatan ? parseInt(mhs.angkatan, 10) : NaN;
    const coveredPeriodIds = new Set<string>();

    // Susun rekapitulasi tiap semester secara berurutan
    const rekapPerSemester = [];
    if (!isNaN(angkatanTahun) && maxSemester >= 1) {
      for (let s = 1; s <= maxSemester; s++) {
        const term = s % 2 === 1 ? '1' : '2';
        const year = angkatanTahun + Math.floor((s - 1) / 2);
        const expectedPid = `${year}${term}`;
        coveredPeriodIds.add(expectedPid);

        const data = perPeriodeMap.get(expectedPid) || {
          periodeId: expectedPid,
          lisan: 0,
          tertulis: 0,
          poin: 0,
        };

        const isBerjalan =
          (semesterAktif !== null && s === semesterAktif) ||
          (activePeriodeId !== null && expectedPid === activePeriodeId);
        const isSemesterLalu =
          (semesterAktif !== null && semesterAktif > 1 && s === semesterAktif - 1) ||
          (previousPeriodeId !== null && expectedPid === previousPeriodeId);

        rekapPerSemester.push({
          semester: s,
          periodeId: expectedPid,
          poin: data.poin,
          lisan: data.lisan,
          tertulis: data.tertulis,
          predikat: hitungPredikatTxly(data.poin),
          degradasi: hitungDegradasiNilaiSikap(data.poin),
          statusSemester: hitungStatusPelanggaranSemester(data.poin),
          isBerjalan,
          isSemesterLalu,
        });
      }
    }

    // Tambahkan periode lain jika ada yang di luar formula standar (misal pergeseran cuti)
    for (const [pid, data] of perPeriodeMap.entries()) {
      if (coveredPeriodIds.has(pid)) continue;
      const sem = (await getSemester(pid)) ?? 0;
      rekapPerSemester.push({
        semester: sem,
        periodeId: pid,
        poin: data.poin,
        lisan: data.lisan,
        tertulis: data.tertulis,
        predikat: hitungPredikatTxly(data.poin),
        degradasi: hitungDegradasiNilaiSikap(data.poin),
        statusSemester: hitungStatusPelanggaranSemester(data.poin),
        isBerjalan: activePeriodeId !== null && pid === activePeriodeId,
        isSemesterLalu: previousPeriodeId !== null && pid === previousPeriodeId,
      });
    }

    rekapPerSemester.sort((a, b) => a.semester - b.semester);

    const totalPoin = list.reduce((acc, item) => acc + Number(item.bobotPoin), 0);

    // Hitung poin semester berjalan
    const activePeriodData = activePeriodeId ? perPeriodeMap.get(activePeriodeId) : null;
    const poinSemesterBerjalan = activePeriodData?.poin || 0;
    const predikatSemesterBerjalan = hitungPredikatTxly(poinSemesterBerjalan);
    const statusSemesterBerjalan = hitungStatusPelanggaranSemester(poinSemesterBerjalan);

    // Hitung poin semester lalu
    const prevPeriodData = previousPeriodeId ? perPeriodeMap.get(previousPeriodeId) : null;
    const poinSemesterLalu = prevPeriodData?.poin || 0;
    const predikatSemesterLalu = hitungPredikatTxly(poinSemesterLalu);
    const statusSemesterLalu = hitungStatusPelanggaranSemester(poinSemesterLalu);

    // Hitung status akumulatif
    const statusAkumulatif = hitungStatusPelanggaranAkumulatif(totalPoin);

    // Evaluasi aturan Skorsing BPA Pasal 32 ayat 2
    const tertulisSmtIni = activePeriodData?.tertulis || 0;
    const totalTertulisKumulatif = list.filter((item) => item.jenisSanksi === 4).length;
    const jenjang = mhs.jenjang || 'D3';
    const batasTertulisKumulatif = jenjang === 'D4' ? 9 : 7;
    const isSkorsingSemester = tertulisSmtIni >= 4;
    const isSkorsingKumulatif = totalTertulisKumulatif >= batasTertulisKumulatif;
    const isSkorsing = isSkorsingSemester || isSkorsingKumulatif;

    let alasanSkorsing: string | null = null;
    if (isSkorsingSemester && isSkorsingKumulatif) {
      alasanSkorsing = `Akumulasi ≥ 4 Tertulis di semester ini & ≥ ${batasTertulisKumulatif} Tertulis kumulatif (${jenjang}) (Pasal 32 ayat 2)`;
    } else if (isSkorsingSemester) {
      alasanSkorsing = 'Akumulasi ≥ 4 Peringatan Tertulis dalam Satu Semester (Pasal 32 ayat 2)';
    } else if (isSkorsingKumulatif) {
      alasanSkorsing = `Akumulasi ≥ ${batasTertulisKumulatif} Peringatan Tertulis Kumulatif Jenjang ${jenjang} (Pasal 32 ayat 2)`;
    }

    const isMendekati = !isSkorsing && (tertulisSmtIni === 3 || totalTertulisKumulatif === batasTertulisKumulatif - 1);

    return {
      pelanggaranList: enrichedList,
      totalPoin,
      predikat: hitungPredikatTxly(totalPoin),
      degradasiNilaiSikap: hitungDegradasiNilaiSikap(totalPoin),
      statusAkumulatif,
      poinSemesterBerjalan,
      predikatSemesterBerjalan,
      statusSemesterBerjalan,
      poinSemesterLalu,
      predikatSemesterLalu,
      statusSemesterLalu,
      semesterAktif,
      jenjang,
      statusSkorsing: {
        isSkorsing,
        alasan: alasanSkorsing,
        isMendekati,
      },
      rekapPerSemester,
    };
  }

  /**
   * Nilai Sikap (NS) mahasiswa per semester sesuai BPA Politeknik Sorowako (Pasal 20).
   * AM awal 4.0; degradasi 0.25 per peringatan Lisan, 1.0 per peringatan Tertulis.
   * Klasifikasi: Istimewa (AM=4.0), Sangat Baik (3.0<AM<4.0), Baik (2.0<AM<=3.0), Cukup (AM<=2.0).
   * Narasi: "{Sebutan} ({AM,2 desimal})".
   */
  static async getNilaiSikap(mahasiswaId: number, periodeId?: string) {
    const conditions = [eq(pelanggaran.mahasiswaId, mahasiswaId)];
    if (periodeId) conditions.push(eq(pelanggaran.periodeId, periodeId));

    const rows = await db
      .select({ jenisSanksi: pelanggaran.jenisSanksi })
      .from(pelanggaran)
      .where(and(...conditions));

    let lisan = 0;
    let tertulis = 0;
    for (const r of rows) {
      if (r.jenisSanksi === 1) lisan += 1;
      else if (r.jenisSanksi === 4) tertulis += 1;
    }

    // Total poin (Lisan=1, Tertulis=4) untuk menurunkan degradasi sesuai formula BPA.
    const totalPoin = lisan * 1 + tertulis * 4;
    const degradasi = hitungDegradasiNilaiSikap(totalPoin);
    const am = Math.max(0, Number((4.0 - degradasi).toFixed(2)));

    let sebutan: string;
    if (am === 4.0) sebutan = 'Istimewa';
    else if (am > 3.0) sebutan = 'Sangat Baik';
    else if (am > 2.0) sebutan = 'Baik';
    else sebutan = 'Cukup';

    return {
      am,
      degradasi,
      sebutan,
      narasi: `${sebutan} (${am.toFixed(2).replace('.', ',')})`,
      lisan,
      tertulis,
      totalPoin,
    };
  }

  static async getAllPelanggaran(page?: number, limit?: number, search?: string, prodiId?: number, periodeId?: string) {
    const conditions = [];
    if (prodiId) conditions.push(eq(mahasiswa.programStudiId, prodiId));
    if (periodeId && periodeId.trim()) conditions.push(eq(pelanggaran.periodeId, periodeId.trim()));
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      conditions.push(or(ilike(mahasiswa.nama, s), ilike(mahasiswa.nim, s), ilike(pelanggaran.jenisPelanggaran, s)));
    }

    const baseQuery = db
      .select({
        id: pelanggaran.id,
        mahasiswaId: pelanggaran.mahasiswaId,
        nim: mahasiswa.nim,
        namaMahasiswa: mahasiswa.nama,
        foto: mahasiswa.foto,
        prodiNama: programStudi.nama,
        programStudiId: mahasiswa.programStudiId,
        jenjang: programStudi.jenjang,
        dosenPaId: mahasiswa.dosenPaId,
        tanggal: pelanggaran.tanggal,
        jenisPelanggaran: pelanggaran.jenisPelanggaran,
        bobotPoin: sql<number>`COALESCE(${pelanggaran.jenisSanksi}, 1)`,
        keterangan: pelanggaran.keterangan,
        pasalId: pelanggaran.pasalId,
        jenisSanksi: pelanggaran.jenisSanksi,
        pelapor: pelanggaran.pelapor,
        nomorPasal: pasalPelanggaran.nomorPasal,
        bunyiPasal: pasalPelanggaran.bunyiPasal,
        periodeId: pelanggaran.periodeId,
        createdAt: pelanggaran.createdAt,
      })
      .from(pelanggaran)
      .innerJoin(mahasiswa, eq(pelanggaran.mahasiswaId, mahasiswa.id))
      .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id))
      .leftJoin(pasalPelanggaran, eq(pelanggaran.pasalId, pasalPelanggaran.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(pelanggaran.tanggal));

    if (page && limit) {
      const offset = (page - 1) * limit;
      const rows = await baseQuery.limit(limit).offset(offset);
      const [{ countVal }] = await db
        .select({ countVal: count(pelanggaran.id) })
        .from(pelanggaran)
        .innerJoin(mahasiswa, eq(pelanggaran.mahasiswaId, mahasiswa.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        data: rows.map((item) => ({ ...item, bobotPoin: Number(item.bobotPoin) })),
        pagination: {
          total: Number(countVal),
          page,
          limit,
          totalPages: Math.ceil(Number(countVal) / limit),
        },
      };
    }

    const rows = await baseQuery;
    return rows.map((item) => ({ ...item, bobotPoin: Number(item.bobotPoin) }));
  }

  static async getRekapPasalTop10(programStudiId?: number, periodeId?: string) {
    const conditions = [];
    if (programStudiId) {
      conditions.push(eq(mahasiswa.programStudiId, programStudiId));
    }
    if (periodeId && periodeId.trim()) {
      conditions.push(eq(pelanggaran.periodeId, periodeId.trim()));
    }

    const rows = await db
      .select({
        pasalId: pelanggaran.pasalId,
        nomorPasal: sql<string>`COALESCE(${pasalPelanggaran.nomorPasal}, 'N/A')`,
        bunyiPasal: sql<string>`COALESCE(${pasalPelanggaran.bunyiPasal}, ${pelanggaran.jenisPelanggaran})`,
        jenisPelanggaran: pelanggaran.jenisPelanggaran,
        jumlah: count(pelanggaran.id),
        totalPoin: sql<number>`COALESCE(SUM(COALESCE(${pelanggaran.jenisSanksi}, 1)), 0)`,
      })
      .from(pelanggaran)
      .innerJoin(mahasiswa, eq(pelanggaran.mahasiswaId, mahasiswa.id))
      .leftJoin(pasalPelanggaran, eq(pelanggaran.pasalId, pasalPelanggaran.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(
        pelanggaran.pasalId,
        pasalPelanggaran.nomorPasal,
        pasalPelanggaran.bunyiPasal,
        pelanggaran.jenisPelanggaran,
      )
      .orderBy(desc(count(pelanggaran.id)));

    const totalPelanggaran = rows.reduce((acc, r) => acc + Number(r.jumlah), 0);
    const totalPoin = rows.reduce((acc, r) => acc + Number(r.totalPoin), 0);

    let perPasal = rows.map((r) => ({
      pasalId: r.pasalId,
      nomorPasal: r.nomorPasal,
      bunyiPasal: r.bunyiPasal,
      jenisPelanggaran: r.jenisPelanggaran,
      jumlah: Number(r.jumlah),
      totalPoin: Number(r.totalPoin),
    }));

    if (perPasal.length > 10) {
      const top10 = perPasal.slice(0, 10);
      const rest = perPasal.slice(10);
      const restJumlah = rest.reduce((acc, r) => acc + r.jumlah, 0);
      const restPoin = rest.reduce((acc, r) => acc + r.totalPoin, 0);

      top10.push({
        pasalId: null,
        nomorPasal: 'Lainnya',
        bunyiPasal: 'Pasal Pelanggaran Lainnya',
        jenisPelanggaran: 'Lainnya',
        jumlah: restJumlah,
        totalPoin: restPoin,
      });
      perPasal = top10;
    }

    return {
      total: totalPelanggaran,
      totalPoin,
      perPasal,
    };
  }

  static async getRekap(programStudiId?: number) {
    const { mahasiswa: mhs, programStudi: ps } = await import('../models/schema');

    const conditions: SQL<unknown>[] = [];
    if (programStudiId) conditions.push(eq(mhs.programStudiId, programStudiId));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totals] = await db
      .select({ totalPelanggaran: count(), totalMahasiswa: sql<number>`count(distinct ${pelanggaran.mahasiswaId})` })
      .from(pelanggaran)
      .innerJoin(mhs, eq(pelanggaran.mahasiswaId, mhs.id))
      .where(whereClause);

    const perJenis = await db
      .select({
        jenis: pelanggaran.jenisPelanggaran,
        jumlah: count(),
        totalPoin: sum(sql`COALESCE(${pelanggaran.jenisSanksi}, 1)`),
      })
      .from(pelanggaran)
      .innerJoin(mhs, eq(pelanggaran.mahasiswaId, mhs.id))
      .where(whereClause)
      .groupBy(pelanggaran.jenisPelanggaran)
      .orderBy(sql`count(*) DESC`);

    const perProdi = await db
      .select({
        prodiId: mhs.programStudiId,
        prodiNama: ps.nama,
        totalPelanggaran: count(),
        totalPoin: sum(sql`COALESCE(${pelanggaran.jenisSanksi}, 1)`),
      })
      .from(pelanggaran)
      .innerJoin(mhs, eq(pelanggaran.mahasiswaId, mhs.id))
      .leftJoin(ps, eq(mhs.programStudiId, ps.id))
      .where(whereClause)
      .groupBy(mhs.programStudiId, ps.nama);

    const topPelanggar = await db
      .select({
        mahasiswaId: pelanggaran.mahasiswaId,
        nim: mhs.nim,
        nama: mhs.nama,
        foto: mhs.foto,
        prodiNama: ps.nama,
        totalPoin: sum(sql`COALESCE(${pelanggaran.jenisSanksi}, 1)`),
        jumlahPelanggaran: count(),
      })
      .from(pelanggaran)
      .innerJoin(mhs, eq(pelanggaran.mahasiswaId, mhs.id))
      .leftJoin(ps, eq(mhs.programStudiId, ps.id))
      .where(whereClause)
      .groupBy(pelanggaran.mahasiswaId, mhs.nim, mhs.nama, mhs.foto, ps.nama)
      .orderBy(sql`SUM(COALESCE(${pelanggaran.jenisSanksi}, 1)) DESC`)
      .limit(programStudiId ? 100 : 50);

    return {
      totalPelanggaran: Number(totals?.totalPelanggaran || 0),
      totalMahasiswa: Number(totals?.totalMahasiswa || 0),
      perJenis: perJenis.map((j) => ({
        jenis: j.jenis,
        jumlah: Number(j.jumlah),
        totalPoin: Number(j.totalPoin || 0),
      })),
      perProdi: perProdi.map((p) => ({
        prodiId: p.prodiId,
        prodiNama: p.prodiNama || '-',
        totalPelanggaran: Number(p.totalPelanggaran),
        totalPoin: Number(p.totalPoin || 0),
      })),
      topPelanggar: topPelanggar.map((t) => ({
        mahasiswaId: t.mahasiswaId,
        nim: t.nim,
        nama: t.nama,
        prodiNama: t.prodiNama || '-',
        totalPoin: Number(t.totalPoin || 0),
        jumlahPelanggaran: Number(t.jumlahPelanggaran),
        predikat: hitungPredikatTxly(Number(t.totalPoin || 0)),
        degradasiNilaiSikap: hitungDegradasiNilaiSikap(Number(t.totalPoin || 0)),
      })),
    };
  }

  static async updatePelanggaran(
    id: number,
    data: Partial<{
      tanggal: string;
      jenisPelanggaran: string;
      keterangan: string;
      pasalId?: number | null;
      jenisSanksi?: number;
      pelapor?: string | null;
      periodeId?: string | null;
    }>,
  ) {
    if (data.jenisSanksi !== undefined && data.jenisSanksi !== 1 && data.jenisSanksi !== 4) {
      throw new Error('Jenis sanksi harus bernilai 1 (Lisan) atau 4 (Tertulis).');
    }
    if (data.pasalId !== undefined) {
      if (data.pasalId === null) {
        // Unlink pasal: only clear pasalId. Keep existing jenisPelanggaran/jenisSanksi
        // unless the caller explicitly overrides them via the update payload.
      } else {
        const [pasal] = await db.select().from(pasalPelanggaran).where(eq(pasalPelanggaran.id, data.pasalId));
        if (!pasal) {
          throw new Error('Pasal pelanggaran tidak ditemukan.');
        }
        data.jenisPelanggaran = `${pasal.nomorPasal} - ${pasal.bunyiPasal}`.slice(0, 255);
        data.jenisSanksi = pasal.jenisSanksi;
      }
    }
    const [updated] = await db.update(pelanggaran).set(data).where(eq(pelanggaran.id, id)).returning();
    return updated || null;
  }

  /**
   * Hard-delete satu catatan pelanggaran. Tidak terhubung dengan kompensasi.
   * Audit log ditulis otomatis oleh `audit.plugin.ts` (hook DELETE).
   */
  static async remove(id: number) {
    const [deleted] = await db.delete(pelanggaran).where(eq(pelanggaran.id, id)).returning();
    return deleted || null;
  }

  static async getMahasiswaPredikatList(filter?: {
    search?: string;
    programStudiIds?: number[];
    periodeId?: string;
    predikat?: string;
  }) {
    // 1. Dapatkan periode aktif untuk acuan semester berjalan
    const [activePeriode] = await db
      .select({ id: periodeAkademik.id })
      .from(periodeAkademik)
      .where(eq(periodeAkademik.aktif, true));
    const targetPeriodeId = filter?.periodeId || activePeriode?.id || null;

    // 2. Susun kondisi filter
    const conditions = [];
    if (filter?.programStudiIds && filter.programStudiIds.length > 0) {
      conditions.push(inArray(mahasiswa.programStudiId, filter.programStudiIds));
    }
    if (filter?.periodeId) {
      conditions.push(eq(pelanggaran.periodeId, filter.periodeId));
    }
    if (filter?.search && filter.search.trim()) {
      const s = `%${filter.search.trim()}%`;
      conditions.push(or(ilike(mahasiswa.nama, s), ilike(mahasiswa.nim, s)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 3. Agregasi pelanggaran kumulatif per mahasiswa
    const rows = await db
      .select({
        mahasiswaId: mahasiswa.id,
        nim: mahasiswa.nim,
        nama: mahasiswa.nama,
        foto: mahasiswa.foto,
        angkatan: mahasiswa.angkatan,
        programStudiId: mahasiswa.programStudiId,
        prodiNama: programStudi.nama,
        jenjang: programStudi.jenjang,
        totalPoin: sql<number>`COALESCE(SUM(COALESCE(${pelanggaran.jenisSanksi}, 1)), 0)`,
        jumlahPelanggaran: count(pelanggaran.id),
      })
      .from(pelanggaran)
      .innerJoin(mahasiswa, eq(pelanggaran.mahasiswaId, mahasiswa.id))
      .leftJoin(programStudi, eq(mahasiswa.programStudiId, programStudi.id))
      .where(whereClause)
      .groupBy(
        mahasiswa.id,
        mahasiswa.nim,
        mahasiswa.nama,
        mahasiswa.foto,
        mahasiswa.angkatan,
        mahasiswa.programStudiId,
        programStudi.nama,
        programStudi.jenjang,
      )
      .orderBy(sql`SUM(COALESCE(${pelanggaran.jenisSanksi}, 1)) DESC`);

    if (rows.length === 0) return [];

    const mahasiswaIds = rows.map((r) => r.mahasiswaId);

    // 4. Agregasi per periode untuk seluruh mahasiswa dalam SATU query (hindari N+1)
    const resolvedPeriodeSql = sql<string>`COALESCE(
      ${pelanggaran.periodeId},
      CASE
        WHEN EXTRACT(MONTH FROM ${pelanggaran.tanggal}) >= 8
          THEN CONCAT(CAST(EXTRACT(YEAR FROM ${pelanggaran.tanggal}) AS INTEGER), '1')
        WHEN EXTRACT(MONTH FROM ${pelanggaran.tanggal}) = 1
          THEN CONCAT(CAST(EXTRACT(YEAR FROM ${pelanggaran.tanggal}) - 1 AS INTEGER), '1')
        ELSE CONCAT(CAST(EXTRACT(YEAR FROM ${pelanggaran.tanggal}) - 1 AS INTEGER), '2')
      END
    )`;

    const perPeriodeRows = await db
      .select({
        mahasiswaId: pelanggaran.mahasiswaId,
        periodeId: resolvedPeriodeSql,
        poin: sql<number>`COALESCE(SUM(COALESCE(${pelanggaran.jenisSanksi}, 1)), 0)`,
        lisan: sql<number>`COALESCE(SUM(CASE WHEN ${pelanggaran.jenisSanksi} = 1 THEN 1 ELSE 0 END), 0)`,
        tertulis: sql<number>`COALESCE(SUM(CASE WHEN ${pelanggaran.jenisSanksi} = 4 THEN 1 ELSE 0 END), 0)`,
        count: count(pelanggaran.id),
      })
      .from(pelanggaran)
      .innerJoin(mahasiswa, eq(pelanggaran.mahasiswaId, mahasiswa.id))
      .where(whereClause)
      .groupBy(pelanggaran.mahasiswaId, resolvedPeriodeSql);

    const perPeriodeByMhs = new Map<
      number,
      Array<{
        periodeId: string | null;
        poin: number;
        lisan: number;
        tertulis: number;
        count: number;
      }>
    >();

    for (const p of perPeriodeRows) {
      const list = perPeriodeByMhs.get(p.mahasiswaId) || [];
      list.push({
        periodeId: p.periodeId,
        poin: Number(p.poin),
        lisan: Number(p.lisan),
        tertulis: Number(p.tertulis),
        count: Number(p.count),
      });
      perPeriodeByMhs.set(p.mahasiswaId, list);
    }

    // 5. Ambil data cuti dalam SATU batch query untuk kalkulasi nomor semester in-memory
    const angkatanById = new Map<number, string | null>();
    for (const r of rows) {
      if (r.angkatan) angkatanById.set(r.mahasiswaId, r.angkatan);
    }

    const cutiRows = await db
      .select({
        mahasiswaId: pengajuanCuti.mahasiswaId,
        mulai: pengajuanCuti.semesterMulaiCuti,
        berakhir: pengajuanCuti.semesterBerakhirCuti,
      })
      .from(pengajuanCuti)
      .where(
        and(
          inArray(pengajuanCuti.mahasiswaId, mahasiswaIds),
          inArray(pengajuanCuti.status, ['disetujui_pa', 'disetujui_keuangan', 'disetujui_prodi', 'kembali_aktif']),
        ),
      );

    const cutiByMahasiswa = new Map<number, Array<{ mulai: string | null; berakhir: string | null }>>();
    for (const c of cutiRows) {
      const list = cutiByMahasiswa.get(c.mahasiswaId) || [];
      list.push(c);
      cutiByMahasiswa.set(c.mahasiswaId, list);
    }

    // Hitung semester berjalan saat ini untuk tiap mahasiswa
    const semesterById = targetPeriodeId
      ? await KhsService.hitungSemesterBatch(mahasiswaIds, targetPeriodeId, angkatanById)
      : new Map<number, number | null>();

    const previousPeriodeId = getPreviousPeriodeId(targetPeriodeId);

    // 6. Susun predikat TXLY, rincian per semester, dan evaluasi Skorsing Pasal 32
    const result = [];
    for (const r of rows) {
      const totalPoin = Number(r.totalPoin);
      const predikat = hitungPredikatTxly(totalPoin);

      // Filter predikat jika parameter disediakan
      if (filter?.predikat) {
        const target = filter.predikat.trim().toUpperCase();
        const predikatUpper = predikat.toUpperCase();
        const fullPredikat = `T${Math.floor(totalPoin / 4)}L${totalPoin % 4}`;
        if (predikatUpper !== target && fullPredikat !== target) {
          continue;
        }
      }

      const semester = semesterById.get(r.mahasiswaId) ?? null;
      const periodList = perPeriodeByMhs.get(r.mahasiswaId) || [];
      const mhsCuti = cutiByMahasiswa.get(r.mahasiswaId) || [];

      // Poin semester berjalan
      const targetPeriodEntry = targetPeriodeId ? periodList.find((p) => p.periodeId === targetPeriodeId) : null;
      const poinSemesterBerjalan = targetPeriodEntry ? targetPeriodEntry.poin : 0;
      const predikatSemesterBerjalan = hitungPredikatTxly(poinSemesterBerjalan);
      const jumlahPelanggaranSemesterBerjalan = targetPeriodEntry ? targetPeriodEntry.count : 0;

      // Poin semester lalu
      const prevPeriodEntry = previousPeriodeId ? periodList.find((p) => p.periodeId === previousPeriodeId) : null;
      const poinSemesterLalu = prevPeriodEntry ? prevPeriodEntry.poin : 0;
      const predikatSemesterLalu = hitungPredikatTxly(poinSemesterLalu);
      const jumlahPelanggaranSemesterLalu = prevPeriodEntry ? prevPeriodEntry.count : 0;

      // Susun breakdown poin per semester
      const poinPerSemester = [];
      for (const p of periodList) {
        if (!p.periodeId) continue;
        const sem = (await KhsService.hitungSemester(r.mahasiswaId, p.periodeId, r.angkatan, mhsCuti)) ?? 0;
        poinPerSemester.push({
          semester: sem,
          periodeId: p.periodeId,
          poin: p.poin,
          lisan: p.lisan,
          tertulis: p.tertulis,
          predikat: hitungPredikatTxly(p.poin),
          statusSemester: hitungStatusPelanggaranSemester(p.poin),
        });
      }
      poinPerSemester.sort((a, b) => a.semester - b.semester);

      // Evaluasi aturan Skorsing BPA Pasal 32 ayat 2:
      // - Akumulasi peringatan Tertulis-4 dalam satu semester (tertulis >= 4)
      // - ATAU akumulasi peringatan tertulis ke-7 (D3) / ke-9 (D4) kumulatif sejak semester pertama
      const tertulisSmtIni = targetPeriodEntry ? targetPeriodEntry.tertulis : 0;
      const totalTertulisKumulatif = periodList.reduce((acc, p) => acc + p.tertulis, 0);
      const jenjang = r.jenjang || 'D3';
      const batasTertulisKumulatif = jenjang === 'D4' ? 9 : 7;
      const isSkorsingSemester = tertulisSmtIni >= 4;
      const isSkorsingKumulatif = totalTertulisKumulatif >= batasTertulisKumulatif;
      const isSkorsing = isSkorsingSemester || isSkorsingKumulatif;

      let alasan: string | null = null;
      if (isSkorsingSemester && isSkorsingKumulatif) {
        alasan = `Akumulasi ≥ 4 Tertulis di semester ini & ≥ ${batasTertulisKumulatif} Tertulis kumulatif (${jenjang}) (Pasal 32 ayat 2)`;
      } else if (isSkorsingSemester) {
        alasan = 'Akumulasi ≥ 4 Peringatan Tertulis dalam Satu Semester (Pasal 32 ayat 2)';
      } else if (isSkorsingKumulatif) {
        alasan = `Akumulasi ≥ ${batasTertulisKumulatif} Peringatan Tertulis Kumulatif Jenjang ${jenjang} (Pasal 32 ayat 2)`;
      }

      const isMendekati =
        !isSkorsing && (tertulisSmtIni === 3 || totalTertulisKumulatif === batasTertulisKumulatif - 1);

      result.push({
        mahasiswaId: r.mahasiswaId,
        nim: r.nim,
        nama: r.nama,
        foto: r.foto,
        angkatan: r.angkatan,
        programStudiId: r.programStudiId,
        prodiNama: r.prodiNama || '-',
        jenjang: r.jenjang || null,
        semester,
        totalPoin,
        totalPoinKumulatif: totalPoin,
        statusAkumulatif: hitungStatusPelanggaranAkumulatif(totalPoin),
        poinSemesterBerjalan,
        predikatSemesterBerjalan,
        statusSemesterBerjalan: hitungStatusPelanggaranSemester(poinSemesterBerjalan),
        jumlahPelanggaranSemesterBerjalan,
        poinSemesterLalu,
        predikatSemesterLalu,
        statusSemesterLalu: hitungStatusPelanggaranSemester(poinSemesterLalu),
        jumlahPelanggaranSemesterLalu,
        poinPerSemester,
        statusSkorsing: {
          isSkorsing,
          alasan,
          isMendekati,
        },
        jumlahPelanggaran: Number(r.jumlahPelanggaran),
        predikat,
        degradasiNilaiSikap: hitungDegradasiNilaiSikap(totalPoin),
      });
    }

    return result;
  }
}
