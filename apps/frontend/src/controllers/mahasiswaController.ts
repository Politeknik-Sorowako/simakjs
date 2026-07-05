import { fetchApi } from '../utils/api';
import { PaginatedResponse, Prodi } from './prodiController';

export interface Mahasiswa {
  id: number;
  nim: string;
  nama: string;
  email: string;
  programStudiId: number | null;
  dosenPaId?: number | null;
  status: string;
  namaIbuKandung: string;
  nik: string;
  jenisKelamin: 'L' | 'P';
  tanggalLahir: string;
  programStudi?: Prodi | null;
  dosenPa?: { id: number; nama: string; nip: string; email: string } | null;
  idPddikti?: string | null;
  isSynced?: boolean;
}

export const mahasiswaController = {
  async getAll(
    search?: string,
    page?: number,
    limit?: number,
    programStudiId?: number,
  ): Promise<PaginatedResponse<Mahasiswa>> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    if (programStudiId) params.append('programStudiId', String(programStudiId));
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<PaginatedResponse<Mahasiswa>>(`/mahasiswa${queryString}`);
  },

  async getById(id: number): Promise<Mahasiswa> {
    return fetchApi<Mahasiswa>(`/mahasiswa/${id}`);
  },

  async create(data: Omit<Mahasiswa, 'id'>): Promise<Mahasiswa> {
    return fetchApi<Mahasiswa>('/mahasiswa', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: Partial<Omit<Mahasiswa, 'id'>>): Promise<Mahasiswa> {
    return fetchApi<Mahasiswa>(`/mahasiswa/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/mahasiswa/${id}`, {
      method: 'DELETE',
    });
  },
};
