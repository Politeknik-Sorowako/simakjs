import { Context } from 'elysia';

export interface UserPayload {
  id: number;
  email: string;
  nama: string;
  role: 'admin' | 'dosen' | 'mahasiswa' | 'prodi' | 'keuangan' | 'guest';
}

export type AuthContext<TBody = any, TQuery = any> = Context & {
  body: TBody;
  query: TQuery;
  getCurrentUser: () => Promise<UserPayload | null>;
};

export interface PaginationQuery {
  page?: string | number;
  limit?: string | number;
  search?: string;
}

export function parsePagination(query: PaginationQuery): { page: number; limit: number; offset: number } {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  return { page, limit, offset: (page - 1) * limit };
}
