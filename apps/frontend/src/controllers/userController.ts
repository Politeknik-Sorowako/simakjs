import { fetchApi } from '../utils/api';

export interface UserItem {
  id: number;
  email: string;
  nama: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface UserListResponse {
  data: UserItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const userController = {
  async getAll(page = 1, limit = 10, search = ''): Promise<UserListResponse> {
    return fetchApi<UserListResponse>(`/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
  },

  async toggleActive(id: number): Promise<{ message: string; user: UserItem }> {
    return fetchApi<{ message: string; user: UserItem }>(`/users/${id}/activate`, {
      method: 'PUT',
    });
  },

  async updateRole(id: number, role: string): Promise<{ message: string; user: UserItem }> {
    return fetchApi<{ message: string; user: UserItem }>(`/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },

  async updateProfile(
    nama: string,
    password?: string,
    theme?: string,
    avatar?: string,
  ): Promise<{ message: string; user: any }> {
    const payload: Record<string, any> = { nama };
    if (password) {
      payload.password = password;
    }
    if (theme) {
      payload.theme = theme;
    }
    if (avatar) {
      payload.avatar = avatar;
    }
    return fetchApi<{ message: string; user: any }>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async generateAccounts(
    targetType: 'mahasiswa' | 'dosen',
    ids: number[],
  ): Promise<{ successCount: number; errors: string[] }> {
    return fetchApi<{ successCount: number; errors: string[] }>('/users/generate-accounts', {
      method: 'POST',
      body: JSON.stringify({ targetType, ids }),
    });
  },
};
