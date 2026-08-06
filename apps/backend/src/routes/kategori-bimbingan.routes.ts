import { Elysia } from 'elysia';
import { KategoriBimbinganController } from '../controllers/kategori-bimbingan.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createKategoriBimbinganSchema,
  deleteKategoriBimbinganSchema,
  updateKategoriBimbinganSchema,
} from '../schemas/kategori-bimbingan.schema';

export const kategoriBimbinganRoutes = new Elysia({ prefix: '/kategori-bimbingan' })
  .use(authMiddleware)
  .get('/', KategoriBimbinganController.getAll)
  .post('/', KategoriBimbinganController.create, createKategoriBimbinganSchema)
  .put('/:id', KategoriBimbinganController.update, updateKategoriBimbinganSchema)
  .delete('/:id', KategoriBimbinganController.delete, deleteKategoriBimbinganSchema);
