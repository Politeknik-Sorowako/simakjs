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

export interface BkdRingkasan {
  totalSks: number;
  totalPertemuan: number;
  totalMenit: number;
  totalBimbingan: number;
  totalMengajar: number;
}

export interface BkdRekap {
  dosen: { id: number; nip: string; nama: string; nidn?: string | null; prodi: string };
  periode: { id: string; nama: string };
  mengajar: BkdMengajar[];
  rekapPresensi: BkdRekapPresensiKelas[];
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
