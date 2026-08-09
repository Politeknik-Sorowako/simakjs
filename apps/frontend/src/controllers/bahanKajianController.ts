import { fetchApi } from '../utils/api';
import { eden, unwrap } from '../utils/eden';
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
    const query: Record<string, number> = prodiId ? { prodiId } : {};
    return unwrap<BahanKajian[]>(
      eden['bahan-kajian'].get({ $query: query }) as unknown as Promise<{
        data?: BahanKajian[];
        error?: unknown;
      }>,
    );
  },

  async getById(id: number): Promise<BahanKajian> {
    return fetchApi<BahanKajian>(`/bahan-kajian/${id}`);
  },

  async create(data: Omit<BahanKajian, 'id'>): Promise<BahanKajian> {
    const res = (await eden['bahan-kajian'].post(data as never)) as unknown as {
      data?: BahanKajian;
      error?: unknown;
    };
    return unwrap<BahanKajian>(Promise.resolve(res));
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

  async import(items: { kodeProdi?: string; kode: string; nama: string; deskripsi?: string }[]): Promise<ImportResult> {
    const res = (await eden['bahan-kajian'].import.post({ items: items as never })) as unknown as {
      data?: ImportResult;
      error?: unknown;
    };
    return unwrap<ImportResult>(Promise.resolve(res));
  },

  async downloadTemplate(): Promise<string> {
    return fetchApi<string>('/bahan-kajian/template');
  },

  // Mapping
  async getMappings(bahanKajianId?: number, cplId?: number, prodiId?: number): Promise<BahanKajianCplMapping[]> {
    const query: Record<string, number> = {};
    if (bahanKajianId) query.bahanKajianId = bahanKajianId;
    if (cplId) query.cplId = cplId;
    if (prodiId) query.prodiId = prodiId;
    return unwrap<BahanKajianCplMapping[]>(
      eden['bahan-kajian-cpl-mapping'].get({ $query: query }) as unknown as Promise<{
        data?: BahanKajianCplMapping[];
        error?: unknown;
      }>,
    );
  },

  async createMapping(data: {
    bahanKajianId: number;
    cplId: number;
    bobot?: number | null;
  }): Promise<BahanKajianCplMapping> {
    const res = (await eden['bahan-kajian-cpl-mapping'].post(data as never)) as unknown as {
      data?: BahanKajianCplMapping;
      error?: unknown;
    };
    return unwrap<BahanKajianCplMapping>(Promise.resolve(res));
  },

  async deleteMapping(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/bahan-kajian-cpl-mapping/${id}`, {
      method: 'DELETE',
    });
  },

  async getMatriks(prodiId: number): Promise<BahanKajianMatriksResponse> {
    return unwrap<BahanKajianMatriksResponse>(
      eden['bahan-kajian-cpl-mapping'].matriks.get({ $query: { prodiId } }) as unknown as Promise<{
        data?: BahanKajianMatriksResponse;
        error?: unknown;
      }>,
    );
  },
};
