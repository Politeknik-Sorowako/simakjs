import { Elysia } from 'elysia';
import { jwtPlugin } from '../plugins/jwt.plugin';

export const authMiddleware = new Elysia({ name: 'auth-middleware' })
  .use(jwtPlugin)
  .derive({ as: 'global' }, (ctx: any) => {
    return {
      getCurrentUser: async () => {
        let token = ctx.cookie?.access_token?.value;
        const authHeader = ctx.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.split(' ')[1];
        }
        if (!token) return null;
        const payload = await ctx.jwt.verify(token);
        if (!payload) return null;
        return payload;
      },
    };
  });

