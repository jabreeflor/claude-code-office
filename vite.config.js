import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 3480,
    proxy: {
      '/api': 'http://localhost:3481'
    }
  },
  build: {
    outDir: 'dist'
  }
});
