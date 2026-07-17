import { Elysia } from 'elysia';
import { ObeReportController } from '../controllers/obe-report.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  getBkMkCoverageSchema,
  getCplAchievementSchema,
  getCplCpmkCoverageSchema,
  getCpmkAchievementSchema,
  getEvaluasiRekapSchema,
  getObeSummarySchema,
} from '../schemas/obe-report.schema';

export const obeReportRoutes = new Elysia({ prefix: '/laporan-obe' })
  .use(authMiddleware)
  .get('/summary', ObeReportController.getObeSummary, getObeSummarySchema)
  .get('/cpl-cpmk-coverage', ObeReportController.getCplCpmkCoverage, getCplCpmkCoverageSchema)
  .get('/bk-mk-coverage', ObeReportController.getBkMkCoverage, getBkMkCoverageSchema)
  .get('/cpmk-achievement/:kelasKuliahId', ObeReportController.getCpmkAchievement, getCpmkAchievementSchema)
  .get('/cpl-achievement', ObeReportController.getCplAchievement, getCplAchievementSchema)
  .get('/evaluasi-rekap/:kurikulumId', ObeReportController.getEvaluasiRekap, getEvaluasiRekapSchema);
