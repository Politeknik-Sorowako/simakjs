import { Elysia } from 'elysia';
import { AuditController } from '../controllers/audit.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export const auditRoutes = new Elysia({ prefix: '/audit-logs' })
  .use(authMiddleware)
  .get('/', AuditController.getAll, {
    detail: { tags: ['Audit Logs'], summary: 'Mendapatkan daftar log aktivitas/perubahan sistem (Admin only)' },
  })
  .get('/:id', AuditController.getById, {
    detail: { tags: ['Audit Logs'], summary: 'Mendapatkan detail log aktivitas spesifik (Admin only)' },
  });
