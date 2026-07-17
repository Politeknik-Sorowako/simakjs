import { Elysia } from 'elysia';
import { VisiMisiController } from '../controllers/visi-misi.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createVisiMisiSchema,
  deleteVisiMisiSchema,
  getVisiMisiAktifSchema,
  getVisiMisiByIdSchema,
  getVisiMisiSchema,
  importVisiMisiSchema,
  setVisiMisiAktifSchema,
  updateVisiMisiSchema,
} from '../schemas/visi-misi.schema';

export const visiMisiRoutes = new Elysia({ prefix: '/visi-misi' })
  .use(authMiddleware)
  .get('/', VisiMisiController.getAll, getVisiMisiSchema)
  .get('/template', VisiMisiController.getTemplate)
  .get('/aktif', VisiMisiController.getAktif, getVisiMisiAktifSchema)
  .get('/:id', VisiMisiController.getById, getVisiMisiByIdSchema)
  .post('/', VisiMisiController.create, createVisiMisiSchema)
  .post('/import', VisiMisiController.import, importVisiMisiSchema)
  .put('/:id', VisiMisiController.update, updateVisiMisiSchema)
  .put('/:id/set-aktif', VisiMisiController.setAktif, setVisiMisiAktifSchema)
  .delete('/:id', VisiMisiController.delete, deleteVisiMisiSchema);
