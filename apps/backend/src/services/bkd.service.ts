import { and, asc, eq, inArray } from 'drizzle-orm';
import { bap, dosen, periodeAkademik, presensi, programStudi } from '../models/schema';
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

    let totalSks = 0;
    let totalPertemuan = 0;
    let totalMenit = 0;

    const mengajar = [];
    for (const p of pengajar.data as {
      kelasKuliah: { id: number; namaKelas: string; mataKuliah?: { kode?: string; nama?: string; sksTotal?: number } };
    }[]) {
      const kelas = p.kelasKuliah;
      const bapList = bapByKelas.get(kelas.id) || [];

      const pertemuan = bapList.map((b) => ({
        tanggal: b.tanggal,
        pertemuanKe: b.pertemuanKe,
        materi: b.materi,
        durasiMenit: b.durasiMenit,
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
          for (const pr of presensiByBapId.get(bId) || []) {
            totalEntries++;
            if (pr.status === 'hadir') h++;
            else if (pr.status === 'sakit') s++;
            else if (pr.status === 'izin') i++;
            else if (pr.status === 'alpa') a++;
            else if (pr.status === 'telat' || pr.status === 'terlambat') t++;
          }
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
