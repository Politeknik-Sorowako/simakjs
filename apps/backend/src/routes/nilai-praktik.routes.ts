import { Elysia } from 'elysia';
import { NilaiPraktikController } from '../controllers/nilai-praktik.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { getNilaiPraktikByRombelSchema, saveNilaiPraktikSchema } from '../schemas/nilai-praktik.schema';

export const nilaiPraktikRoutes = new Elysia({ prefix: '/nilai-praktik' })
  .use(authMiddleware)
  .get('/rombel/:rombelPraktikumId', NilaiPraktikController.getNilaiByRombel, getNilaiPraktikByRombelSchema)
  .post('/bulk', NilaiPraktikController.saveNilaiBulk, saveNilaiPraktikSchema);
