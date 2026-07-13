import { Elysia } from 'elysia';
import { ObeReportController } from '../controllers/obe-report.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { getBkMkCoverageSchema, getCplCpmkCoverageSchema, getObeSummarySchema } from '../schemas/obe-report.schema';

export const obeReportRoutes = new Elysia({ prefix: '/laporan-obe' })
  .use(authMiddleware)
  .get('/summary', ObeReportController.getObeSummary, getObeSummarySchema)
  .get('/cpl-cpmk-coverage', ObeReportController.getCplCpmkCoverage, getCplCpmkCoverageSchema)
  .get('/bk-mk-coverage', ObeReportController.getBkMkCoverage, getBkMkCoverageSchema);
