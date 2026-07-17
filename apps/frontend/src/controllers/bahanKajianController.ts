import { fetchApi } from '../utils/api';
import { Cpl } from './cplController';
import { Prodi } from './prodiController';

export interface BahanKajian {
  id: number;
  programStudiId: number;
  kode: string;
  nama: string;
  deskripsi?: string | null;
  urutan: number;
  programStudi?: Prodi | null;
  cplMappings?: {
    id: number;
    bobot: string | null;
    cpl: Cpl;
  }[];
  mataKuliahMappings?: {
    id: number;
    bobotKontribusi: string | null;
    mataKuliah: { id: number; kode: string; nama: string };
  }[];
}

export interface BahanKajianCplMapping {
  id: number;
  bahanKajianId: number;
  cplId: number;
  bobot: string | null;
  bahanKajian?: { id: number; kode: string; nama: string };
  cpl?: Cpl;
}

export interface BahanKajianMatriksResponse {
  bk: BahanKajian[];
  cpl: Cpl[];
  matriks: {
    bk: BahanKajian;
    bobotPerCpl: { cplId: number; bobot: number }[];
  }[];
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; kode: string; error: string }[];
}

export const bahanKajianController = {
  async getAll(prodiId?: number): Promise<BahanKajian[]> {
    const params = new URLSearchParams();
    if (prodiId) params.append('prodiId', String(prodiId));
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<BahanKajian[]>(`/bahan-kajian${queryString}`);
  },

  async getById(id: number): Promise<BahanKajian> {
    return fetchApi<BahanKajian>(`/bahan-kajian/${id}`);
  },

  async create(data: Omit<BahanKajian, 'id'>): Promise<BahanKajian> {
    return fetchApi<BahanKajian>('/bahan-kajian', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: Partial<Omit<BahanKajian, 'id'>>): Promise<BahanKajian> {
    return fetchApi<BahanKajian>(`/bahan-kajian/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/bahan-kajian/${id}`, {
      method: 'DELETE',
    });
  },

  async import(
    programStudiId: number,
    items: { kode: string; nama: string; deskripsi?: string }[],
  ): Promise<ImportResult> {
    return fetchApi<ImportResult>('/bahan-kajian/import', {
      method: 'POST',
      body: JSON.stringify({ programStudiId, items }),
    });
  },

  async downloadTemplate(): Promise<string> {
    return fetchApi<string>('/bahan-kajian/template');
  },

  // Mapping
  async getMappings(bahanKajianId?: number, cplId?: number, prodiId?: number): Promise<BahanKajianCplMapping[]> {
    const params = new URLSearchParams();
    if (bahanKajianId) params.append('bahanKajianId', String(bahanKajianId));
    if (cplId) params.append('cplId', String(cplId));
    if (prodiId) params.append('prodiId', String(prodiId));
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<BahanKajianCplMapping[]>(`/bahan-kajian-cpl-mapping${queryString}`);
  },

  async createMapping(data: {
    bahanKajianId: number;
    cplId: number;
    bobot?: number | null;
  }): Promise<BahanKajianCplMapping> {
    return fetchApi<BahanKajianCplMapping>('/bahan-kajian-cpl-mapping', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteMapping(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/bahan-kajian-cpl-mapping/${id}`, {
      method: 'DELETE',
    });
  },

  async getMatriks(prodiId: number): Promise<BahanKajianMatriksResponse> {
    return fetchApi<BahanKajianMatriksResponse>(`/bahan-kajian-cpl-mapping/matriks?prodiId=${prodiId}`);
  },
};
