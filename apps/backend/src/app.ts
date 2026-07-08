import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { Elysia } from 'elysia';
import { authMiddleware } from './middlewares/auth.middleware';
import { jwtPlugin } from './plugins/jwt.plugin';
import { angkatanKurikulumRoutes } from './routes/angkatan-kurikulum.routes';
import { authRoutes } from './routes/auth.routes';
import { bapRoutes } from './routes/bap.routes';
import { bimbinganRoutes } from './routes/bimbingan.routes';
import { cpmkRoutes } from './routes/cpmk.routes';
import { cutiRoutes } from './routes/cuti.routes';
import { dosenRoutes } from './routes/dosen.routes';
import { dosenPengajarRoutes } from './routes/dosen-pengajar.routes';
import { e2eRoutes } from './routes/e2e.routes';
import { kelasKuliahRoutes } from './routes/kelas-kuliah.routes';
import { khsRoutes } from './routes/khs.routes';
import { krsRoutes } from './routes/krs.routes';
import { kurikulumRoutes } from './routes/kurikulum.routes';
import { mahasiswaRoutes } from './routes/mahasiswa.routes';
import { mahasiswaKeluarRoutes } from './routes/mahasiswa-keluar.routes';
import { mataKuliahRoutes } from './routes/mata-kuliah.routes';
import { pddiktiRoutes } from './routes/pddikti.routes';
import { pelanggaranRoutes } from './routes/pelanggaran.routes';
import { periodeAkademikRoutes } from './routes/periode-akademik.routes';
import { presensiRoutes } from './routes/presensi.routes';
import { prodiRoutes } from './routes/prodi.routes';
import { rpsRoutes } from './routes/rps.routes';
import { tagihanRoutes } from './routes/tagihan.routes';
import { userRoutes } from './routes/user.routes';
import { yudisiumRoutes } from './routes/yudisium.routes';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const app = new Elysia();

if (isDevelopment) {
  app.use(
    swagger({
      documentation: {
        info: {
          title: 'SIMAK Vokasi API Documentation',
          version: '1.0.0',
          description: 'REST API untuk Sistem Informasi Akademik Vokasi',
        },
      },
    }),
  );
}

app
  .use(
    cors({
      origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
        : ['http://localhost:8080', 'http://localhost:3000'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  )
  .onError(({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 422;
      return { success: false, error: 'Validasi gagal', message: error.message };
    }
    const err = (error as any)?.cause || error as any;
    if (err && err.code === '23505') {
      set.status = 409;
      return { success: false, error: 'Data duplikat terdeteksi. Kunci unik sudah digunakan.' };
    }
    if (err && err.code === '23503') {
      console.error('FOREIGN KEY CONSTRAINT FAILURE:', err);
      set.status = 400;
      return { success: false, error: 'Relasi tidak valid. Referensi ID tidak ditemukan.' };
    }
    if (code === 'NOT_FOUND') {
      set.status = 404;
      return { success: false, error: 'Endpoint tidak ditemukan' };
    }
    // Default fallback
    console.error(error);
    set.status = 500;
    return { success: false, error: 'Terjadi kesalahan internal server' };
  })
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .use(jwtPlugin)
  .ws('/bimbingan/ws/:bimbinganId', {
    async open(ws) {
      const token = ws.data.query?.token;
      if (!token) {
        ws.send(JSON.stringify({ error: 'Unauthorized: Missing token' }));
        ws.close();
        return;
      }
      const payload = await ws.data.jwt.verify(token);
      if (!payload) {
        ws.send(JSON.stringify({ error: 'Unauthorized: Invalid token' }));
        ws.close();
        return;
      }

      const bimbinganId = Number(ws.data.params.bimbinganId);
      if (!bimbinganId) {
        ws.send(JSON.stringify({ error: 'Invalid bimbingan ID' }));
        ws.close();
        return;
      }

      const { bimbingan: bimbinganTable } = await import('./models/schema');
      const { db } = await import('./utils/db');
      const { eq } = await import('drizzle-orm');
      const { mahasiswa, dosen } = await import('./models/schema');

      const bimbingan = await db.query.bimbingan.findFirst({
        where: eq(bimbinganTable.id, bimbinganId),
        with: { mahasiswa: true, dosenPa: true },
      });

      if (!bimbingan) {
        ws.send(JSON.stringify({ error: 'Bimbingan not found' }));
        ws.close();
        return;
      }

      const userRole = payload.role as string;
      const userEmail = payload.email as string;
      const isAdmin = userRole === 'admin';
      const isDosenPa = userRole === 'dosen' && bimbingan.dosenPa?.email === userEmail;
      const isMahasiswa = userRole === 'mahasiswa' && bimbingan.mahasiswa?.email === userEmail;

      if (!isAdmin && !isDosenPa && !isMahasiswa) {
        ws.send(JSON.stringify({ error: 'Forbidden: You are not a participant of this bimbingan' }));
        ws.close();
        return;
      }

      ws.subscribe(`bimbingan-${bimbinganId}`);
    },
  })
  .use(authMiddleware)
  .use(authRoutes)
  .use(angkatanKurikulumRoutes)
  .use(prodiRoutes)
  .use(mahasiswaRoutes)
  .use(dosenRoutes)
  .use(periodeAkademikRoutes)
  .use(mataKuliahRoutes)
  .use(kelasKuliahRoutes)
  .use(krsRoutes)
  .use(tagihanRoutes)
  .use(dosenPengajarRoutes)
  .use(cpmkRoutes)
  .use(bapRoutes)
  .use(presensiRoutes)
  .use(bimbinganRoutes)
  .use(pelanggaranRoutes)
  .use(khsRoutes)
  .use(yudisiumRoutes)
  .use(pddiktiRoutes)
  .use(e2eRoutes)
  .use(userRoutes)
  .use(kurikulumRoutes)
  .use(rpsRoutes)
  .use(cutiRoutes)
  .use(mahasiswaKeluarRoutes);
