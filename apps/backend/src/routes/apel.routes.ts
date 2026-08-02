import { Elysia } from 'elysia';
import { ApelController } from '../controllers/apel.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  bukaKembaliSesiSchema,
  bukaSesiSchema,
  createKelompokSchema,
  deleteKelompokSchema,
  deleteSesiSchema,
  getKelompokDetailSchema,
  getKelompokSchema,
  getMonitorSchema,
  getPresensiUnknownSchema,
  getRekapApelSchema,
  getSesiAktifSchema,
  getSesiByKelompokSchema,
  getSesiPresensiSchema,
  manageAnggotaSchema,
  removeAnggotaSchema,
  submitPresensiSchema,
  tutupSesiSchema,
  updateKelompokSchema,
  verifyPresensiSchema,
} from '../schemas/apel.schema';

export const apelRoutes = new Elysia({ prefix: '/apel' })
  .use(authMiddleware)
  // Kelompok management
  .post('/kelompok', ApelController.createKelompok, createKelompokSchema)
  .put('/kelompok/:id', ApelController.updateKelompok, updateKelompokSchema)
  .delete('/kelompok/:id', ApelController.deleteKelompok, deleteKelompokSchema)
  .get('/kelompok', ApelController.getKelompokByProdi, getKelompokSchema)
  .get('/kelompok/:id', ApelController.getKelompokDetail, getKelompokDetailSchema)
  .post('/kelompok/:id/anggota', ApelController.manageAnggota, manageAnggotaSchema)
  .delete('/kelompok/:id/anggota/:mhsId', ApelController.removeAnggota, removeAnggotaSchema)
  // Sesi management
  .post('/sesi/buka', ApelController.bukaSesi, bukaSesiSchema)
  .post('/sesi/:id/presensi', ApelController.submitPresensi, submitPresensiSchema)
  .get('/sesi/:id/presensi', ApelController.getSesiPresensi, getSesiPresensiSchema)
  .get('/sesi/kelompok/:kelompokId', ApelController.getSesiByKelompok, getSesiByKelompokSchema)
  .post('/sesi/:id/tutup', ApelController.tutupSesi, tutupSesiSchema)
  .post('/sesi/:id/buka-kembali', ApelController.bukaKembaliSesi, bukaKembaliSesiSchema)
  .delete('/sesi/:id', ApelController.deleteSesi, deleteSesiSchema)
  .get('/sesi/aktif', ApelController.getSesiAktif, getSesiAktifSchema)
  // Monitoring & verifikasi
  .get('/monitor', ApelController.getMonitorRealtime, getMonitorSchema)
  .get('/verifikasi/unknown', ApelController.getPresensiUnknown, getPresensiUnknownSchema)
  .put('/verifikasi/:id', ApelController.verifyPresensi, verifyPresensiSchema)
  // Rekap
  .get('/rekap/:kelompokId', ApelController.getRekapApel, getRekapApelSchema);
