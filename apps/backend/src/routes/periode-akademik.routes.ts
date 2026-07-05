import { Elysia } from 'elysia';
import { PeriodeAkademikController } from '../controllers/periode-akademik.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createPeriodeSchema,
  deletePeriodeSchema,
  getPeriodeByIdSchema,
  getPeriodeSchema,
  updatePeriodeSchema,
} from '../schemas/periode-akademik.schema';

export const periodeAkademikRoutes = new Elysia({ prefix: '/periode-akademik' })
  .use(authMiddleware)
  .get('/', PeriodeAkademikController.getAll, getPeriodeSchema)
  .post('/', PeriodeAkademikController.create, createPeriodeSchema)
  .get('/:id', PeriodeAkademikController.getById, getPeriodeByIdSchema)
  .put('/:id', PeriodeAkademikController.update, updatePeriodeSchema)
  .delete('/:id', PeriodeAkademikController.delete, deletePeriodeSchema);
