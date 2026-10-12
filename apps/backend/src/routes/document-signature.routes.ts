import { Elysia } from 'elysia';
import { DocumentSignatureController } from '../controllers/document-signature.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  bulkSignKhsSchema,
  getSignatureByRefSchema,
  listKhsSignStatusSchema,
  revokeSignatureSchema,
  signKhsSchema,
  verifySignaturePostSchema,
} from '../schemas/document-signature.schema';

// Publik — TANPA authMiddleware dan dikecualikan dari pemeriksaan sesi via
// isPublicNoSessionPath (harus didaftarkan di PUBLIC_NO_SESSION_PATHS di app.ts).
// Antibot Turnstile divalidasi di controller; GET publik lama dihapus agar
// verifikasi tidak dapat dipanggil mesin tanpa token.
export const documentSignaturePublicRoutes = new Elysia({ prefix: '/document-signatures' }).post(
  '/verify',
  DocumentSignatureController.verify,
  verifySignaturePostSchema,
);

export const documentSignatureRoutes = new Elysia({ prefix: '/document-signatures' })
  .use(authMiddleware)
  .get('/khs/sign-status', DocumentSignatureController.listSignStatus, listKhsSignStatusSchema)
  .post('/khs/bulk-sign', DocumentSignatureController.signKhsBulk, bulkSignKhsSchema)
  .post('/khs/:mhsId/:periodeId/sign', DocumentSignatureController.signKhs, signKhsSchema)
  .get('/khs/:mhsId/:periodeId', DocumentSignatureController.getByRef, getSignatureByRefSchema)
  .post('/:uuid/revoke', DocumentSignatureController.revoke, revokeSignatureSchema);
