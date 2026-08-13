import { Elysia } from 'elysia';
import { AuditController } from '../controllers/audit.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export const auditRoutes = new Elysia({ prefix: '/audit-logs' })
  .use(authMiddleware)
  .get('/', AuditController.getAll, {
    detail: { tags: ['Audit Logs'], summary: 'Mendapatkan daftar log aktivitas/perubahan sistem (Admin only)' },
  })
  .get('/export', AuditController.exportCsv, {
    detail: { tags: ['Audit Logs'], summary: 'Mengekspor log aktivitas ke CSV (Admin only)' },
  })
  .delete('/purge', AuditController.purge, {
    detail: { tags: ['Audit Logs'], summary: 'Menghapus log lebih lama dari N hari (default 200) (Admin only)' },
  })
  .get('/:id', AuditController.getById, {
    detail: { tags: ['Audit Logs'], summary: 'Mendapatkan detail log aktivitas spesifik (Admin only)' },
  });
