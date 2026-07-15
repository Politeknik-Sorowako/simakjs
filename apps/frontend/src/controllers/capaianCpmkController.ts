import { fetchApi } from '../utils/api';

export interface CapaianCpmk {
  id: number;
  mahasiswaId: number;
  cpmkId: number;
  kelasKuliahId: number;
  kurikulumId: number | null;
  nilai: string;
  mahasiswa?: { id: number; nim: string; nama: string };
  cpmk?: { id: number; kode: string; deskripsi: string };
}

export interface RekapCapaianCpmk {
  cpmkId: number;
  kode: string;
  deskripsi: string;
  rataRata: number;
  min: number;
  max: number;
  jumlahMahasiswa: number;
}

export const capaianCpmkController = {
  async getByKelas(kelasKuliahId: number): Promise<CapaianCpmk[]> {
    return fetchApi<CapaianCpmk[]>(`/capaian-cpmk/kelas/${kelasKuliahId}`);
  },

  async getByMahasiswa(mahasiswaId: number): Promise<CapaianCpmk[]> {
    return fetchApi<CapaianCpmk[]>(`/capaian-cpmk/mahasiswa/${mahasiswaId}`);
  },

  async hitungPerKelas(kelasKuliahId: number): Promise<{ message: string; count: number }> {
    return fetchApi(`/capaian-cpmk/hitung/${kelasKuliahId}`, { method: 'POST' });
  },

  async getRekapPerCpmk(kelasKuliahId: number): Promise<RekapCapaianCpmk[]> {
    return fetchApi<RekapCapaianCpmk[]>(`/capaian-cpmk/rekap/${kelasKuliahId}`);
  },
};
