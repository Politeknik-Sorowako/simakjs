import { and, asc, eq, inArray, notLike, or, sql } from 'drizzle-orm';
import {
  bap,
  bapPraktikum,
  dosen,
  kelasKuliah,
  mahasiswa,
  mataKuliah,
  periodeAkademik,
  presensi,
  presensiPraktikum,
  programStudi,
  rombelPraktikum,
} from '../models/schema';
import { db } from '../utils/db';
import { BimbinganService } from './bimbingan.service';
import { DosenPengajarService } from './dosen-pengajar.service';

/** Materi BAP hasil sinkronisasi praktikum -> kelas induk (lih. syncPresensiPraktikumToKelas). */
const MATERI_SYNC_PRAKTIKUM = '[Praktikum]%';

/** Agregat status presensi (teori & praktikum memakai parser status yang sama). */
function hitungStatusPresensi(entries: { status: string }[]) {
  const ringkasan = { hadir: 0, sakit: 0, izin: 0, alpa: 0, telat: 0, total: entries.length };
  for (const pr of entries) {
    if (pr.status === 'hadir') ringkasan.hadir++;
    else if (pr.status === 'sakit') ringkasan.sakit++;
    else if (pr.status === 'izin') ringkasan.izin++;
    else if (pr.status === 'alpa') ringkasan.alpa++;
    else if (pr.status === 'telat' || pr.status === 'terlambat') ringkasan.telat++;
  }
  return ringkasan;
}

/** Jumlahkan daftar ringkasan per sesi menjadi satu total. */
function jumlahRingkasan(
  list: { hadir: number; sakit: number; izin: number; alpa: number; telat: number; total: number }[],
) {
  const total = { hadir: 0, sakit: 0, izin: 0, alpa: 0, telat: 0, total: 0 };
  for (const r of list) {
    total.hadir += r.hadir;
    total.sakit += r.sakit;
    total.izin += r.izin;
    total.alpa += r.alpa;
    total.telat += r.telat;
    total.total += r.total;
  }
  return total;
}

export class BkdService {
  static async getRekap(dosenId: number, periodeId: string) {
    const dosenProfile = await db.query.dosen.findFirst({
      where: eq(dosen.id, dosenId),
      with: { programStudi: true },
    });
    if (!dosenProfile) {
      throw new Error('Profil Dosen tidak ditemukan.');
    }

    const periode = await db.query.periodeAkademik.findFirst({
      where: eq(periodeAkademik.id, periodeId),
    });
    if (!periode) {
      throw new Error('Periode akademik tidak ditemukan.');
    }

    // Seluruh kelas yang diampu dosen pada periode tersebut.
    const pengajar = await DosenPengajarService.getAll(1, 10000, undefined, dosenId, periodeId);

    // Batch: ambil semua BAP untuk semua kelas dalam satu query.
    const kelasIds = pengajar.data.map((p: { kelasKuliah: { id: number } }) => p.kelasKuliah.id);

    let allBap: (typeof bap.$inferSelect)[] = [];
    if (kelasIds.length > 0) {
      // Baris '[Praktikum]' adalah hasil sync praktikum -> kelas induk; dihitung pada
      // seksi praktikum, sehingga dikeluarkan dari rekap teori agar tidak dobel.
      allBap = await db
        .select()
        .from(bap)
        .where(
          and(
            inArray(bap.kelasKuliahId, kelasIds),
            eq(bap.dosenId, dosenId),
            notLike(bap.materi, MATERI_SYNC_PRAKTIKUM),
          ),
        )
        .orderBy(asc(bap.tanggal));
    }
    const bapByKelas = new Map<number, typeof allBap>();
    for (const b of allBap) {
      const arr = bapByKelas.get(b.kelasKuliahId) || [];
      arr.push(b);
      bapByKelas.set(b.kelasKuliahId, arr);
    }

    // Batch: ambil semua presensi untuk semua BAP dalam satu query.
    const allBapIds = allBap.map((b) => b.id);
    const presensiByBapId = new Map<number, { status: string }[]>();
    if (allBapIds.length > 0) {
      const presensiRows = await db
        .select({ bapId: presensi.bapId, status: presensi.status })
        .from(presensi)
        .where(inArray(presensi.bapId, allBapIds));
      for (const pr of presensiRows) {
        const arr = presensiByBapId.get(pr.bapId) || [];
        arr.push({ status: pr.status });
        presensiByBapId.set(pr.bapId, arr);
      }
    }

    // Ringkasan status per BAP (dipakai untuk cetak BAP bulk per sesi).
    const ringkasanPerBap = (bapId: number) => hitungStatusPresensi(presensiByBapId.get(bapId) || []);

    // Agregat rekap presensi per mahasiswa per kelas (batch, satu query).
    const rekapPresensiByKelas = new Map<
      number,
      {
        mahasiswaId: number;
        nim: string;
        nama: string;
        hadir: number;
        sakit: number;
        izin: number;
        alpa: number;
        telat: number;
      }[]
    >();
    if (kelasIds.length > 0) {
      const rekapRows = await db
        .select({
          kelasKuliahId: bap.kelasKuliahId,
          mahasiswaId: presensi.mahasiswaId,
          nim: mahasiswa.nim,
          nama: mahasiswa.nama,
          hadir: sql<number>`COALESCE(SUM(CASE WHEN ${presensi.status} = 'hadir' THEN 1 ELSE 0 END), 0)`,
          sakit: sql<number>`COALESCE(SUM(CASE WHEN ${presensi.status} = 'sakit' THEN 1 ELSE 0 END), 0)`,
          izin: sql<number>`COALESCE(SUM(CASE WHEN ${presensi.status} = 'izin' THEN 1 ELSE 0 END), 0)`,
          alpa: sql<number>`COALESCE(SUM(CASE WHEN ${presensi.status} = 'alpa' THEN 1 ELSE 0 END), 0)`,
          telat: sql<number>`COALESCE(SUM(CASE WHEN ${presensi.status} = 'telat' OR ${presensi.status} = 'terlambat' THEN 1 ELSE 0 END), 0)`,
        })
        .from(presensi)
        .innerJoin(bap, eq(presensi.bapId, bap.id))
        .innerJoin(mahasiswa, eq(presensi.mahasiswaId, mahasiswa.id))
        .where(
          and(
            inArray(bap.kelasKuliahId, kelasIds),
            eq(bap.dosenId, dosenId),
            notLike(bap.materi, MATERI_SYNC_PRAKTIKUM),
          ),
        )
        .groupBy(bap.kelasKuliahId, presensi.mahasiswaId, mahasiswa.nim, mahasiswa.nama)
        .orderBy(bap.kelasKuliahId, asc(mahasiswa.nama));
      for (const row of rekapRows) {
        const arr = rekapPresensiByKelas.get(row.kelasKuliahId) || [];
        arr.push({
          mahasiswaId: row.mahasiswaId,
          nim: row.nim,
          nama: row.nama,
          hadir: Number(row.hadir),
          sakit: Number(row.sakit),
          izin: Number(row.izin),
          alpa: Number(row.alpa),
          telat: Number(row.telat),
        });
        rekapPresensiByKelas.set(row.kelasKuliahId, arr);
      }
    }

    let totalSks = 0;
    let totalPertemuan = 0;
    let totalMenit = 0;

    const mengajar = [];
    const rekapPresensi = [];
    for (const p of pengajar.data as {
      kelasKuliah: { id: number; namaKelas: string; mataKuliah?: { kode?: string; nama?: string; sksTotal?: number } };
    }[]) {
      const kelas = p.kelasKuliah;
      const bapList = bapByKelas.get(kelas.id) || [];

      const pertemuan = bapList.map((b) => ({
        bapId: b.id,
        tanggal: b.tanggal,
        pertemuanKe: b.pertemuanKe,
        tema: b.tema,
        materi: b.materi,
        catatan: b.catatan,
        durasiMenit: b.durasiMenit,
        presensiRingkasan: ringkasanPerBap(b.id),
      }));
      const jumlahPertemuan = bapList.length;
      const totalMenitKelas = bapList.reduce((s, b) => s + (b.durasiMenit || 0), 0);
      totalSks += kelas.mataKuliah?.sksTotal || 0;
      totalPertemuan += jumlahPertemuan;
      totalMenit += totalMenitKelas;

      // Agregasi presensi dari data yang sudah di-batch.
      let presensi = { hadir: 0, sakit: 0, izin: 0, alpa: 0, telat: 0, persen: 0 };
      const bapIds = bapList.map((b) => b.id);
      if (bapIds.length > 0) {
        const total = jumlahRingkasan(bapIds.map(ringkasanPerBap));
        presensi = {
          hadir: total.hadir,
          sakit: total.sakit,
          izin: total.izin,
          alpa: total.alpa,
          telat: total.telat,
          persen: total.total > 0 ? Math.round((total.hadir / total.total) * 100) : 0,
        };
      }

      const mhsRekap = (rekapPresensiByKelas.get(kelas.id) || []).map((m) => ({
        mahasiswaId: m.mahasiswaId,
        nim: m.nim,
        nama: m.nama,
        hadir: m.hadir,
        sakit: m.sakit,
        izin: m.izin,
        alpa: m.alpa,
        telat: m.telat,
        totalKehadiran: m.hadir + m.sakit + m.izin,
        persentaseHadir: jumlahPertemuan > 0 ? Math.round(((m.hadir + m.sakit + m.izin) / jumlahPertemuan) * 100) : 0,
      }));

      mengajar.push({
        kelasId: kelas.id,
        namaKelas: kelas.namaKelas,
        mataKuliah: {
          kode: kelas.mataKuliah?.kode || '-',
          nama: kelas.mataKuliah?.nama || '-',
          sks: kelas.mataKuliah?.sksTotal || 0,
        },
        jumlahPertemuan,
        totalMenit: totalMenitKelas,
        presensi,
        pertemuan,
      });

      rekapPresensi.push({
        kelasId: kelas.id,
        namaKelas: kelas.namaKelas,
        mataKuliah: {
          kode: kelas.mataKuliah?.kode || '-',
          nama: kelas.mataKuliah?.nama || '-',
          sks: kelas.mataKuliah?.sksTotal || 0,
        },
        jumlahPertemuan,
        totalMenit: totalMenitKelas,
        mahasiswa: mhsRekap,
      });
    }

    const bimbingan = await BimbinganService.getRekapBimbinganDosen(dosenId, periodeId);

    // Rekap praktikum (rombel & BAP praktikum) yang menjadi tanggung jawab dosen.
    const praktikum = await this.getPraktikumRekap(dosenId, periodeId);

    const totalPertemuanPraktikum = praktikum.mengajarPraktikum.reduce((s, m) => s + m.jumlahPertemuan, 0);
    const totalMenitPraktikum = praktikum.mengajarPraktikum.reduce((s, m) => s + m.totalMenit, 0);
    const totalRombelPraktikum = praktikum.mengajarPraktikum.length;

    return {
      dosen: {
        id: dosenProfile.id,
        nip: dosenProfile.nip,
        nama: dosenProfile.nama,
        nidn: dosenProfile.nidn,
        nuptk: dosenProfile.nuptk,
        prodi: (dosenProfile.programStudi?.nama as string | undefined) || '-',
      },
      periode: { id: periode.id, nama: periode.nama },
      mengajar,
      rekapPresensi,
      mengajarPraktikum: praktikum.mengajarPraktikum,
      rekapPresensiPraktikum: praktikum.rekapPresensiPraktikum,
      bimbingan,
      ringkasan: {
        totalSks,
        totalPertemuan,
        totalMenit,
        totalBimbingan: bimbingan.length,
        totalMengajar: mengajar.length,
        totalRombelPraktikum,
        totalPertemuanPraktikum,
        totalMenitPraktikum,
        grandPertemuan: totalPertemuan + totalPertemuanPraktikum,
        grandMenit: totalMenit + totalMenitPraktikum,
      },
    };
  }

  /**
   * Rekap mengajar praktikum per rombel untuk satu dosen pada satu periode.
   * - Rombel dihitung bila dosen menjadi instruktur rombel ATAU mengisi BAP praktikum rombel tersebut.
   * - Sesi dihitung bila sesi diisi dosen tersebut, atau bila dosen adalah instruktur rombel
   *   (penanggung jawab rombel) sehingga seluruh sesi rombel dikreditkan kepadanya.
   */
  static async getPraktikumRekap(dosenId: number, periodeId: string) {
    const bapRombelIds = await db
      .select({ rombelPraktikumId: bapPraktikum.rombelPraktikumId })
      .from(bapPraktikum)
      .where(eq(bapPraktikum.instrukturId, dosenId));
    const bapRombelIdSet = new Set(bapRombelIds.map((r) => r.rombelPraktikumId));

    const rombelRows = await db
      .select({
        rombelId: rombelPraktikum.id,
        namaGroup: rombelPraktikum.namaGroup,
        rombelInstrukturId: rombelPraktikum.instrukturId,
        kelasId: kelasKuliah.id,
        namaKelas: kelasKuliah.namaKelas,
        kode: mataKuliah.kode,
        namaMk: mataKuliah.nama,
        sksTotal: mataKuliah.sksTotal,
      })
      .from(rombelPraktikum)
      .innerJoin(kelasKuliah, eq(rombelPraktikum.kelasKuliahId, kelasKuliah.id))
      .innerJoin(mataKuliah, eq(kelasKuliah.mataKuliahId, mataKuliah.id))
      .where(
        and(
          eq(kelasKuliah.periodeId, periodeId),
          or(eq(rombelPraktikum.instrukturId, dosenId), inArray(rombelPraktikum.id, [...bapRombelIdSet])),
        ),
      )
      .orderBy(asc(kelasKuliah.namaKelas), asc(rombelPraktikum.namaGroup));

    const rombelIds = rombelRows.map((r) => r.rombelId);
    const rombelInstrukturByRombel = new Map<number, number | null>();
    for (const r of rombelRows) {
      rombelInstrukturByRombel.set(r.rombelId, r.rombelInstrukturId);
    }

    // Batch: semua BAP praktikum rombel dosen.
    let allBapPrak: (typeof bapPraktikum.$inferSelect)[] = [];
    if (rombelIds.length > 0) {
      allBapPrak = await db
        .select()
        .from(bapPraktikum)
        .where(inArray(bapPraktikum.rombelPraktikumId, rombelIds))
        .orderBy(asc(bapPraktikum.tanggal), asc(bapPraktikum.sesiKe));
    }
    const bapPrakByRombel = new Map<number, typeof allBapPrak>();
    for (const b of allBapPrak) {
      const arr = bapPrakByRombel.get(b.rombelPraktikumId) || [];
      arr.push(b);
      bapPrakByRombel.set(b.rombelPraktikumId, arr);
    }

    // Sesi yang dikreditkan ke dosen (hindari klaim menit milik pengisi sesi lain).
    const attributedBapIds = allBapPrak
      .filter((b) => b.instrukturId === dosenId || rombelInstrukturByRombel.get(b.rombelPraktikumId) === dosenId)
      .map((b) => b.id);

    // Batch: presensi praktikum untuk sesi-sesi yang dikreditkan.
    const presensiPrakByBapId = new Map<number, { status: string }[]>();
    if (attributedBapIds.length > 0) {
      const presensiRows = await db
        .select({ bapId: presensiPraktikum.bapPraktikumId, status: presensiPraktikum.status })
        .from(presensiPraktikum)
        .where(inArray(presensiPraktikum.bapPraktikumId, attributedBapIds));
      for (const pr of presensiRows) {
        const arr = presensiPrakByBapId.get(pr.bapId) || [];
        arr.push({ status: pr.status });
        presensiPrakByBapId.set(pr.bapId, arr);
      }
    }

    const ringkasanPerBapPrak = (bapId: number) => hitungStatusPresensi(presensiPrakByBapId.get(bapId) || []);

    // Agregat rekap presensi praktikum per mahasiswa per rombel (batch, satu query).
    const rekapPresensiPrakByRombel = new Map<
      number,
      {
        mahasiswaId: number;
        nim: string;
        nama: string;
        hadir: number;
        sakit: number;
        izin: number;
        alpa: number;
        telat: number;
      }[]
    >();
    if (attributedBapIds.length > 0) {
      const rekapRows = await db
        .select({
          rombelPraktikumId: bapPraktikum.rombelPraktikumId,
          mahasiswaId: presensiPraktikum.mahasiswaId,
          nim: mahasiswa.nim,
          nama: mahasiswa.nama,
          hadir: sql<number>`COALESCE(SUM(CASE WHEN ${presensiPraktikum.status} = 'hadir' THEN 1 ELSE 0 END), 0)`,
          sakit: sql<number>`COALESCE(SUM(CASE WHEN ${presensiPraktikum.status} = 'sakit' THEN 1 ELSE 0 END), 0)`,
          izin: sql<number>`COALESCE(SUM(CASE WHEN ${presensiPraktikum.status} = 'izin' THEN 1 ELSE 0 END), 0)`,
          alpa: sql<number>`COALESCE(SUM(CASE WHEN ${presensiPraktikum.status} = 'alpa' THEN 1 ELSE 0 END), 0)`,
          telat: sql<number>`COALESCE(SUM(CASE WHEN ${presensiPraktikum.status} = 'telat' OR ${presensiPraktikum.status} = 'terlambat' THEN 1 ELSE 0 END), 0)`,
        })
        .from(presensiPraktikum)
        .innerJoin(bapPraktikum, eq(presensiPraktikum.bapPraktikumId, bapPraktikum.id))
        .innerJoin(mahasiswa, eq(presensiPraktikum.mahasiswaId, mahasiswa.id))
        .where(inArray(bapPraktikum.id, attributedBapIds))
        .groupBy(bapPraktikum.rombelPraktikumId, presensiPraktikum.mahasiswaId, mahasiswa.nim, mahasiswa.nama)
        .orderBy(bapPraktikum.rombelPraktikumId, asc(mahasiswa.nama));
      for (const row of rekapRows) {
        const arr = rekapPresensiPrakByRombel.get(row.rombelPraktikumId) || [];
        arr.push({
          mahasiswaId: row.mahasiswaId,
          nim: row.nim,
          nama: row.nama,
          hadir: Number(row.hadir),
          sakit: Number(row.sakit),
          izin: Number(row.izin),
          alpa: Number(row.alpa),
          telat: Number(row.telat),
        });
        rekapPresensiPrakByRombel.set(row.rombelPraktikumId, arr);
      }
    }

    const mengajarPraktikum: {
      rombelId: number;
      namaGroup: string;
      kelasId: number;
      namaKelas: string;
      mataKuliah: { kode: string; nama: string; sks: number };
      jumlahPertemuan: number;
      totalMenit: number;
      presensi: { hadir: number; sakit: number; izin: number; alpa: number; telat: number; persen: number };
      pertemuan: {
        bapId: number;
        tanggal: string;
        sesiKe: number;
        tema?: string | null;
        materi: string;
        catatan?: string | null;
        durasiMenit: number;
        presensiRingkasan: { hadir: number; sakit: number; izin: number; alpa: number; telat: number; total: number };
      }[];
    }[] = [];
    const rekapPresensiPraktikum: {
      rombelId: number;
      namaGroup: string;
      kelasId: number;
      namaKelas: string;
      mataKuliah: { kode: string; nama: string; sks: number };
      jumlahPertemuan: number;
      totalMenit: number;
      mahasiswa: {
        mahasiswaId: number;
        nim: string;
        nama: string;
        hadir: number;
        sakit: number;
        izin: number;
        alpa: number;
        telat: number;
        totalKehadiran: number;
        persentaseHadir: number;
      }[];
    }[] = [];

    for (const r of rombelRows) {
      const bapList = (bapPrakByRombel.get(r.rombelId) || []).filter(
        (b) => b.instrukturId === dosenId || r.rombelInstrukturId === dosenId,
      );

      const pertemuan = bapList.map((b) => ({
        bapId: b.id,
        tanggal: b.tanggal,
        sesiKe: b.sesiKe,
        tema: b.tema,
        materi: b.materi,
        catatan: b.catatan,
        durasiMenit: b.durasiMenit,
        presensiRingkasan: ringkasanPerBapPrak(b.id),
      }));
      const jumlahPertemuan = bapList.length;
      const totalMenitRombel = bapList.reduce((s, b) => s + (b.durasiMenit || 0), 0);

      const total = jumlahRingkasan(bapList.map((b) => ringkasanPerBapPrak(b.id)));
      const presensi = {
        hadir: total.hadir,
        sakit: total.sakit,
        izin: total.izin,
        alpa: total.alpa,
        telat: total.telat,
        persen: total.total > 0 ? Math.round((total.hadir / total.total) * 100) : 0,
      };

      const mhsRekap = (rekapPresensiPrakByRombel.get(r.rombelId) || []).map((m) => ({
        mahasiswaId: m.mahasiswaId,
        nim: m.nim,
        nama: m.nama,
        hadir: m.hadir,
        sakit: m.sakit,
        izin: m.izin,
        alpa: m.alpa,
        telat: m.telat,
        totalKehadiran: m.hadir + m.sakit + m.izin,
        persentaseHadir: jumlahPertemuan > 0 ? Math.round(((m.hadir + m.sakit + m.izin) / jumlahPertemuan) * 100) : 0,
      }));

      const mataKuliahInfo = { kode: r.kode || '-', nama: r.namaMk || '-', sks: r.sksTotal || 0 };
      mengajarPraktikum.push({
        rombelId: r.rombelId,
        namaGroup: r.namaGroup,
        kelasId: r.kelasId,
        namaKelas: r.namaKelas,
        mataKuliah: mataKuliahInfo,
        jumlahPertemuan,
        totalMenit: totalMenitRombel,
        presensi,
        pertemuan,
      });
      rekapPresensiPraktikum.push({
        rombelId: r.rombelId,
        namaGroup: r.namaGroup,
        kelasId: r.kelasId,
        namaKelas: r.namaKelas,
        mataKuliah: mataKuliahInfo,
        jumlahPertemuan,
        totalMenit: totalMenitRombel,
        mahasiswa: mhsRekap,
      });
    }

    return { mengajarPraktikum, rekapPresensiPraktikum };
  }

  static async getDosenByEmail(email: string) {
    const [profile] = await db.select().from(dosen).where(eq(dosen.email, email)).limit(1);
    return profile || null;
  }
}
