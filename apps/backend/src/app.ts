import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { Elysia } from 'elysia';
import { authMiddleware } from './middlewares/auth.middleware';
import { jwtPlugin } from './plugins/jwt.plugin';
import { admisiAdminRoutes } from './routes/admisi-admin.routes';
import { admisiRoutes } from './routes/admisi.routes';
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
          title: 'SIMAK Vokasi API',
          version: '1.0.0',
          description:
            'REST API Sistem Informasi Akademik Vokasi. Semua endpoint (kecuali /auth/*) memerlukan token JWT via header Authorization: Bearer <token> atau cookie access_token.',
        },
        tags: [
          { name: 'Autentikasi', description: 'Registrasi, login, dan manajemen password' },
          { name: 'Pengguna', description: 'Manajemen pengguna sistem' },
          { name: 'Program Studi', description: 'Manajemen data program studi' },
          { name: 'Dosen', description: 'Manajemen data dosen' },
          { name: 'Mahasiswa', description: 'Manajemen data mahasiswa' },
          { name: 'Mahasiswa Keluar', description: 'Pencatatan mahasiswa keluar/DO/pindah' },
          { name: 'Periode Akademik', description: 'Manajemen periode akademik' },
          { name: 'Mata Kuliah', description: 'Manajemen data mata kuliah' },
          { name: 'Kelas Kuliah', description: 'Manajemen kelas kuliah per periode' },
          { name: 'Dosen Pengajar Kelas', description: 'Plotting dosen ke kelas kuliah' },
          { name: 'Kurikulum', description: 'Manajemen kurikulum dan mata kuliah kurikulum' },
          { name: 'Angkatan Kurikulum', description: 'Binding angkatan ke kurikulum' },
          { name: 'CPMK', description: 'Capaian Pembelajaran Mata Kuliah' },
          { name: 'RPS', description: 'Rencana Pembelajaran Semester' },
          { name: 'Rencana Evaluasi', description: 'Rencana evaluasi/penilaian mata kuliah' },
          { name: 'BAP', description: 'Berita Acara Perkuliahan' },
          { name: 'Presensi', description: 'Presensi kehadiran mahasiswa' },
          { name: 'Kompensasi', description: 'Kompensasi keterlambatan/mangkir mahasiswa' },
          { name: 'KRS', description: 'Kontrak Rencana Studi' },
          { name: 'KHS & Transkrip', description: 'Kartu Hasil Studi dan transkrip nilai' },
          { name: 'Bimbingan', description: 'Bimbingan akademik dosen PA dan mahasiswa' },
          { name: 'Kedisiplinan', description: 'Pencatatan pelanggaran kedisiplinan' },
          { name: 'Cuti', description: 'Pengajuan dan manajemen cuti akademik' },
          { name: 'Tagihan', description: 'Tagihan SPP dan pembayaran' },
          { name: 'Yudisium & Komponen Nilai', description: 'Pengajuan yudisium dan input nilai akhir' },
          { name: 'PDDIKTI', description: 'Sinkronisasi data ke PDDIKTI' },
          { name: 'Admisi - Calon Mahasiswa', description: 'Endpoint untuk calon mahasiswa: registrasi, pendaftaran, upload dokumen, daftar ulang' },
          { name: 'Admisi - Admin', description: 'Endpoint admin: manajemen sesi, verifikasi, penilaian, jadwal, NIM' },
          { name: 'E2E Testing', description: '⚠️ DANGER: Reset database & seed data. **Hanya untuk development/testing.** JANGAN panggil di production. Restricted ke role Admin.' },
          { name: 'Health Check', description: 'Monitoring kesehatan server' },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
        security: [{ bearerAuth: [] }],
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
  .get('/health', async () => {
    const checks: Record<string, string> = {};

    try {
      if (process.env.CHECK_DB_ON_HEALTH === 'true') {
        const { db } = await import('./utils/db');
        const { sql } = await import('drizzle-orm');
        await db.execute(sql`SELECT 1`);
        checks.database = 'ok';
      }
    } catch {
      checks.database = 'error';
    }

    const memUsage = process.memoryUsage();
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    checks.memory = memPercent < 98 ? 'ok' : 'warning';

    const allOk = Object.values(checks).every((c) => c === 'ok');
    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    };
  })
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
  .use(admisiRoutes)
  .use(admisiAdminRoutes)
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
