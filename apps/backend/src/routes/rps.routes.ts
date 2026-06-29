import { Elysia } from 'elysia';
import { RpsController } from '../controllers/rps.controller';
import {
  getRpsSchema,
  createRpsSchema,
  updateRpsSchema,
  addTopikSchema,
  updateTopikSchema,
  deleteTopikSchema,
  getRencanaEvaluasiSchema,
  createRencanaEvaluasiSchema,
  updateRencanaEvaluasiSchema,
  deleteRencanaEvaluasiSchema
} from '../schemas/rps.schema';
import { authMiddleware } from '../middlewares/auth.middleware';

export const rpsRoutes = new Elysia()
  .use(authMiddleware)
  .get('/rps', RpsController.getRps, getRpsSchema)
  .post('/rps', RpsController.createRps, createRpsSchema)
  .put('/rps/:id', RpsController.updateRps, updateRpsSchema)
  .post('/rps/:id/topik', RpsController.addTopik, addTopikSchema)
  .put('/rps/topik/:topikId', RpsController.updateTopik, updateTopikSchema)
  .delete('/rps/topik/:topikId', RpsController.deleteTopik, deleteTopikSchema)
  .get('/rencana-evaluasi', RpsController.getRencanaEvaluasi, getRencanaEvaluasiSchema)
  .post('/rencana-evaluasi', RpsController.createRencanaEvaluasi, createRencanaEvaluasiSchema)
  .put('/rencana-evaluasi/:id', RpsController.updateRencanaEvaluasi, updateRencanaEvaluasiSchema)
  .delete('/rencana-evaluasi/:id', RpsController.deleteRencanaEvaluasi, deleteRencanaEvaluasiSchema);
