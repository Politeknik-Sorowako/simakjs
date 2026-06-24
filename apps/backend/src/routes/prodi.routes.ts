import { Elysia } from 'elysia';
import { ProdiController } from '../controllers/prodi.controller';
import { getProdiSchema, createProdiSchema } from '../schemas/prodi.schema';
import { authMiddleware } from '../middlewares/auth.middleware';

export const prodiRoutes = new Elysia({ prefix: '/prodi' })
  .use(authMiddleware)
  .get('/', ProdiController.getAll, getProdiSchema)
  .post('/', ProdiController.create, createProdiSchema);
