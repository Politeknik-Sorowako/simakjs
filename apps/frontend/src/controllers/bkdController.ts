import { fetchApi } from '../utils/api';

export interface BkdMataKuliah {
  kode: string;
  nama: string;
  sks: number;
}

export interface BkdPresensi {
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  telat: number;
  persen: number;
}

export interface BkdPertemuan {
  bapId: number;
  tanggal: string;
  pertemuanKe: number;
  tema?: string | null;
  materi: string;
  catatan?: string | null;
  durasiMenit: number;
  presensiRingkasan: {
    hadir: number;
    sakit: number;
    izin: number;
    alpa: number;
    telat: number;
    total: number;
  };
}

export interface BkdRekapMahasiswa {
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
}

export interface BkdRekapPresensiKelas {
  kelasId: number;
  namaKelas: string;
  mataKuliah: BkdMataKuliah;
  jumlahPertemuan: number;
  totalMenit: number;
  mahasiswa: BkdRekapMahasiswa[];
}

export interface BkdMengajar {
  kelasId: number;
  namaKelas: string;
  mataKuliah: BkdMataKuliah;
  jumlahPertemuan: number;
  totalMenit: number;
  presensi: BkdPresensi;
  pertemuan: BkdPertemuan[];
}

export interface BkdPertemuanPraktikum {
  bapId: number;
  tanggal: string;
  sesiKe: number;
  tema?: string | null;
  materi: string;
  catatan?: string | null;
  durasiMenit: number;
  presensiRingkasan: {
    hadir: number;
    sakit: number;
    izin: number;
    alpa: number;
    telat: number;
    total: number;
  };
}

export interface BkdMengajarPraktikum {
  rombelId: number;
  namaGroup: string;
  kelasId: number;
  namaKelas: string;
  mataKuliah: BkdMataKuliah;
  jumlahPertemuan: number;
  totalMenit: number;
  presensi: BkdPresensi;
  pertemuan: BkdPertemuanPraktikum[];
}

export interface BkdRekapPresensiRombel {
  rombelId: number;
  namaGroup: string;
  kelasId: number;
  namaKelas: string;
  mataKuliah: BkdMataKuliah;
  jumlahPertemuan: number;
  totalMenit: number;
  mahasiswa: BkdRekapMahasiswa[];
}

/** Satu baris riwayat pertemuan praktikum (dipakai LaporanBKD & BkdCetak). */
export interface BkdRiwayatPraktikumRow {
  namaGroup: string;
  namaKelas: string;
  kode: string;
  namaMk: string;
  sesiKe: number;
  tanggal: string;
  materi: string;
  durasiMenit: number;
  presensiRingkasan: BkdPertemuanPraktikum['presensiRingkasan'];
}

/** Satu baris rekap presensi praktikum per mahasiswa per rombel (dipakai LaporanBKD & BkdCetak). */
export interface BkdRekapMahasiswaPraktikumRow {
  namaGroup: string;
  namaKelas: string;
  kode: string;
  namaMk: string;
  nim: string;
  nama: string;
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  telat: number;
  totalKehadiran: number;
  persentaseHadir: number;
}

export interface BkdRingkasan {
  totalSks: number;
  totalPertemuan: number;
  totalMenit: number;
  totalBimbingan: number;
  totalMengajar: number;
  totalRombelPraktikum?: number;
  totalPertemuanPraktikum?: number;
  totalMenitPraktikum?: number;
  grandPertemuan?: number;
  grandMenit?: number;
}

export interface BkdRekap {
  dosen: { id: number; nip: string; nama: string; nidn?: string | null; nuptk?: string | null; prodi: string };
  periode: { id: string; nama: string };
  mengajar: BkdMengajar[];
  rekapPresensi: BkdRekapPresensiKelas[];
  mengajarPraktikum?: BkdMengajarPraktikum[];
  rekapPresensiPraktikum?: BkdRekapPresensiRombel[];
  bimbingan: {
    mahasiswa?: { nim: string; nama: string };
    isApproved: boolean;
    statusBkd: boolean;
    sesi?: { statusBkd: boolean; tanggalBimbingan?: string | null; topikBimbingan?: string | null }[];
  }[];
  ringkasan: BkdRingkasan;
}

export const bkdController = {
  async getRekap(dosenId: number, periodeId: string): Promise<{ data: BkdRekap }> {
    const params = new URLSearchParams();
    params.append('dosenId', String(dosenId));
    params.append('periodeId', periodeId);
    return fetchApi<{ data: BkdRekap }>(`/bkd/rekap?${params.toString()}`);
  },
};
