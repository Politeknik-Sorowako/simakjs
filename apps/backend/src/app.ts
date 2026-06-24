import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';
import { jwtPlugin } from './plugins/jwt.plugin';
import { authMiddleware } from './middlewares/auth.middleware';
import { authRoutes } from './routes/auth.routes';
import { prodiRoutes } from './routes/prodi.routes';
import { mahasiswaRoutes } from './routes/mahasiswa.routes';

export const app = new Elysia()
  .use(
    swagger({
      documentation: {
        info: {
          title: 'SIMAK Vokasi API Documentation',
          version: '1.0.0',
          description: 'REST API untuk Sistem Informasi Akademik Vokasi',
        },
      },
    })
  )
  .use(
    cors({
      origin: '*',
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  )
  .use(jwtPlugin)
  .use(authMiddleware)
  .use(authRoutes)
  .use(prodiRoutes)
  .use(mahasiswaRoutes);
