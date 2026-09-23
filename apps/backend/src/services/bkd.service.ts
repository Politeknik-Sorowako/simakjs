import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { bap, dosen, mahasiswa, periodeAkademik, presensi, programStudi } from '../models/schema';
import { db } from '../utils/db';
import { BimbinganService } from './bimbingan.service';
import { DosenPengajarService } from './dosen-pengajar.service';

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
      allBap = await db
        .select()
        .from(bap)
        .where(and(inArray(bap.kelasKuliahId, kelasIds), eq(bap.dosenId, dosenId)))
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
    const ringkasanPerBap = (bapId: number) => {
      const entries = presensiByBapId.get(bapId) || [];
      let hadir = 0;
      let sakit = 0;
      let izin = 0;
      let alpa = 0;
      let telat = 0;
      for (const pr of entries) {
        if (pr.status === 'hadir') hadir++;
        else if (pr.status === 'sakit') sakit++;
        else if (pr.status === 'izin') izin++;
        else if (pr.status === 'alpa') alpa++;
        else if (pr.status === 'telat' || pr.status === 'terlambat') telat++;
      }
      return { hadir, sakit, izin, alpa, telat, total: entries.length };
    };

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
        .where(and(inArray(bap.kelasKuliahId, kelasIds), eq(bap.dosenId, dosenId)))
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
        let h = 0;
        let s = 0;
        let i = 0;
        let a = 0;
        let t = 0;
        let totalEntries = 0;
        for (const bId of bapIds) {
          const ringkasan = ringkasanPerBap(bId);
          h += ringkasan.hadir;
          s += ringkasan.sakit;
          i += ringkasan.izin;
          a += ringkasan.alpa;
          t += ringkasan.telat;
          totalEntries += ringkasan.total;
        }
        presensi = {
          hadir: h,
          sakit: s,
          izin: i,
          alpa: a,
          telat: t,
          persen: totalEntries > 0 ? Math.round((h / totalEntries) * 100) : 0,
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

    return {
      dosen: {
        id: dosenProfile.id,
        nip: dosenProfile.nip,
        nama: dosenProfile.nama,
        nidn: dosenProfile.nidn,
        prodi: (dosenProfile.programStudi?.nama as string | undefined) || '-',
      },
      periode: { id: periode.id, nama: periode.nama },
      mengajar,
      rekapPresensi,
      bimbingan,
      ringkasan: {
        totalSks,
        totalPertemuan,
        totalMenit,
        totalBimbingan: bimbingan.length,
        totalMengajar: mengajar.length,
      },
    };
  }

  static async getDosenByEmail(email: string) {
    const [profile] = await db.select().from(dosen).where(eq(dosen.email, email)).limit(1);
    return profile || null;
  }
}
