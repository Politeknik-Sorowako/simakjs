import { Elysia } from 'elysia';
import { TugasAkhirController } from '../controllers/tugas-akhir.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  accRevisiSchema,
  accSidangSchema,
  createLogbookSchema,
  createRubrikKriteriaSchema,
  createTugasAkhirSchema,
  daftarSidangSchema,
  deleteLogbookSchema,
  deleteRubrikKriteriaSchema,
  finalisasiSidangSchema,
  getRubrikKriteriaProdiSchema,
  getTugasAkhirSchema,
  inputNilaiSidangSchema,
  jadwalSidangSchema,
  overrideStatusSchema,
  rekapKolektifSidangSchema,
  responUndanganSchema,
  reviewLogbookSchema,
  reviewTopikSchema,
  salinTemplateRubrikSchema,
  sidangIdSchema,
  submitRevisiSidangSchema,
  tugasAkhirIdSchema,
  updateLogbookSchema,
  updateRubrikKriteriaSchema,
  updateTugasAkhirSchema,
} from '../schemas/tugas-akhir.schema';

export const tugasAkhirRoutes = new Elysia({ prefix: '/tugas-akhir' })
  .use(authMiddleware)
  .get('/', TugasAkhirController.getAll, getTugasAkhirSchema)
  .get('/sidang/rekap-kolektif', TugasAkhirController.getRekapKolektifSidang, rekapKolektifSidangSchema)
  // Backlog 3: Manajemen Rubrik Kriteria per Program Studi
  .get('/rubrik-kriteria', TugasAkhirController.getRubrikKriteriaByProdi, getRubrikKriteriaProdiSchema)
  .post('/rubrik-kriteria', TugasAkhirController.createRubrikKriteria, createRubrikKriteriaSchema)
  .post('/rubrik-kriteria/salin-template', TugasAkhirController.salinTemplateRubrik, salinTemplateRubrikSchema)
  .put('/rubrik-kriteria/:rubrikId', TugasAkhirController.updateRubrikKriteria, updateRubrikKriteriaSchema)
  .delete('/rubrik-kriteria/:rubrikId', TugasAkhirController.deleteRubrikKriteria, deleteRubrikKriteriaSchema)
  .get('/:id', TugasAkhirController.getById, tugasAkhirIdSchema)
  .post('/', TugasAkhirController.create, createTugasAkhirSchema)
  .put('/:id', TugasAkhirController.update, updateTugasAkhirSchema)
  .delete('/:id', TugasAkhirController.delete, tugasAkhirIdSchema)
  .post('/:id/review', TugasAkhirController.reviewTopik, reviewTopikSchema)
  .post('/:id/override-status', TugasAkhirController.overrideStatus, overrideStatusSchema)
  .post('/:id/respon-undangan', TugasAkhirController.responUndangan, responUndanganSchema)
  // Milestone 2: Ruang Bimbingan & Logbook TA
  .get('/:id/logbooks', TugasAkhirController.getLogbooks, tugasAkhirIdSchema)
  .post('/:id/logbooks', TugasAkhirController.createLogbook, createLogbookSchema)
  .put('/:id/logbooks/:logbookId', TugasAkhirController.updateLogbook, updateLogbookSchema)
  .delete('/:id/logbooks/:logbookId', TugasAkhirController.deleteLogbook, deleteLogbookSchema)
  .post('/:id/logbooks/:logbookId/review', TugasAkhirController.reviewLogbook, reviewLogbookSchema)
  .post('/:id/acc-sidang', TugasAkhirController.accSidang, accSidangSchema)
  // Milestone 3: Pendaftaran & Penjadwalan Sidang Proposal
  .get('/:id/sidang', TugasAkhirController.getSidangList, tugasAkhirIdSchema)
  .post('/:id/sidang/daftar', TugasAkhirController.daftarSidang, daftarSidangSchema)
  .post('/:id/sidang/:sidangId/jadwal', TugasAkhirController.jadwalkanSidang, jadwalSidangSchema)
  .get('/:id/sidang/rubrik', TugasAkhirController.getRubrikKriteria, tugasAkhirIdSchema)
  .post('/:id/sidang/:sidangId/nilai', TugasAkhirController.inputNilaiSidang, inputNilaiSidangSchema)
  .post('/:id/sidang/:sidangId/finalisasi', TugasAkhirController.finalisasiSidang, finalisasiSidangSchema)
  // Milestone 4: Rekap Nilai Ekspor & Workflow Revisi Pasca Sidang
  .get('/:id/sidang/:sidangId/rekap-nilai', TugasAkhirController.getRekapNilaiSidang, sidangIdSchema)
  .post('/:id/sidang/:sidangId/revisi', TugasAkhirController.submitRevisiSidang, submitRevisiSidangSchema)
  .post('/:id/sidang/:sidangId/penguji/:pengujiId/acc-revisi', TugasAkhirController.accRevisiPenguji, accRevisiSchema);
