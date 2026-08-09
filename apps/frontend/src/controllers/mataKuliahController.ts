import { fetchApi } from '../utils/api';
import { eden, unwrap } from '../utils/eden';
import { PaginatedResponse, Prodi } from './prodiController';

export interface MataKuliah {
  id: number;
  programStudiId?: number;
  kode: string;
  nama: string;
  sksTotal: number;
  sksTatapMuka?: number | null;
  sksPraktek?: number | null;
  sksPraktekLapangan?: number | null;
  sksSimulasi?: number | null;
  programStudi?: Prodi | null;
  semester?: number | null;
  kurikulum?: { kode: string; nama: string } | null;
  idPddikti?: string | null;
  isSynced?: boolean;
}

export const mataKuliahController = {
  async getAll(
    search?: string,
    page?: number,
    limit?: number,
    kurikulumId?: number,
    semester?: number,
    sortBy?: string,
    sortOrder?: string,
    programStudiId?: number,
  ): Promise<PaginatedResponse<MataKuliah>> {
    const query: Record<string, string> = {};
    if (search) query.search = search;
    if (page) query.page = String(page);
    if (limit) query.limit = String(limit);
    if (kurikulumId) query.kurikulumId = String(kurikulumId);
    if (semester !== undefined) query.semester = String(semester);
    if (sortBy) query.sortBy = sortBy;
    if (sortOrder) query.sortOrder = sortOrder;
    if (programStudiId) query.programStudiId = String(programStudiId);
    return unwrap<PaginatedResponse<MataKuliah>>(
      eden['mata-kuliah'].get({ $query: query }) as unknown as Promise<{
        data?: PaginatedResponse<MataKuliah>;
        error?: unknown;
      }>,
    );
  },

  async getById(id: number): Promise<MataKuliah> {
    return fetchApi<MataKuliah>(`/mata-kuliah/${id}`);
  },

  async create(data: Omit<MataKuliah, 'id' | 'semester' | 'kurikulum' | 'programStudi'>): Promise<MataKuliah> {
    const res = (await eden['mata-kuliah'].post(data as unknown as never)) as unknown as {
      data?: MataKuliah;
      error?: unknown;
    };
    return unwrap<MataKuliah>(Promise.resolve(res));
  },

  async update(
    id: number,
    data: Partial<Omit<MataKuliah, 'id' | 'semester' | 'kurikulum' | 'programStudi'>>,
  ): Promise<MataKuliah> {
    return fetchApi<MataKuliah>(`/mata-kuliah/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/mata-kuliah/${id}`, {
      method: 'DELETE',
    });
  },

  async import(
    items: {
      kodeProdi?: string;
      kode: string;
      nama: string;
      sksTotal: number;
      sksTatapMuka?: number;
      sksPraktek?: number;
      idPddikti?: string;
    }[],
  ): Promise<{ success: number; failed: number; errors: { row: number; kode: string; error: string }[] }> {
    return unwrap<{ success: number; failed: number; errors: { row: number; kode: string; error: string }[] }>(
      eden['mata-kuliah'].import.post({
        items,
      }) as unknown as Promise<{
        data?: { success: number; failed: number; errors: { row: number; kode: string; error: string }[] };
        error?: unknown;
      }>,
    );
  },
};
