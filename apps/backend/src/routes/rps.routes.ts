import { Elysia } from 'elysia';
import { RpsController } from '../controllers/rps.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  addTopikSchema,
  attachEvaluasiSubCpmkSchema,
  bulkGenerateRpsSchema,
  copyRpsSchema,
  createRencanaEvaluasiSchema,
  createRpsSchema,
  deleteRencanaEvaluasiSchema,
  deleteTopikSchema,
  detachEvaluasiSubCpmkSchema,
  getEvaluasiSubCpmkSchema,
  getRencanaEvaluasiSchema,
  getRpsSchema,
  getRpsSourcesSchema,
  updateRencanaEvaluasiSchema,
  updateRpsSchema,
  updateTopikSchema,
} from '../schemas/rps.schema';

export const rpsRoutes = new Elysia()
  .use(authMiddleware)
  .get('/rps', RpsController.getRps, getRpsSchema)
  .get('/rps/available-sources', RpsController.getAvailableSources, getRpsSourcesSchema)
  .post('/rps', RpsController.createRps, createRpsSchema)
  .post('/rps/bulk-generate', RpsController.bulkGenerate, bulkGenerateRpsSchema)
  .post('/rps/copy', RpsController.copyRps, copyRpsSchema)
  .put('/rps/:id', RpsController.updateRps, updateRpsSchema)
  .post('/rps/:id/topik', RpsController.addTopik, addTopikSchema)
  .put('/rps/topik/:topikId', RpsController.updateTopik, updateTopikSchema)
  .delete('/rps/topik/:topikId', RpsController.deleteTopik, deleteTopikSchema)
  .get('/rencana-evaluasi', RpsController.getRencanaEvaluasi, getRencanaEvaluasiSchema)
  .post('/rencana-evaluasi', RpsController.createRencanaEvaluasi, createRencanaEvaluasiSchema)
  .put('/rencana-evaluasi/:id', RpsController.updateRencanaEvaluasi, updateRencanaEvaluasiSchema)
  .delete('/rencana-evaluasi/:id', RpsController.deleteRencanaEvaluasi, deleteRencanaEvaluasiSchema)
  .get('/rencana-evaluasi/:id/sub-cpmk', RpsController.getEvaluasiSubCpmk, getEvaluasiSubCpmkSchema)
  .post('/rencana-evaluasi/:id/sub-cpmk', RpsController.attachEvaluasiSubCpmk, attachEvaluasiSubCpmkSchema)
  .delete(
    '/rencana-evaluasi/:id/sub-cpmk/:subCpmkId',
    RpsController.detachEvaluasiSubCpmk,
    detachEvaluasiSubCpmkSchema,
  );
