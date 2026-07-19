import { fetchApi } from '../utils/api';
import { Prodi } from './prodiController';

export interface ProfilLulusan {
  id: number;
  programStudiId: number;
  kode: string;
  deskripsi: string;
  urutan: number;
  programStudi?: Prodi | null;
  cplMappings?: { id: number; cpl: { id: number; kode: string } }[];
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; kode: string; error: string }[];
}

export const profilLulusanController = {
  async getAll(prodiId?: number): Promise<ProfilLulusan[]> {
    const params = new URLSearchParams();
    if (prodiId) params.append('prodiId', String(prodiId));
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<ProfilLulusan[]>(`/profil-lulusan${queryString}`);
  },

  async getById(id: number): Promise<ProfilLulusan> {
    return fetchApi<ProfilLulusan>(`/profil-lulusan/${id}`);
  },

  async create(data: Omit<ProfilLulusan, 'id'>): Promise<ProfilLulusan> {
    return fetchApi<ProfilLulusan>('/profil-lulusan', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: Partial<Omit<ProfilLulusan, 'id'>>): Promise<ProfilLulusan> {
    return fetchApi<ProfilLulusan>(`/profil-lulusan/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/profil-lulusan/${id}`, {
      method: 'DELETE',
    });
  },

  async import(items: { kodeProdi?: string; kode: string; deskripsi: string }[]): Promise<ImportResult> {
    return fetchApi<ImportResult>('/profil-lulusan/import', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },

  async downloadTemplate(): Promise<string> {
    return fetchApi<string>('/profil-lulusan/template');
  },
};
