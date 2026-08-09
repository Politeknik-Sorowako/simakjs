import { fetchApi } from '../utils/api';
import { eden, unwrap } from '../utils/eden';
import { PaginatedResponse, Prodi } from './prodiController';

export interface Dosen {
  id: number;
  nip: string;
  nama: string;
  email: string;
  programStudiId: number | null;
  nidn?: string | null;
  nik?: string | null;
  jenisKelamin?: 'L' | 'P' | null;
  tanggalLahir?: string | null;
  tempatLahir?: string | null;
  programStudi?: Prodi | null;
  idPddikti?: string | null;
  isSynced?: boolean;
}

export const dosenController = {
  async getAll(
    search?: string,
    page?: number,
    limit?: number,
    programStudiId?: number,
  ): Promise<PaginatedResponse<Dosen>> {
    const query: Record<string, string> = {};
    if (search) query.search = search;
    if (page) query.page = String(page);
    if (limit) query.limit = String(limit);
    if (programStudiId) query.programStudiId = String(programStudiId);
    return unwrap<PaginatedResponse<Dosen>>(
      eden.dosen.get({ $query: query }) as unknown as Promise<{
        data?: PaginatedResponse<Dosen>;
        error?: unknown;
      }>,
    );
  },

  async getById(id: number): Promise<Dosen> {
    return fetchApi<Dosen>(`/dosen/${id}`);
  },

  async create(data: Omit<Dosen, 'id'>): Promise<Dosen> {
    return unwrap<Dosen>(
      eden.dosen.post(data as never as Parameters<typeof eden.dosen.post>[0]) as unknown as Promise<{
        data?: Dosen;
        error?: unknown;
      }>,
    );
  },

  async update(id: number, data: Partial<Omit<Dosen, 'id'>>): Promise<Dosen> {
    return fetchApi<Dosen>(`/dosen/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/dosen/${id}`, {
      method: 'DELETE',
    });
  },
};
