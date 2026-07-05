import { jwt } from '@elysiajs/jwt';
import { Elysia } from 'elysia';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export const jwtPlugin = new Elysia({ name: 'jwt-plugin' }).use(
  jwt({
    name: 'jwt',
    secret: JWT_SECRET,
  }),
);
