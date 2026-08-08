import { fetchApi } from '../utils/api';
import { eden, unwrap } from '../utils/eden';

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
    const query: Record<string, string> = {};
    if (params?.kurikulumId) query.kurikulumId = String(params.kurikulumId);
    if (params?.periodeId) query.periodeId = params.periodeId;
    return unwrap<RekapCapaianCpl[]>(
      eden['capaian-cpl'].rekap.get({ $query: query }) as unknown as Promise<{
        data?: RekapCapaianCpl[] | null;
        error?: unknown;
      }>,
    );
  },

  async hitungBatch(data: { kurikulumId: number; periodeId?: string }): Promise<{ message: string; count: number }> {
    return unwrap<{ message: string; count: number }>(
      eden['capaian-cpl']['hitung-batch'].post(data) as unknown as Promise<{
        data?: { message: string; count: number };
        error?: unknown;
      }>,
    );
  },
};
