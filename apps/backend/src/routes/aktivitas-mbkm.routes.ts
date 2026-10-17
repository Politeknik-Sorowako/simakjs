import { Elysia } from 'elysia';
import { AktivitasMbkmController } from '../controllers/aktivitas-mbkm.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  addAnggotaSchema,
  addKonversiSchema,
  addPembimbingSchema,
  aktivitasIdSchema,
  createAktivitasSchema,
  getAktivitasByIdSchema,
  getAktivitasSchema,
  getJenisAktivitasSchema,
  removeAnggotaSchema,
  removeKonversiSchema,
  removePembimbingSchema,
  updateAktivitasSchema,
} from '../schemas/aktivitas-mbkm.schema';

export const aktivitasMbkmRoutes = new Elysia({ prefix: '/aktivitas-mbkm' })
  .use(authMiddleware)
  .get('/jenis', AktivitasMbkmController.getJenis, getJenisAktivitasSchema)
  .get('/', AktivitasMbkmController.getAll, getAktivitasSchema)
  .get('/:id', AktivitasMbkmController.getById, getAktivitasByIdSchema)
  .post('/', AktivitasMbkmController.create, createAktivitasSchema)
  .put('/:id', AktivitasMbkmController.update, updateAktivitasSchema)
  .delete('/:id', AktivitasMbkmController.remove, aktivitasIdSchema)
  .post('/:id/anggota', AktivitasMbkmController.addAnggota, addAnggotaSchema)
  .delete('/:id/anggota/:anggotaId', AktivitasMbkmController.removeAnggota, removeAnggotaSchema)
  .post('/:id/pembimbing', AktivitasMbkmController.addPembimbing, addPembimbingSchema)
  .delete('/:id/pembimbing/:pembimbingId', AktivitasMbkmController.removePembimbing, removePembimbingSchema)
  .post('/:id/konversi', AktivitasMbkmController.addKonversi, addKonversiSchema)
  .delete('/:id/konversi/:konversiId', AktivitasMbkmController.removeKonversi, removeKonversiSchema)
  .post('/:id/ajukan', AktivitasMbkmController.ajukan, aktivitasIdSchema)
  .post('/:id/setujui', AktivitasMbkmController.setujui, aktivitasIdSchema)
  .post('/:id/tolak', AktivitasMbkmController.tolak, aktivitasIdSchema)
  .post('/:id/selesai', AktivitasMbkmController.setSelesai, aktivitasIdSchema);
