import { fetchApi } from '../utils/api';
import { PaginatedResponse, Prodi } from './prodiController';

export interface MahasiswaBaruProdiItem {
  prodiNama: string;
  total: number;
  laki?: number;
  perempuan?: number;
}

export interface MahasiswaBaruTrendItem {
  angkatan: string;
  total: number;
}

export interface MahasiswaBaruStatsResponse {
  total: number;
  perProdi: MahasiswaBaruProdiItem[];
  trend: MahasiswaBaruTrendItem[];
}

export interface Mahasiswa {
  id: number;
  nim: string;
  nama: string;
  email: string;
  programStudiId: number | null;
  dosenPaId?: number | null;
  status: string;
  namaIbuKandung?: string | null;
  nik?: string | null;
  jenisKelamin: 'L' | 'P';
  tanggalLahir?: string | null;
  tempatLahir?: string | null;
  idAgama?: number | null;
  jalan?: string | null;
  rt?: string | null;
  rw?: string | null;
  kodePos?: string | null;
  kewarganegaraan?: string | null;
  foto?: string | null;
  programStudi?: Prodi | null;
  dosenPa?: { id: number; nama: string; nip: string; email: string } | null;
  idPddikti?: string | null;
  isSynced?: boolean;
}

export interface BulkUploadFotoDetail {
  nim: string;
  filename: string;
  status: 'success' | 'failed';
  error?: string;
}

export interface BulkUploadFotoResponse {
  message: string;
  total: number;
  successCount: number;
  failedCount: number;
  details: BulkUploadFotoDetail[];
}

export const mahasiswaController = {
  async getAll(
    search?: string,
    page?: number,
    limit?: number,
    programStudiId?: number,
    filters?: {
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      filterNim?: string;
      filterNama?: string;
      filterEmail?: string;
      filterStatus?: string;
      hasAccount?: boolean;
      allStudents?: boolean;
    },
  ): Promise<PaginatedResponse<Mahasiswa>> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    if (programStudiId) params.append('programStudiId', String(programStudiId));
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters?.filterNim) params.append('filterNim', filters.filterNim);
    if (filters?.filterNama) params.append('filterNama', filters.filterNama);
    if (filters?.filterEmail) params.append('filterEmail', filters.filterEmail);
    if (filters?.filterStatus) params.append('filterStatus', filters.filterStatus);
    if (filters?.hasAccount !== undefined) params.append('hasAccount', String(filters.hasAccount));
    if (filters?.allStudents) params.append('allStudents', 'true');
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<PaginatedResponse<Mahasiswa>>(`/mahasiswa${queryString}`);
  },

  async getById(id: number, allStudents?: boolean): Promise<Mahasiswa> {
    const query = allStudents ? '?allStudents=true' : '';
    return fetchApi<Mahasiswa>(`/mahasiswa/${id}${query}`);
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

  async getStats(angkatan?: string, programStudiId?: number): Promise<Record<string, unknown>> {
    const params = new URLSearchParams();
    if (angkatan) params.append('angkatan', angkatan);
    if (programStudiId) params.append('programStudiId', String(programStudiId));
    return fetchApi<Record<string, unknown>>(`/mahasiswa/stats?${params.toString()}`);
  },

  async getMahasiswaBaru(angkatan?: string): Promise<MahasiswaBaruStatsResponse> {
    const params = angkatan ? `?angkatan=${angkatan}` : '';
    return fetchApi<MahasiswaBaruStatsResponse>(`/mahasiswa/baru${params}`);
  },

  async bulkSetDosenPa(mahasiswaIds: number[], dosenPaId: number | null): Promise<{ message: string }> {
    return fetchApi<{ message: string }>('/mahasiswa/bulk-set-dosen-pa', {
      method: 'PUT',
      body: JSON.stringify({ mahasiswaIds, dosenPaId }),
    });
  },

  async bulkUploadFoto(formData: FormData): Promise<BulkUploadFotoResponse> {
    return fetchApi<BulkUploadFotoResponse>('/mahasiswa/bulk-foto', {
      method: 'POST',
      body: formData,
    });
  },

  async uploadFoto(id: number, file: File): Promise<{ message: string; foto: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return fetchApi<{ message: string; foto: string }>(`/mahasiswa/${id}/foto`, {
      method: 'POST',
      body: formData,
    });
  },
};
