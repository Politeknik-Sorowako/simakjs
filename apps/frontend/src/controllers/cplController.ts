import { fetchApi } from '../utils/api';
import { Prodi } from './prodiController';
import { ProfilLulusan } from './profilLulusanController';

export interface Cpl {
  id: number;
  programStudiId: number;
  kode: string;
  deskripsi: string;
  urutan: number;
  programStudi?: Prodi | null;
  profilLulusanMappings?: {
    id: number;
    bobot: string | null;
    profilLulusan: ProfilLulusan;
  }[];
  cpmkMappings?: {
    id: number;
    bobot: string | null;
    cpmk: { id: number; kode: string; mataKuliah: { id: number; kode: string; nama: string } };
  }[];
}

export interface CplMapping {
  id: number;
  cplId: number;
  profilLulusanId: number;
  bobot: string | null;
  cpl?: { id: number; kode: string; deskripsi: string };
  profilLulusan?: ProfilLulusan;
}

export interface CplMatriksResponse {
  cpl: Cpl[];
  profilLulusan: ProfilLulusan[];
  matriks: {
    cpl: Cpl;
    bobotPerPl: { profilLulusanId: number; bobot: number }[];
  }[];
}

export interface ImportCplResult {
  success: number;
  failed: number;
  errors: { row: number; kode: string; error: string }[];
}

export const cplController = {
  async getAll(prodiId?: number): Promise<Cpl[]> {
    const params = new URLSearchParams();
    if (prodiId) params.append('prodiId', String(prodiId));
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<Cpl[]>(`/cpl${queryString}`);
  },

  async getById(id: number): Promise<Cpl> {
    return fetchApi<Cpl>(`/cpl/${id}`);
  },

  async create(data: Omit<Cpl, 'id'>): Promise<Cpl> {
    return fetchApi<Cpl>('/cpl', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: Partial<Omit<Cpl, 'id'>>): Promise<Cpl> {
    return fetchApi<Cpl>(`/cpl/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/cpl/${id}`, {
      method: 'DELETE',
    });
  },

  async import(programStudiId: number, items: { kode: string; deskripsi: string }[]): Promise<ImportCplResult> {
    return fetchApi<ImportCplResult>('/cpl/import', {
      method: 'POST',
      body: JSON.stringify({ programStudiId, items }),
    });
  },

  async downloadTemplate(): Promise<string> {
    return fetchApi<string>('/cpl/template');
  },

  // Mapping
  async getMappings(prodiId?: number, cplId?: number, profilLulusanId?: number): Promise<CplMapping[]> {
    const params = new URLSearchParams();
    if (prodiId) params.append('prodiId', String(prodiId));
    if (cplId) params.append('cplId', String(cplId));
    if (profilLulusanId) params.append('profilLulusanId', String(profilLulusanId));
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<CplMapping[]>(`/cpl-mapping${queryString}`);
  },

  async createMapping(data: { cplId: number; profilLulusanId: number; bobot?: number | null }): Promise<CplMapping> {
    return fetchApi<CplMapping>('/cpl-mapping', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteMapping(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/cpl-mapping/${id}`, {
      method: 'DELETE',
    });
  },

  async getMatriks(prodiId: number): Promise<CplMatriksResponse> {
    return fetchApi<CplMatriksResponse>(`/cpl-mapping/matriks?prodiId=${prodiId}`);
  },
};
