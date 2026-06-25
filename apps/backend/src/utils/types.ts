import { Context } from 'elysia';

export interface UserPayload {
  id: number;
  email: string;
  role: 'admin' | 'dosen' | 'mahasiswa';
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
