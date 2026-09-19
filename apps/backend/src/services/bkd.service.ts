import { eq } from 'drizzle-orm';
import { dosen, periodeAkademik, programStudi } from '../models/schema';
import { db } from '../utils/db';
import { BapService } from './bap.service';
import { BimbinganService } from './bimbingan.service';
import { DosenPengajarService } from './dosen-pengajar.service';
import { PresensiService } from './presensi.service';

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

    let totalSks = 0;
    let totalPertemuan = 0;
    let totalMenit = 0;

    const mengajar = [];
    for (const p of pengajar.data) {
      const kelas = p.kelasKuliah;
      const bapList = await BapService.getByKelas(kelas.id);

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

      let presensi = { hadir: 0, sakit: 0, izin: 0, alpa: 0, telat: 0, persen: 0 };
      try {
        const rekap = await PresensiService.getRekapKehadiran(kelas.id);
        const mhs = rekap.mahasiswa || [];
        presensi = {
          hadir: mhs.reduce((s, m) => s + m.hadir, 0),
          sakit: mhs.reduce((s, m) => s + m.sakit, 0),
          izin: mhs.reduce((s, m) => s + m.izin, 0),
          alpa: mhs.reduce((s, m) => s + m.alpa, 0),
          telat: mhs.reduce((s, m) => s + m.telat, 0),
          persen: mhs.length > 0 ? Math.round(mhs.reduce((s, m) => s + m.persentaseHadir, 0) / mhs.length) : 0,
        };
      } catch (e: unknown) {
        console.error(`[BkdService] Gagal mengambil rekap presensi kelas ${kelas.id}:`, e);
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
