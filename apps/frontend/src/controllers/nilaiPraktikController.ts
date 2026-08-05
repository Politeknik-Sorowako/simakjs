import { fetchApi } from '../utils/api';

export interface NilaiPraktik {
  id: number;
  rombelPraktikumId: number;
  mahasiswaId: number;
  komponenNilaiId?: number | null;
  nilaiAngka: number | string;
  keterangan?: string | null;
}

export const nilaiPraktikController = {
  async getByRombel(rombelPraktikumId: number): Promise<NilaiPraktik[]> {
    return fetchApi<NilaiPraktik[]>(`/nilai-praktik/rombel/${rombelPraktikumId}`);
  },

  async saveBulk(payload: {
    rombelPraktikumId: number;
    nilaiList: {
      mahasiswaId: number;
      komponenNilaiId?: number | null;
      nilaiAngka: number;
      keterangan?: string;
    }[];
  }): Promise<{ success: boolean; savedCount: number }> {
    return fetchApi<{ success: boolean; savedCount: number }>('/nilai-praktik/bulk', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
