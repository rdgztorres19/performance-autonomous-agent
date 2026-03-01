import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 4200,
    proxy: {
      '/api': 'http://localhost:3057',
      '/socket.io': { target: 'http://localhost:3057', ws: true },
    },
  },
  build: {
    chunkSizeWarningLimit: 3000,
  },
});
