import { fetchApi } from '../utils/api';

export interface PasalPelanggaran {
  id: number;
  nomorPasal: string;
  bunyiPasal: string;
  jenisSanksi: number;
  programStudiId?: number | null;
  prodiNama?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const pasalController = {
  async getAll(options?: {
    search?: string;
    programStudiId?: number;
    includeInactive?: boolean;
  }): Promise<PasalPelanggaran[]> {
    const params = new URLSearchParams();
    if (options?.search) params.append('search', options.search);
    if (options?.programStudiId) params.append('programStudiId', String(options.programStudiId));
    if (options?.includeInactive) params.append('includeInactive', 'true');
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<PasalPelanggaran[]>(`/pasal-pelanggaran${query}`);
  },

  async create(data: Omit<PasalPelanggaran, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>): Promise<PasalPelanggaran> {
    return fetchApi<PasalPelanggaran>('/pasal-pelanggaran', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(
    id: number,
    data: Partial<Omit<PasalPelanggaran, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<PasalPelanggaran> {
    return fetchApi<PasalPelanggaran>(`/pasal-pelanggaran/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async remove(id: number): Promise<{ success: boolean }> {
    return fetchApi<{ success: boolean }>(`/pasal-pelanggaran/${id}`, {
      method: 'DELETE',
    });
  },
};
