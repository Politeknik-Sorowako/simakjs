import { fetchApi } from '../utils/api';

export interface UserItem {
  id: number;
  email: string;
  nama: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export const userController = {
  async getAll(): Promise<{ data: UserItem[] }> {
    return fetchApi<{ data: UserItem[] }>('/users');
  },

  async toggleActive(id: number): Promise<{ message: string; user: UserItem }> {
    return fetchApi<{ message: string; user: UserItem }>(`/users/${id}/activate`, {
      method: 'PUT',
    });
  },
};
