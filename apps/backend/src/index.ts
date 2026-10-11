import { app } from './app';
import { getSigningKeyConfig } from './utils/document-signing';

export { app };

const PORT = Number(process.env.PORT) || 3000;

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
});

if (process.env.NODE_ENV !== 'test') {
  // TTE (QR Signed-Hash): gagal cepat bila kunci signing tidak diset/invalid —
  // tanpa kunci, endpoint tanda tangan dokumen error 400 secara diam-diam.
  // Dilewati pada NODE_ENV=test agar suite test tidak membutuhkan kunci.
  try {
    getSigningKeyConfig();
  } catch (e: unknown) {
    console.error('[FATAL] TTE signing keys invalid:', e instanceof Error ? e.message : 'Unknown error');
    process.exit(1);
  }

  const server = app.listen(PORT);
  console.log(`Server is running at http://localhost:${PORT}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Swagger API documentation is available at http://localhost:${PORT}/swagger`);
  }

  const shutdown = (signal: string) => {
    console.log(`\n[${signal}] Shutting down gracefully...`);
    server.stop(true);
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
