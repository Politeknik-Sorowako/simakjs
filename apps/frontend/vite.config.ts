import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    port: 3001,
    host: true,
    watch: {
      usePolling: true,
    },
    hmr: {
      clientPort: 8080,
    },
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
