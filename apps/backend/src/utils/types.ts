import { Context } from 'elysia';

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'kaprodi'
  | 'dosen'
  | 'mahasiswa'
  | 'prodi'
  | 'keuangan'
  | 'guest'
  | 'calon_mahasiswa'
  | 'plp'
  | 'instruktur';

export interface UserPayload {
  id: number;
  email: string;
  nama: string;
  role: UserRole;
  mustChangePassword?: boolean;
  isGlobalScope?: boolean;
}

export function allowed(user: UserPayload | null | undefined, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

// biome-ignore lint/suspicious/noExplicitAny: Elysia framework requires `any` for route inference
export type AuthContext<TBody = any, TQuery = any, TParams = any> = Omit<
  Context,
  'body' | 'query' | 'params' | 'set' | 'status'
> & {
  body: TBody;
  query: TQuery;
  params: TParams;
  // biome-ignore lint/suspicious/noExplicitAny: Elysia set.status and set.headers require any for framework compatibility
  set: any;
  // biome-ignore lint/suspicious/noExplicitAny: Elysia status response type is complex and requires any
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
  const limit = Math.min(10000, Math.max(1, Number(query.limit) || 10));
  return { page, limit, offset: (page - 1) * limit };
}
