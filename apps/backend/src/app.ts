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
      origin: process.env.CORS_ORIGIN || '*',
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  )
  .onError(({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 422;
      return { error: 'Validasi gagal', message: error.message };
    }
    const err = error as any;
    if (err && err.code === '23505') {
      set.status = 409;
      return { error: 'Data duplikat terdeteksi. Kunci unik sudah digunakan.' };
    }
    if (err && err.code === '23503') {
      set.status = 400;
      return { error: 'Relasi tidak valid. Referensi ID tidak ditemukan.' };
    }
    // Default fallback
    console.error(error);
    set.status = 500;
    return { error: 'Terjadi kesalahan internal server' };
  })
  .use(jwtPlugin)
  .use(authMiddleware)
  .use(authRoutes)
  .use(prodiRoutes)
  .use(mahasiswaRoutes);

