import { Elysia } from 'elysia';
import { DocumentSignatureController } from '../controllers/document-signature.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  getSignatureByRefSchema,
  revokeSignatureSchema,
  signKhsSchema,
  verifySignatureSchema,
} from '../schemas/document-signature.schema';

// Publik — TANPA authMiddleware dan dikecualikan dari pemeriksaan sesi via
// isPublicNoSessionPath (harus didaftarkan di PUBLIC_NO_SESSION_PATHS di app.ts).
export const documentSignaturePublicRoutes = new Elysia({ prefix: '/document-signatures' }).get(
  '/verify/:uuid',
  DocumentSignatureController.verify,
  verifySignatureSchema,
);

export const documentSignatureRoutes = new Elysia({ prefix: '/document-signatures' })
  .use(authMiddleware)
  .post('/khs/:mhsId/:periodeId/sign', DocumentSignatureController.signKhs, signKhsSchema)
  .get('/khs/:mhsId/:periodeId', DocumentSignatureController.getByRef, getSignatureByRefSchema)
  .post('/:uuid/revoke', DocumentSignatureController.revoke, revokeSignatureSchema);
