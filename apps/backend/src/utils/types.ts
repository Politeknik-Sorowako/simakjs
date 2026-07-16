import { Context } from 'elysia';

export type UserRole = 'admin' | 'dosen' | 'mahasiswa' | 'prodi' | 'keuangan' | 'guest' | 'calon_mahasiswa';

export interface UserPayload {
  id: number;
  email: string;
  nama: string;
  role: UserRole;
}

export type AuthContext<TBody = any, TQuery = any, TParams = any> = Omit<
  Context,
  'body' | 'query' | 'params' | 'set' | 'status'
> & {
  body: TBody;
  query: TQuery;
  params: TParams;
  set: any;
  status: any;
  getCurrentUser: () => Promise<UserPayload | null>;
};

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export function parsePagination(query: PaginationQuery): { page: number; limit: number; offset: number } {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  return { page, limit, offset: (page - 1) * limit };
}
