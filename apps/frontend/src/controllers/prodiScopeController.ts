import { fetchApi } from '../utils/api';

export interface ProdiScope {
  id: number;
  programStudiId: number;
  kode: string;
  nama: string;
  jenjang: string;
}

export const prodiScopeController = {
  async getUserScopes(userId: number): Promise<ProdiScope[]> {
    return fetchApi<{ data: ProdiScope[] }>(`/prodi-scope/${userId}`).then((r) => r?.data || []);
  },

  async setUserScopes(userId: number, prodiIds: number[]): Promise<{ scopeCount: number }> {
    return fetchApi<{ scopeCount: number }>(`/prodi-scope/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ prodiIds }),
    });
  },

  async toggleGlobal(userId: number, isGlobalScope: boolean): Promise<{ isGlobalScope: boolean }> {
    return fetchApi<{ isGlobalScope: boolean }>(`/prodi-scope/${userId}/global`, {
      method: 'PUT',
      body: JSON.stringify({ isGlobalScope }),
    });
  },
};
