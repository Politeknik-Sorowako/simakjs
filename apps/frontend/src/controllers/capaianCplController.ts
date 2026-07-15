import { fetchApi } from '../utils/api';

export interface CapaianCpl {
  id: number;
  mahasiswaId: number;
  cplId: number;
  kurikulumId: number | null;
  periodeId: string | null;
  nilai: string;
  predikat: string | null;
  cpl?: { id: number; kode: string; deskripsi: string };
  kurikulum?: { id: number; kode: string; nama: string };
  periode?: { id: string; nama: string };
}

export interface RekapCapaianCpl {
  cplId: number;
  kode: string;
  deskripsi: string;
  rataRata: number;
  predikat: string;
  min: number;
  max: number;
  jumlahMahasiswa: number;
}

export const capaianCplController = {
  async getByMahasiswa(mahasiswaId: number): Promise<CapaianCpl[]> {
    return fetchApi<CapaianCpl[]>(`/capaian-cpl/mahasiswa/${mahasiswaId}`);
  },

  async getRekap(params?: { kurikulumId?: number; periodeId?: string }): Promise<RekapCapaianCpl[]> {
    const qs = new URLSearchParams();
    if (params?.kurikulumId) qs.set('kurikulumId', String(params.kurikulumId));
    if (params?.periodeId) qs.set('periodeId', params.periodeId);
    const query = qs.toString();
    return fetchApi<RekapCapaianCpl[]>(`/capaian-cpl/rekap${query ? '?' + query : ''}`);
  },

  async hitungBatch(data: { kurikulumId: number; periodeId?: string }): Promise<{ message: string; count: number }> {
    return fetchApi('/capaian-cpl/hitung-batch', { method: 'POST', body: JSON.stringify(data) });
  },
};
