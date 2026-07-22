import { fetchApi } from '../utils/api';
import { DosenPengajar } from './dosenPengajarController';
import { MataKuliah } from './mataKuliahController';
import { PeriodeAkademik } from './periodeAkademikController';
import { PaginatedResponse } from './prodiController';

export interface KelasKuliah {
  id: number;
  mataKuliahId: number;
  periodeId: string;
  namaKelas: string;
  isLocked?: boolean;
  tanggalMulaiEfektif?: string | null;
  tanggalAkhirEfektif?: string | null;
  mataKuliah?: MataKuliah | null;
  periodeAkademik?: PeriodeAkademik | null;
  dosenPengajarKelas?: DosenPengajar[] | null;
  idPddikti?: string | null;
  isSynced?: boolean;
}

export const kelasKuliahController = {
  async getAll(
    search?: string,
    page?: number,
    limit?: number,
    programStudiId?: number,
    periodeId?: string,
  ): Promise<PaginatedResponse<KelasKuliah>> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    if (programStudiId) params.append('programStudiId', String(programStudiId));
    if (periodeId) params.append('periodeId', String(periodeId));
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<PaginatedResponse<KelasKuliah>>(`/kelas-kuliah${queryString}`);
  },

  async getById(id: number): Promise<KelasKuliah> {
    return fetchApi<KelasKuliah>(`/kelas-kuliah/${id}`);
  },

  async create(data: Omit<KelasKuliah, 'id'>): Promise<KelasKuliah> {
    return fetchApi<KelasKuliah>('/kelas-kuliah', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: Partial<Omit<KelasKuliah, 'id'>>): Promise<KelasKuliah> {
    return fetchApi<KelasKuliah>(`/kelas-kuliah/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getByMk(mataKuliahId: number, periodeId: string): Promise<any[]> {
    return fetchApi<any[]>(`/kelas-kuliah/by-mk?mataKuliahId=${mataKuliahId}&periodeId=${periodeId}`);
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/kelas-kuliah/${id}`, {
      method: 'DELETE',
    });
  },

  async import(
    items: { kodeMataKuliah?: string; periodeId: string; namaKelas: string; idPddikti?: string }[],
  ): Promise<{ success: number; failed: number; errors: { row: number; namaKelas: string; error: string }[] }> {
    return fetchApi('/kelas-kuliah/import', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },
};
