import { Elysia } from 'elysia';
import { jwtPlugin } from '../plugins/jwt.plugin';
import type { UserPayload } from '../utils/types';

export const authMiddleware = new Elysia({ name: 'auth-middleware' }).use(jwtPlugin).derive({ as: 'global' }, (ctx) => {
  return {
    getCurrentUser: async (): Promise<UserPayload | null> => {
      const cookieToken = ctx.cookie?.access_token?.value;
      const authHeader = ctx.headers['authorization'];
      const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : cookieToken;
      if (!token) return null;
      const payload = await ctx.jwt.verify(token);
      if (!payload) return null;
      return payload as UserPayload;
    },
  };
});
