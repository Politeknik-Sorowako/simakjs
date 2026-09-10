import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import solidPlugin from 'vite-plugin-solid';

const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  plugins: [
    solidPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'version.json'],
      manifest: {
        id: '/',
        name: 'SIMAK Vokasi - Politeknik Sorowako',
        short_name: 'SIMAK Vokasi',
        description: 'Sistem Informasi Akademik Politeknik Sorowako',
        theme_color: '#0284c7',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'id-ID',
        categories: ['education', 'productivity'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api/, /^\/docs/, /^\/swagger/],
        cleanupOutdatedCaches: true,
        globPatterns: [
          '**/*.{html,css,ico,png,svg,webmanifest}',
          'assets/index*.js',
          'assets/purify*.js',
          'assets/workbox*.js',
          'assets/MainLayout-*.js',
          'assets/*Controller-*.js',
          'assets/format-*.js',
          'assets/usePagination-*.js',
          'assets/Badge-*.js',
          'assets/Card-*.js',
          'assets/Modal-*.js',
          'assets/Table-*.js',
          'assets/SearchableSelect-*.js',
          'assets/StatCard-*.js',
          'assets/StudentAvatar-*.js',
          'assets/SortableHeader-*.js',
          'assets/VerifiedBadge-*.js',
          'assets/PieChart-*.js',
          'assets/Dashboard-*.js',
          'assets/charts-*.js',
          'assets/Profil-*.js',
          'assets/PresensiMahasiswa-*.js',
          'assets/Krs-*.js',
          'assets/Khs-*.js',
          'assets/Rps-*.js',
          'assets/BapPresensi-*.js',
          'assets/Apel*.js',
          'assets/DuplicateRiskKompensasi-*.js',
        ],
        globIgnores: [
          '**/pdf-*.js',
          '**/xlsx-*.js',
          '**/html2canvas*.js',
          '**/Admisi*.js',
          '**/Laporan*.js',
          '**/Audit*.js',
          '**/Pengguna*.js',
          '**/Evaluasi*.js',
          '**/Manajemen*.js',
          '**/Cuti*.js',
          '**/Mahasiswa*.js',
          '**/Dosen*.js',
          '**/Kurikulum*.js',
          '**/KelasKuliah*.js',
          '**/MataKuliah*.js',
          '**/PeriodeAkademik*.js',
          '**/ProgramStudi*.js',
          '**/VisiMisi*.js',
          '**/BahanKajian*.js',
          '**/Cpl*.js',
          '**/Cpmk*.js',
          '**/PetaObe*.js',
          '**/BobotPenilaian*.js',
          '**/Pelanggaran*.js',
          '**/AdminPasal*.js',
          '**/InputNilai*.js',
          '**/Yudisium*.js',
          '**/Pddikti*.js',
          '**/Konfigurasi*.js',
          '**/KeuanganDashboard*.js',
          '**/Bimbingan*.js',
          '**/MonitoringBimbingan*.js',
          '**/PresensiUnknown*.js',
          '**/ImportCsvModal*.js',
        ],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ request, url }) =>
              (request.destination === 'script' || request.destination === 'style') && !url.pathname.startsWith('/api/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'dynamic-scripts-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image' || request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3001,
    host: true,
    allowedHosts: [
      'simak.politekniksorowako.ac.id',
      '.politekniksorowako.ac.id',
      'localhost',
      '127.0.0.1',
    ],
    watch: {
      usePolling: !isProd,
    },
    hmr: isProd ? false : { clientPort: 8080 },
  },
  preview: {
    port: 3001,
    host: true,
    allowedHosts: [
      'simak.politekniksorowako.ac.id',
      '.politekniksorowako.ac.id',
      'localhost',
      '127.0.0.1',
    ],
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          xlsx: ['xlsx'],
          pdf: ['jspdf', 'jspdf-autotable'],
          charts: ['chart.js'],
        },
      },
    },
  },
});
