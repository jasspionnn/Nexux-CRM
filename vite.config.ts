import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    base: '/',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      emptyOutDir: true,
    },
    define: {
      // opcional: se você REALMENTE precisa injetar algo global
      __API_KEY__: JSON.stringify(env.VITE_API_KEY || '')
    },
    server: {
      port: 3000,
    }
  };
});
