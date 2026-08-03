import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import solidPlugin from 'vite-plugin-solid';

const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  plugins: [
    solidPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'SIMAK Vokasi - Politeknik Sorowako',
        short_name: 'SIMAK Vokasi',
        description: 'Sistem Informasi Akademik Politeknik Sorowako',
        theme_color: '#0284c7',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
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
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
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
