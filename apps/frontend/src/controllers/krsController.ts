import { fetchApi } from '../utils/api';
import { KelasKuliah } from './kelasKuliahController';
import { Mahasiswa } from './mahasiswaController';
import { PaginatedResponse } from './prodiController';

export interface Krs {
  id: number;
  mahasiswaId: number;
  kelasKuliahId: number;
  nilaiAngka?: string | null;
  nilaiHuruf?: string | null;
  nilaiIndeks?: string | null;
  mahasiswa?: Mahasiswa | null;
  kelasKuliah?: KelasKuliah | null;
  idPddikti?: string | null;
  isSynced?: boolean;
}

export const krsController = {
  async getAll(search?: string, page?: number, limit?: number): Promise<PaginatedResponse<Krs>> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<PaginatedResponse<Krs>>(`/krs${queryString}`);
  },

  async getById(id: number): Promise<Krs> {
    return fetchApi<Krs>(`/krs/${id}`);
  },

  async create(data: Omit<Krs, 'id'>): Promise<Krs> {
    return fetchApi<Krs>('/krs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: Partial<Omit<Krs, 'id'>>): Promise<Krs> {
    return fetchApi<Krs>(`/krs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/krs/${id}`, {
      method: 'DELETE',
    });
  },

  async approve(mahasiswaId: number, periodeId: string): Promise<{ message: string; count: number }> {
    return fetchApi<{ message: string; count: number }>('/krs/approve', {
      method: 'POST',
      body: JSON.stringify({ mahasiswaId, periodeId }),
    });
  },

  async getPendingStudents(periodeId: string): Promise<any[]> {
    return fetchApi<any[]>(`/krs/pending-students?periodeId=${periodeId}`);
  },

  async approveBatch(mahasiswaIds: number[], periodeId: string): Promise<{ message: string; count: number }> {
    return fetchApi<{ message: string; count: number }>('/krs/approve-batch', {
      method: 'POST',
      body: JSON.stringify({ mahasiswaIds, periodeId }),
    });
  },

  async getRencanaStudi(mahasiswaId: number): Promise<{
    kurikulum: { id: number; kode: string; nama: string };
    currentSemester: number;
    totalSksLulus: number;
    rencanaPerSemester: {
      semester: number;
      mataKuliah: { id: number; mataKuliahId: number; kode: string; nama: string; sks: number; isWajib: boolean; status: string; nilaiHuruf: string | null }[];
      totalSks: number;
      sksLulus: number;
    }[];
  }> {
    return fetchApi(`/krs/rencana-studi?mahasiswaId=${mahasiswaId}`);
  },

  async validasiKrs(mahasiswaId: number, periodeId: string): Promise<{
    isValid: boolean;
    warnings: { type: string; mk: string; semester?: number }[];
    summary: { totalSksDiRencana: string; totalSksDiKrs: string; mkWajibTerpenuhi: number; mkWajibTotal: number };
  }> {
    return fetchApi(`/krs/validasi?mahasiswaId=${mahasiswaId}&periodeId=${periodeId}`);
  },
};
