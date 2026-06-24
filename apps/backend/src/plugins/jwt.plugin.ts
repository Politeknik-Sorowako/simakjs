import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;

export const jwtPlugin = new Elysia({ name: 'jwt-plugin' })
  .use(
    jwt({
      name: 'jwt',
      secret: JWT_SECRET,
    })
  );
