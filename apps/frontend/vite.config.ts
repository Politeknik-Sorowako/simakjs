import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
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
      usePolling: true,
    },
    hmr: {
      clientPort: 8080,
    },
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
