import { mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { Elysia } from 'elysia';
import { authMiddleware } from './middlewares/auth.middleware';
import { auditAfterResponse, auditBeforeHandle } from './plugins/audit.plugin';
import { jwtPlugin } from './plugins/jwt.plugin';
import { admisiRoutes } from './routes/admisi.routes';
import { admisiAdminRoutes } from './routes/admisi-admin.routes';
import { angkatanKurikulumRoutes } from './routes/angkatan-kurikulum.routes';
import { apelRoutes } from './routes/apel.routes';
import { auditRoutes } from './routes/audit.routes';
import { authRoutes } from './routes/auth.routes';
import { bahanKajianRoutes } from './routes/bahan-kajian.routes';
import { bahanKajianCplMappingRoutes } from './routes/bahan-kajian-cpl-mapping.routes';
import { bapRoutes } from './routes/bap.routes';
import { bimbinganRoutes } from './routes/bimbingan.routes';
import { capaianCplRoutes } from './routes/capaian-cpl.routes';
import { capaianCpmkRoutes } from './routes/capaian-cpmk.routes';
import { cplRoutes } from './routes/cpl.routes';
import { cplMappingRoutes } from './routes/cpl-mapping.routes';
import { cplMataKuliahRoutes } from './routes/cpl-mata-kuliah.routes';
import { cpmkRoutes } from './routes/cpmk.routes';
import { cpmkCplMappingRoutes } from './routes/cpmk-cpl-mapping.routes';
import { cutiRoutes } from './routes/cuti.routes';
import { dosenRoutes } from './routes/dosen.routes';
import { dosenPengajarRoutes } from './routes/dosen-pengajar.routes';
import { e2eRoutes } from './routes/e2e.routes';
import { evaluasiKurikulumRoutes } from './routes/evaluasi-kurikulum.routes';
import { feedbackRoutes } from './routes/feedback.routes';
import { kategoriBimbinganRoutes } from './routes/kategori-bimbingan.routes';
import { kelasKuliahRoutes } from './routes/kelas-kuliah.routes';
import { khsRoutes } from './routes/khs.routes';
import { kompensasiManualRoutes } from './routes/kompensasi-manual.routes';
import { krsRoutes } from './routes/krs.routes';
import { kurikulumRoutes } from './routes/kurikulum.routes';
import { mahasiswaRoutes } from './routes/mahasiswa.routes';
import { mahasiswaKeluarRoutes } from './routes/mahasiswa-keluar.routes';
import { mataKuliahRoutes } from './routes/mata-kuliah.routes';
import { mataKuliahBahanKajianRoutes } from './routes/mata-kuliah-bahan-kajian.routes';
import { nilaiPraktikRoutes } from './routes/nilai-praktik.routes';
import { notificationRoutes } from './routes/notification.routes';
import { obeReportRoutes } from './routes/obe-report.routes';
import { pasalPelanggaranRoutes } from './routes/pasal-pelanggaran.routes';
import { pddiktiRoutes } from './routes/pddikti.routes';
import { pelanggaranRoutes } from './routes/pelanggaran.routes';
import { periodeAkademikRoutes } from './routes/periode-akademik.routes';
import { presensiRoutes } from './routes/presensi.routes';
import { prodiRoutes } from './routes/prodi.routes';
import { prodiScopeRoutes } from './routes/prodi-scope.routes';
import { profilLulusanRoutes } from './routes/profil-lulusan.routes';
import { rbacRoutes } from './routes/rbac.routes';
import { rombelPraktikumPublicRoutes, rombelPraktikumRoutes } from './routes/rombel-praktikum.routes';
import { rpsRoutes } from './routes/rps.routes';
import { settingsRoutes } from './routes/settings.routes';
import { subCpmkRoutes } from './routes/sub-cpmk.routes';
import { systemRoutes } from './routes/system.routes';
import { tagihanRoutes } from './routes/tagihan.routes';
import { userRoutes } from './routes/user.routes';
import { verifikasiUnknownRoutes } from './routes/verifikasi-unknown.routes';
import { visiMisiRoutes } from './routes/visi-misi.routes';
import { yudisiumRoutes } from './routes/yudisium.routes';
import { SystemParameterService } from './services/system-parameter.service';
import { isSessionClaimsValid } from './utils/session-token';

const isDevelopment = process.env.NODE_ENV === 'development';

// Endpoint background (polling/health/public) tidak boleh memperpanjang sesi idle.
// Client dapat meng-opt-out eksplisit lewat header X-Background: 1 untuk endpoint polling lain.
const NO_SLIDE_PATHS = ['/notifications', '/system/version', '/system/health', '/system/changelog'];

function isNoSlideRequest(path: string, headers: Record<string, string | undefined>): boolean {
  if (headers['x-background'] === '1') return true;
  return NO_SLIDE_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

// Endpoint publik yang boleh diakses tanpa sesi valid (login/forgot/reset,
// settings publik, health, enroll publik). Token mati yang dikirim ke sini
// tidak boleh ditolak 401 agar alur publik (mis. login ulang) tetap jalan.
const PUBLIC_NO_SESSION_PATHS = [
  '/auth',
  '/settings/public',
  '/system/version',
  '/system/changelog',
  '/system/health',
  '/health',
  '/rombel/enroll',
  '/rombel-praktikum/public',
];

function isPublicNoSessionPath(path: string): boolean {
  return PUBLIC_NO_SESSION_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

function extractToken(
  headers: Record<string, string | undefined>,
  cookie: { access_token?: { value?: string } } | undefined,
): string | null {
  const authHeader = headers['authorization'];
  const cookieToken = cookie?.access_token?.value;
  return authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : (cookieToken ?? null);
}

// Direktori penyimpanan berkas surat izin/sakit (dibuat aman di awal startup).
mkdirSync(process.env.SURAT_UPLOAD_DIR || 'uploads/surat-izin-sakit', { recursive: true });
// Direktori lampiran bimbingan & dokumen SK prodi.
mkdirSync(join(process.cwd(), 'storage', 'bimbingan-attachments'), { recursive: true });
mkdirSync(join(process.cwd(), 'storage', 'sk-prodi'), { recursive: true });

export const app = new Elysia()
  .use(
    isDevelopment
      ? swagger({
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
              { name: 'Profil Lulusan', description: 'Profil Lulusan Program Studi' },
              { name: 'CPL', description: 'Capaian Pembelajaran Lulusan' },
              { name: 'CPL Mapping', description: 'Pemetaan CPL ke Profil Lulusan' },
              { name: 'SubCPMK', description: 'Sub-Capaian Pembelajaran Mata Kuliah' },
              { name: 'CPMK-CPL Mapping', description: 'Pemetaan CPMK ke CPL' },
              { name: 'Visi Misi Prodi', description: 'Visi Misi Program Studi' },
              { name: 'Bahan Kajian', description: 'Bahan Kajian Program Studi' },
              { name: 'BK-CPL Mapping', description: 'Pemetaan Bahan Kajian ke CPL' },
              { name: 'CPMK', description: 'Capaian Pembelajaran Mata Kuliah' },
              { name: 'RPS', description: 'Rencana Pembelajaran Semester' },
              { name: 'Laporan OBE', description: 'Laporan dan analisis Outcome-Based Education' },
              { name: 'CPL Mata Kuliah', description: 'Pemetaan CPL ke Mata Kuliah (Top-Down)' },
              { name: 'Capaian CPMK', description: 'Capaian CPMK per mahasiswa per kelas' },
              { name: 'Capaian CPL', description: 'Capaian CPL per mahasiswa' },
              { name: 'Evaluasi Kurikulum', description: 'Evaluasi dan rekomendasi perbaikan kurikulum (PPEPP)' },
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
              {
                name: 'Admisi - Calon Mahasiswa',
                description: 'Endpoint untuk calon mahasiswa: registrasi, pendaftaran, upload dokumen, daftar ulang',
              },
              {
                name: 'Admisi - Admin',
                description: 'Endpoint admin: manajemen sesi, verifikasi, penilaian, jadwal, NIM',
              },
              {
                name: 'E2E Testing',
                description:
                  '⚠️ DANGER: Reset database & seed data. **Hanya untuk development/testing.** JANGAN panggil di production. Restricted ke role Admin.',
              },
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
        })
      : new Elysia(),
  )
  .use(
    cors({
      origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
        : ['http://localhost:8080', 'http://localhost:3000'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Background'],
      exposeHeaders: ['X-Refresh-Token'],
    }),
  )
  .onError(({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 422;
      return { success: false, error: 'Validasi gagal', message: error.message };
    }
    // biome-ignore lint/suspicious/noExplicitAny: Elysia error handling requires any for cause inspection
    const err = (error as any)?.cause || (error as any);
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

    const isDbError = checks.database === 'error';
    return {
      status: isDbError ? 'error' : 'ok',
      timestamp: new Date().toISOString(),
      checks,
    };
  })
  .use(jwtPlugin)
  .get('/storage/photos/mahasiswa/:filename', async ({ params, set, headers, cookie, jwt }) => {
    const authHeader = headers['authorization'];
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const cookieToken = (cookie?.access_token?.value as string | undefined) ?? null;
    const token = headerToken || cookieToken;

    if (!token || !(await isSessionClaimsValid(await jwt.verify(token)))) {
      set.status = 401;
      return { error: 'Unauthorized: Silakan login terlebih dahulu' };
    }

    const raw = String(params.filename || '');
    const filename = basename(raw);
    if (filename !== raw || !/\.(jpg|jpeg|png|webp)$/i.test(filename)) {
      set.status = 404;
      return { error: 'Foto tidak ditemukan' };
    }
    const filePath = join(process.cwd(), 'storage', 'photos', 'mahasiswa', filename);
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      set.status = 404;
      return { error: 'Foto tidak ditemukan' };
    }
    set.headers['Content-Type'] = file.type || 'image/jpeg';
    set.headers['Cache-Control'] = 'public, max-age=86400';
    return file;
  })
  .get('/storage/bimbingan-attachments/:filename', async ({ params, set, headers, cookie, jwt }) => {
    const authHeader = headers['authorization'];
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const cookieToken = (cookie?.access_token?.value as string | undefined) ?? null;
    const token = headerToken || cookieToken;

    if (!token || !(await isSessionClaimsValid(await jwt.verify(token)))) {
      set.status = 401;
      return { error: 'Unauthorized: Silakan login terlebih dahulu' };
    }

    const raw = String(params.filename || '');
    const filename = basename(raw);
    if (filename !== raw || !/\.(pdf|jpg|jpeg|png|webp)$/i.test(filename)) {
      set.status = 404;
      return { error: 'Lampiran tidak ditemukan' };
    }
    const file = Bun.file(join(process.cwd(), 'storage', 'bimbingan-attachments', filename));
    if (!(await file.exists())) {
      set.status = 404;
      return { error: 'Lampiran tidak ditemukan' };
    }
    set.headers['Content-Type'] = file.type || 'application/octet-stream';
    set.headers['Cache-Control'] = 'private, max-age=3600';
    return file;
  })
  .get('/storage/sk-prodi/:filename', async ({ params, set, headers, cookie, jwt }) => {
    const authHeader = headers['authorization'];
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const cookieToken = (cookie?.access_token?.value as string | undefined) ?? null;
    const token = headerToken || cookieToken;

    if (!token || !(await isSessionClaimsValid(await jwt.verify(token)))) {
      set.status = 401;
      return { error: 'Unauthorized: Silakan login terlebih dahulu' };
    }

    const raw = String(params.filename || '');
    const filename = basename(raw);
    if (filename !== raw || !/\.(pdf|jpg|jpeg|png|webp)$/i.test(filename)) {
      set.status = 404;
      return { error: 'Dokumen tidak ditemukan' };
    }
    const file = Bun.file(join(process.cwd(), 'storage', 'sk-prodi', filename));
    if (!(await file.exists())) {
      set.status = 404;
      return { error: 'Dokumen tidak ditemukan' };
    }
    set.headers['Content-Type'] = file.type || 'application/octet-stream';
    set.headers['Cache-Control'] = 'private, max-age=3600';
    return file;
  })
  .use(authMiddleware)
  .onBeforeHandle(auditBeforeHandle)
  .onBeforeHandle(async ({ jwt, set, cookie, headers, path }) => {
    // Sesi mati (exp kedaluwarsa / kill-switch SESSION_EPOCH / token tanpa
    // exp atau sessEpoch) yang DIPRESENTASIKAN harus balas 401, bukan 403,
    // agar frontend bisa auto-logout & redirect /login. Endpoint publik tetap
    // boleh diakses (mis. login ulang). Request tanpa token dibiarkan — controller
    // yang menentukan (publik atau 403).
    try {
      if (isPublicNoSessionPath(path)) return;
      const rawToken = extractToken(headers as Record<string, string | undefined>, cookie);
      if (typeof rawToken !== 'string') return;
      const payload = await jwt.verify(rawToken);
      if (!(await isSessionClaimsValid(payload))) {
        set.status = 401;
        return { error: 'Sesi Anda tidak valid atau telah berakhir. Silakan login kembali.' };
      }
    } catch {
      set.status = 401;
      return { error: 'Sesi Anda tidak valid atau telah berakhir. Silakan login kembali.' };
    }
  })
  .onAfterResponse(auditAfterResponse)
  .onAfterHandle(async ({ jwt, set, cookie, headers, path }) => {
    try {
      // Sliding idle session: perpanjang JWT saat sisa umur token < 50% durasi sesi.
      // Request background/polling dikecualikan agar tidak memperpanjang sesi idle.
      if (isNoSlideRequest(path, headers as Record<string, string | undefined>)) return;
      const rawToken = extractToken(headers as Record<string, string | undefined>, cookie);
      if (typeof rawToken !== 'string') return;
      const payload = (await jwt.verify(rawToken)) as (Record<string, unknown> & { exp?: number }) | null;
      if (!payload || !(await isSessionClaimsValid(payload))) return;
      const exp = payload.exp;
      if (typeof exp !== 'number') return;
      const nowSec = Math.floor(Date.now() / 1000);
      if (exp <= nowSec) return;
      const durationSec = await SystemParameterService.getSessionDurationSeconds();
      if (exp - nowSec >= durationSec / 2) return;
      const { iat: _iat, exp: _exp, ...claims } = payload;
      const refreshed = await jwt.sign({ ...claims, iat: true, exp: nowSec + durationSec });
      set.headers['X-Refresh-Token'] = refreshed;
      if (cookie?.access_token) {
        cookie.access_token.set({
          value: refreshed,
          httpOnly: true,
          secure: process.env.NODE_ENV !== 'development',
          path: '/',
          sameSite: 'strict',
          maxAge: durationSec,
        });
      }
    } catch {
      // Token lama tetap berlaku sampai exp-nya; refresh gagal tidak menggagalkan request.
    }
  })
  .use(authRoutes)
  .use(admisiRoutes)
  .use(apelRoutes)
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
  .use(profilLulusanRoutes)
  .use(cplRoutes)
  .use(cplMappingRoutes)
  .use(subCpmkRoutes)
  .use(cpmkCplMappingRoutes)
  .use(visiMisiRoutes)
  .use(bahanKajianRoutes)
  .use(bahanKajianCplMappingRoutes)
  .use(mataKuliahBahanKajianRoutes)
  .use(cpmkRoutes)
  .use(bapRoutes)
  .use(obeReportRoutes)
  .use(cplMataKuliahRoutes)
  .use(capaianCpmkRoutes)
  .use(capaianCplRoutes)
  .use(evaluasiKurikulumRoutes)
  .use(presensiRoutes)
  .use(kompensasiManualRoutes)
  .use(verifikasiUnknownRoutes)
  .use(nilaiPraktikRoutes)
  .use(bimbinganRoutes)
  .use(kategoriBimbinganRoutes)
  .use(settingsRoutes)
  .use(pasalPelanggaranRoutes)
  .use(pelanggaranRoutes)
  .use(khsRoutes)
  .use(yudisiumRoutes)
  .use(pddiktiRoutes)
  .use(e2eRoutes)
  .use(userRoutes)
  .use(notificationRoutes)
  .use(kurikulumRoutes)
  .use(rpsRoutes)
  .use(cutiRoutes)
  .use(feedbackRoutes)
  .use(systemRoutes)
  .use(rbacRoutes)
  .use(prodiScopeRoutes)
  .use(rombelPraktikumPublicRoutes)
  .use(rombelPraktikumRoutes)
  .use(mahasiswaKeluarRoutes)
  .use(auditRoutes);

export type App = typeof app;
