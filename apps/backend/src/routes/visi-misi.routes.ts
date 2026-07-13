import { Elysia } from 'elysia';
import { VisiMisiController } from '../controllers/visi-misi.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createVisiMisiSchema,
  deleteVisiMisiSchema,
  getVisiMisiAktifSchema,
  getVisiMisiByIdSchema,
  getVisiMisiSchema,
  setVisiMisiAktifSchema,
  updateVisiMisiSchema,
} from '../schemas/visi-misi.schema';

export const visiMisiRoutes = new Elysia({ prefix: '/visi-misi' })
  .use(authMiddleware)
  .get('/', VisiMisiController.getAll, getVisiMisiSchema)
  .get('/aktif', VisiMisiController.getAktif, getVisiMisiAktifSchema)
  .get('/:id', VisiMisiController.getById, getVisiMisiByIdSchema)
  .post('/', VisiMisiController.create, createVisiMisiSchema)
  .put('/:id', VisiMisiController.update, updateVisiMisiSchema)
  .put('/:id/set-aktif', VisiMisiController.setAktif, setVisiMisiAktifSchema)
  .delete('/:id', VisiMisiController.delete, deleteVisiMisiSchema);
