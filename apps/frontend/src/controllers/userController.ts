import { fetchApi } from '../utils/api';

export interface UserItem {
  id: number;
  email: string;
  nama: string;
  role: string;
  roles?: string[];
  prodiIds?: number[];
  isActive: boolean;
  isGlobalScope?: boolean;
  mustChangePassword?: boolean;
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

  async createUser(data: {
    email: string;
    nama: string;
    password: string;
    role?: string;
    roles?: string[];
    prodiIds?: number[];
  }): Promise<UserItem> {
    return fetchApi<UserItem>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async toggleActive(id: number): Promise<{ message: string; user: UserItem }> {
    return fetchApi<{ message: string; user: UserItem }>(`/users/${id}/activate`, {
      method: 'PUT',
    });
  },

  async forcePasswordChange(id: number, mustChangePassword = true): Promise<{ message: string; user: UserItem }> {
    return fetchApi<{ message: string; user: UserItem }>(`/users/${id}/force-password-change`, {
      method: 'PUT',
      body: JSON.stringify({ mustChangePassword }),
    });
  },

  async updateRole(id: number, role: string): Promise<{ message: string; user: UserItem }> {
    return fetchApi<{ message: string; user: UserItem }>(`/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },

  async updateRoles(id: number, roles: string[]): Promise<{ message: string; roles: string[] }> {
    return fetchApi<{ message: string; roles: string[] }>(`/users/${id}/roles`, {
      method: 'PUT',
      body: JSON.stringify({ roles }),
    });
  },

  async updateProdiScope(id: number, prodiIds: number[]): Promise<{ message: string; user: UserItem }> {
    return fetchApi<{ message: string; user: UserItem }>(`/users/${id}/prodi-scope`, {
      method: 'PUT',
      body: JSON.stringify({ prodiIds }),
    });
  },

  async updateProfile(
    namaOrOptions:
      | string
      | { nama?: string; password?: string; currentPassword?: string; theme?: string; avatar?: string },
    password?: string,
    currentPassword?: string,
    theme?: string,
    avatar?: string,
  ): Promise<{ message: string; user: Record<string, unknown>; error?: string }> {
    let payload: Record<string, unknown> = {};

    if (typeof namaOrOptions === 'object' && namaOrOptions !== null) {
      payload = { ...namaOrOptions };
    } else {
      if (namaOrOptions) payload.nama = namaOrOptions;
      if (password) {
        payload.password = password;
        payload.currentPassword = currentPassword;
      }
      if (theme) payload.theme = theme;
      if (avatar) payload.avatar = avatar;
    }

    return fetchApi<{ message: string; user: Record<string, unknown>; error?: string }>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async resetPassword(id: number, password: string): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/users/${id}/reset-password`, {
      method: 'PUT',
      body: JSON.stringify({ password }),
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

  async generateAccountsAsync(
    targetType: 'mahasiswa' | 'dosen',
    ids: number[],
  ): Promise<{ status: string; message: string }> {
    return fetchApi<{ status: string; message: string }>('/users/generate-accounts-async', {
      method: 'POST',
      body: JSON.stringify({ targetType, ids }),
    });
  },
};
