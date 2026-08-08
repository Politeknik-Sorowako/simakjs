import { Elysia } from 'elysia';
import { jwtPlugin } from '../plugins/jwt.plugin';
import type { UserPayload, UserRole } from '../utils/types';

export const authMiddleware = new Elysia({ name: 'auth-middleware' }).use(jwtPlugin).derive({ as: 'global' }, (ctx) => {
  return {
    getCurrentUser: async (): Promise<UserPayload | null> => {
      const cookieToken = ctx.cookie?.access_token?.value;
      const authHeader = ctx.headers['authorization'];
      const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : cookieToken;
      if (typeof token !== 'string') return null;
      const payload = await ctx.jwt.verify(token);
      if (!payload) return null;
      const base = payload as unknown as { role: UserRole; roles?: unknown };
      const roles: UserRole[] = Array.isArray(base.roles) && base.roles.length > 0 ? base.roles : [base.role];
      return { ...(payload as unknown as UserPayload), roles };
    },
  };
});
