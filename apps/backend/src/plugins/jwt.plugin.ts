import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'simak_vokasi_jwt_secret_key_fallback';

export const jwtPlugin = new Elysia({ name: 'jwt-plugin' })
  .use(
    jwt({
      name: 'jwt',
      secret: JWT_SECRET,
    })
  );
