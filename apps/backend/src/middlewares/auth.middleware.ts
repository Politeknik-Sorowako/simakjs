import { Elysia } from 'elysia';
import { jwtPlugin } from '../plugins/jwt.plugin';

export const authMiddleware = new Elysia({ name: 'auth-middleware' })
  .use(jwtPlugin)
  .derive({ as: 'global' }, (ctx: any) => {
    return {
      getCurrentUser: async () => {
        const authHeader = ctx.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return null;
        }
        const token = authHeader.split(' ')[1];
        const payload = await ctx.jwt.verify(token);
        if (!payload) return null;
        return payload;
      },
    };
  });
