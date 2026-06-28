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
